import { Range, seekEOL } from "./utils";
import {
    TripleBracketContentGroup,
    TripleBracketGroup,
    CommentElem,
    ContentGroup,
    Elem,
    FoldingBracketElem,
    Group,
    HeadingElem,
    HolderElem,
    HolderType,
    HtmlBracketElem,
    ParenthesisElem,
    RawBracketElem,
    SyntaxBracketElem,
    SyntaxLanguageType,
    TextColorBracketElem,
    TextSizeBracketElem,
    TextSizeType,
    WikiBracketElem,
    SquareBracketGroup,
    DoubleSquareBracketGroup,
    SingleSquareBracketGroup,
    HeadingGroup,
    ListGroup,
    IndentGroup,
    FootnoteGroup,
    CommentGroup,
    MathTagGroup,
    DecoCarotGroup,
    DecoUnderbarGroup,
    DecoCommaGroup,
    DecoHyphenGroup,
    DecoTildeGroup,
    DecoTripleQuoteGroup,
    DecoDoubleQuoteGroup,
} from "./elem";
const util = require("node:util");

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    holderArray: HolderElem[] = [];
    groupArray: Group[] = [];
    eolHolderArray: { range: Range; holders: HolderElem[] | null }[] = [];
    headingLevelAt: number[] = [0, 0, 0, 0, 0, 0];

    constructor(wikiText: string) {
        // \n는 regex 방지용
        this.wikiText = "\n" + wikiText + "\n";
    }

    pushGroup(props: { group: Group; elems: HolderElem[] }) {
        props.group.elems.push(...props.elems);
        props.group.elems.sort((a, b) => a.range.start - b.range.start);
        for (const elem of props.elems) {
            elem.group.push(props.group);
        }
        this.groupArray.push(props.group);
    }

    removeGroup(props: { group: Group }) {
        const targetIndex = this.groupArray.findIndex((v) => v.uuid === props.group.uuid);
        for (const elem of this.groupArray[targetIndex].elems) {
            elem.group = elem.group.filter((v) => v.uuid !== props.group.uuid);
        }
        this.groupArray.splice(targetIndex, 1);
    }

    removeFromGroup(props: { group: Group; elems: HolderElem[] }) {
        for (const elem of props.elems) {
            const idx = props.group.elems.findIndex((v) => v.uuid === elem.uuid);
            if (idx !== -1) {
                props.group.elems.splice(idx, 1);
            }
            elem.group = elem.group.filter((v) => v.uuid !== props.group.uuid);
        }
        props.group.elems.sort((a, b) => a.range.start - b.range.start);
    }

    processRedirect() {
        const redirectRegex = /^\n#redirect ([^\n]+)/g;
        const match = redirectRegex.exec(this.wikiText);
        if (match !== null) {
            this.isRedirect = true;
        }
    }

    fillEolHolder() {
        let offset = 0;
        while (true) {
            const result = seekEOL(this.wikiText, offset);
            if (result === -1) {
                break;
            } else {
                this.eolHolderArray.push({ range: new Range(offset, result + 1), holders: null });
                offset = result + 1;
            }
        }
    }

    evaluateHolder(arr: [RegExp, HolderType, number?, number?]) {
        let [regex, type, offsetStart, offsetEnd] = arr;
        offsetStart = offsetStart ?? 0;
        offsetEnd = offsetEnd ?? 0;

        let match;

        while ((match = regex.exec(this.wikiText)) !== null) {
            let target;
            let targetRange = new Range(match.index + offsetStart, regex.lastIndex + offsetEnd);
            for (const eol of this.eolHolderArray) {
                if (targetRange.isContainedIn(eol.range)) {
                    target = new HolderElem(targetRange, eol.range, type);
                    if (eol.holders === null) {
                        eol.holders = [target];
                    } else {
                        eol.holders.push(target);
                    }
                    break;
                }
            }
            this.holderArray.push(target as HolderElem);
        }
    }

    collectHolderElem() {
        type offset = number | undefined;
        type offsetNone = [RegExp, HolderType];
        type offsetOnlyStart = [RegExp, HolderType, offset];
        type offsetBoth = [RegExp, HolderType, offset, offset];
        // linkpipe, tablecell
        const pipe: offsetNone = [/\|/g, "Pipe"];
        const comment: offsetOnlyStart = [/\n##/g, "Comment", 1];
        // linkOpen, macroOpen
        const squareBracketOpen: offsetNone = [/\[/g, "SquareBracketOpen"];
        const footnoteOpen: offsetOnlyStart = [/\[\*/g, "FootnoteOpen", 1];
        // footnoteclose, linkclose, macroclose
        const squareBracketClose: offsetNone = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: offsetNone = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: offsetNone = [/\)/g, "ParenthesisClose"];
        const headingOpen: offsetOnlyStart = [/\n={1,6}(#?) /g, "HeadingOpen", 1];
        const headingClose: offsetBoth = [/ (#?)={1,6}\n/g, "HeadingClose", undefined, -1];
        const tripleBracketOpen: offsetNone = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: offsetNone = [/\}\}\}/g, "TripleBracketClose"];
        const indent: offsetOnlyStart = [/\n( ){1,}/g, "Indent", 1];
        const unorderedList: offsetOnlyStart = [/\n( ){1,}\*/g, "UnorderedList", 1];
        const orderedList: offsetOnlyStart = [/\n( ){1,}(1|a|A|i|I)\.(\#\d)?/g, "OrderedList", 1];
        const cite: offsetOnlyStart = [/\n>{1,}/g, "Cite", 1];
        const tableArgumentOpen: offsetNone = [/\</g, "TableArgumentOpen"];
        const tableArgumentClose: offsetNone = [/\</g, "TableArgumentClose"];
        const mathTagOpen: offsetNone = [/\<math\>/g, "MathTagOpen"];
        const mathTagClose: offsetNone = [/\<\/math\>/g, "MathTagClose"];
        const quote: offsetNone = [/\'/g, "Quote"];
        const underbar: offsetNone = [/\_/g, "Underbar"];
        const tilde: offsetNone = [/\~/g, "Tilde"];
        const carot: offsetNone = [/\^/g, "Carot"];
        const comma: offsetNone = [/\,/g, "Comma"];
        const hyphen: offsetNone = [/\-/g, "Hyphen"];
        const escape: offsetNone = [/\\/g, "Escape"];
        const newline: offsetNone = [/[\n]/g, "Newline"];

        const evaluators = [
            pipe,
            comment,
            squareBracketOpen,
            footnoteOpen,
            squareBracketClose,
            macroArgumentOpen,
            macroArgumentClose,
            headingOpen,
            headingClose,
            tripleBracketOpen,
            tripleBracketClose,
            indent,
            unorderedList,
            orderedList,
            cite,
            tableArgumentOpen,
            tableArgumentClose,
            mathTagOpen,
            mathTagClose,
            quote,
            underbar,
            tilde,
            carot,
            comma,
            hyphen,
            escape,
            newline,
        ];

        for (const evaluator of evaluators) {
            this.evaluateHolder(evaluator);
        }

        this.holderArray.sort((a, b) => a.range.start - b.range.start);
    }

    doParsing() {
        const tripleBracketQueue: HolderElem[] = [];
        let squareBracketArray: { value: HolderElem[]; max: number }[] = [];
        let headingOpenElement: HolderElem | undefined = undefined;
        let mathOpenElement: HolderElem | undefined = undefined;
        const footnoteQueue: [HolderElem, HolderElem][] = [];
        const decoArray: { [k in "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma"]: HolderElem[] } = {
            Quote: [],
            Underbar: [],
            Hyphen: [],
            Tilde: [],
            Carot: [],
            Comma: []
        };
        let decoCommaArray: HolderElem[][] = [];

        interface ProcessorProps {
            idx: number;
            setIdx: (v: number) => void;
        }
        const processComment = (props: ProcessorProps) => {
            const end = this.holderArray.slice(props.idx).findIndex((v) => v.type === "Newline") + props.idx;
            this.pushGroup({ group: new CommentGroup(), elems: this.holderArray.slice(props.idx, end) });
        };
        const processEscape = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const next = this.holderArray[props.idx + 1];

            if (next.type === "Newline") {
                return;
            }
            if (elem.range.isAdjacent(next.range)) {
                this.pushGroup({ group: new (next.type === "TripleBracketOpen" ? TripleBracketContentGroup : ContentGroup)(), elems: [elem, next] });

                // 다음 text 건너뛰기
                if (next.type === "TripleBracketClose" || next.type === "TripleBracketOpen") {
                    return;
                }

                props.setIdx(props.idx + 1);
            }
        };
        const processTripleBracketOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            tripleBracketQueue.push(elem);
        };
        const processTripleBracketClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const lastItem = tripleBracketQueue.pop();

            if (lastItem === undefined) {
                // elem.ignore = true;
                return;
            }

            const group: Group = lastItem.group.find((v) => v instanceof TripleBracketContentGroup)
                ? new TripleBracketContentGroup()
                : new TripleBracketGroup();
            this.pushGroup({ group, elems: [lastItem, elem] });
        };
        const processSquareBracketOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];

            const adjBrackets = [elem];
            let lastRange: Range = elem.range;
            let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
            for (const subElem of this.holderArray.slice(props.idx + 1)) {
                if (subElem.type === "SquareBracketOpen" && lastRange.isAdjacent(subElem.range)) {
                    bracketCount++;
                    if (bracketCount > 2) {
                        // subElem.ignore = true;
                    }
                    adjBrackets.push(subElem);
                    lastRange = subElem.range;
                    continue;
                }
                break;
            }

            squareBracketArray.push({ value: adjBrackets, max: 0 });
            // 인접한 bracket은 pass해도 됨
            props.setIdx(props.idx + adjBrackets.length - 1);
        };
        const processSquareBracketClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];

            const adjBrackets = [elem];

            let lastRange: Range = elem.range;
            let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
            for (const subElem of this.holderArray.slice(props.idx + 1)) {
                if (subElem.type === "SquareBracketClose" && lastRange.isAdjacent(subElem.range)) {
                    bracketCount++;
                    if (bracketCount > 2) {
                        // subElem.ignore = true;
                    }
                    adjBrackets.push(subElem);
                    lastRange = subElem.range;
                    continue;
                }
                break;
            }
            const firstItem = squareBracketArray[0];
            if (firstItem === undefined) {
                // adjBrackets.forEach((v) => (v.ignore = true));
                // 인접한 bracket은 pass해도 됨
                props.setIdx(props.idx + adjBrackets.length - 1);
                return;
            }

            for (const bracket of squareBracketArray) {
                const parseParenthesis = (group: Group) => {
                    let parenthesisPair: [HolderElem?, HolderElem?] = [undefined, undefined];
                    const startOrigin = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                    const endOrigin = this.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                    for (const subElem of this.holderArray.slice(startOrigin, endOrigin)) {
                        if (subElem.type === "ParenthesisOpen" && parenthesisPair[0] === undefined) {
                            parenthesisPair[0] = subElem;
                            continue;
                        }

                        if (subElem.type === "ParenthesisClose" && parenthesisPair[0] !== undefined) {
                            parenthesisPair[1] = subElem;
                            continue;
                        }
                    }
                    const validMacroRegex =
                        /^(clearfix|date|datetime|목차|tableofcontents|각주|footnote|br|pagecount|anchor|age|dday|youtube|kakaotv|nicovideo|vimeo|navertv|pagecount|math|include)$/g;
                    const [pStart, pEnd] = parenthesisPair;
                    if (!((pStart === undefined && pEnd === undefined) || (pStart !== undefined && pEnd !== undefined))) {
                        return false;
                    }
                    if (pEnd !== undefined) {
                        if (!pEnd.range.isAdjacent(adjBrackets[0].range)) {
                            return false;
                        }
                    }
                    if (
                        validMacroRegex.exec(
                            this.wikiText.substring(
                                (bracket.value.at(-1)?.range.start as number) + 1,
                                pEnd === undefined ? adjBrackets[0].range.start : pStart?.range.start
                            )
                        ) === null
                    ) {
                        return false;
                    }

                    const elems =
                        pStart === undefined
                            ? [adjBrackets[0], bracket.value[0]]
                            : [adjBrackets[0], pStart as HolderElem, pEnd as HolderElem, bracket.value[0]];
                    this.pushGroup({ group, elems });
                    return true;
                };

                const prevMax = bracket.max;
                if (adjBrackets.length > bracket.max) {
                    bracket.max = adjBrackets.length;
                } else {
                    continue;
                }

                // 같은 개행 줄에 있는지 여부
                if (bracket.value[0].eolRange === adjBrackets[0].eolRange) {
                    const group: Group = new (bracket.value.length >= 2 && bracket.max >= 2 ? DoubleSquareBracketGroup : SingleSquareBracketGroup)();
                    if (bracket.value.length >= 2 && bracket.max >= 2) {
                        // 링크 문법
                        const originIndex = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                        const elementIndex = this.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                        const firstPipeIndex = this.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                        const elems =
                            firstPipeIndex - originIndex === -1
                                ? [adjBrackets[0], adjBrackets[1], bracket.value[0], bracket.value[1]]
                                : [adjBrackets[0], adjBrackets[1], this.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]];
                        this.pushGroup({ group, elems });
                    } else {
                        // 매크로 문법
                        const isSucceed = parseParenthesis(group);
                        if (!isSucceed) {
                            bracket.max = prevMax;
                            // adjBrackets.forEach((v) => (v.ignore = true));
                            continue;
                        }
                    }
                } else {
                    if (bracket.value.length >= 2 && bracket.max >= 2) {
                        // 링크
                        const originIndex = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                        const elementIndex = this.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                        const firstPipeIndex = this.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                        if (firstPipeIndex - originIndex === -1) {
                            bracket.max = prevMax;
                            // adjBrackets.forEach((v) => (v.ignore = true));
                            continue;
                        }

                        const fromPipeToElemArray = this.holderArray.slice(firstPipeIndex, elementIndex);
                        let lock = false;
                        const filteredArray = [];
                        for (const element of fromPipeToElemArray) {
                            if (element.group.find((v) => v instanceof TripleBracketGroup)) {
                                lock = !lock;
                                continue;
                            } else {
                                if (!lock) {
                                    filteredArray.push(element);
                                }
                            }
                        }

                        // 개행문자가 들어가있는 경우
                        if (filteredArray.filter((v) => v.type === "Newline").length !== 0) {
                            bracket.max = prevMax;
                            // adjBrackets.forEach((v) => (v.ignore = true));
                            continue;
                        }

                        const group: Group = new DoubleSquareBracketGroup();
                        this.pushGroup({
                            group,
                            elems: [adjBrackets[0], adjBrackets[1], this.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]],
                        });
                    } else {
                        // 매크로
                        const group: Group = new SingleSquareBracketGroup();
                        const isSucceed = parseParenthesis(group);
                        if (!isSucceed) {
                            bracket.max = prevMax;
                            // adjBrackets.forEach((v) => (v.ignore = true));
                            continue;
                        }
                    }
                }

                if ((bracket.value.length >= 2 && bracket.max >= 2) || (bracket.value.length === 1 && bracket.max >= 1)) {
                    squareBracketArray = squareBracketArray.filter((v) => v.value[0].range.start > adjBrackets[0].range.start);
                    break;
                }
            }

            // 인접한 bracket은 pass해도 됨
            props.setIdx(props.idx + adjBrackets.length - 1);
        };
        const processHeadingOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            headingOpenElement = elem;
        };
        const processHeadingClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            if (headingOpenElement !== undefined && headingOpenElement.eolRange === elem.eolRange) {
                const openRegex = /(?<level>={1,6})(?<isHidden>#?) /g;
                const closeRegex = / (?<isHidden>#?)(?<level>={1,6})/g;
                const openGroup = (
                    openRegex.exec(this.wikiText.substring(headingOpenElement.range.start, headingOpenElement.range.end)) as RegExpExecArray
                ).groups;
                const closeGroup = (closeRegex.exec(this.wikiText.substring(elem.range.start, elem.range.end)) as RegExpExecArray).groups;

                // 같은 종류의 heading인지 확인
                if (!((openGroup?.level ?? "1") === (closeGroup?.level ?? "2") && (openGroup?.isHidden ?? "1") === (closeGroup?.isHidden ?? "2"))) {
                    return;
                }

                this.pushGroup({ group: new HeadingGroup(), elems: [elem, headingOpenElement] });
                return;
            }
        };
        const processMathTagOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            // 같은 math 태그는 앞에 것이 우선, 단 eolRange가 같을때만
            if (mathOpenElement !== undefined && mathOpenElement.eolRange.isSame(elem.eolRange)) {
                if (mathOpenElement.eolRange.isSame(elem.eolRange)) {
                    return;
                }
            }
            mathOpenElement = elem;
        };
        const processMathTagClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            if (mathOpenElement === undefined) {
                return;
            }
            if (!mathOpenElement.eolRange.isSame(elem.eolRange)) {
                mathOpenElement = undefined;
                return;
            }

            this.pushGroup({ group: new MathTagGroup(), elems: [mathOpenElement, elem] });
            mathOpenElement = undefined;
        };
        const processFootnoteOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const prev = this.holderArray[props.idx - 1];

            // 이미 사용중
            if (prev.fixed) {
                return;
            }

            // 인접 여부
            if (!elem.range.isAdjacent(prev.range)) {
                return;
            }

            footnoteQueue.push([prev, elem]);
        };
        const processFootnoteClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];

            if (elem.fixed) {
                return;
            }

            const lastTuple = footnoteQueue.pop();

            if (lastTuple === undefined) {
                return;
            }

            this.pushGroup({ group: new FootnoteGroup(), elems: [...lastTuple, elem] });
        };
        const processTextDecoration = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const elemType = elem.type as "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma"
            
            const adjDecoration = [elem];
            let lastRange: Range = elem.range;
            let decoCount = 1;
            const decoCountMax = elemType === "Quote" ? 3 : 2;
            for (const subElem of this.holderArray.slice(props.idx + 1)) {
                if (decoCount === decoCountMax)  {
                    break;
                }
                if (subElem.type === elem.type && lastRange.isAdjacent(subElem.range)) {
                    decoCount++;
                    adjDecoration.push(subElem);
                    lastRange = subElem.range;
                    continue;
                }
                break;
            }

            if (adjDecoration.length < 2) {
                props.setIdx(props.idx + adjDecoration.length - 1);
                return;
            }

            if (elemType !== "Quote") {    
                let referencedArray = decoArray[elemType];

                if (referencedArray.length === 0 || !referencedArray[0].eolRange.isSame(elem.eolRange)) {
                    decoArray[elemType] = [...adjDecoration];
                    props.setIdx(props.idx + adjDecoration.length - 1);
                    return;
                }

                let correspondedGroup: Group = new Group();
                switch (elemType) {
                    case "Carot":
                        correspondedGroup = new DecoCarotGroup();
                        break;
                    case "Underbar":
                        correspondedGroup = new DecoUnderbarGroup();
                        break;
                    case "Comma":
                        correspondedGroup = new DecoCommaGroup();
                        break;
                    case "Tilde":
                        correspondedGroup = new DecoTildeGroup();
                        break;
                    case "Hyphen":
                        correspondedGroup = new DecoHyphenGroup();
                        break;
                    default:
                        break;
                }

                this.pushGroup({ group: correspondedGroup, elems: [...referencedArray, ...adjDecoration] });
                decoArray[elemType] = [];

                props.setIdx(props.idx + adjDecoration.length - 1);
            } else {
                let referencedArray = decoArray[elemType];

                if (referencedArray.length === 0 || !referencedArray[0].eolRange.isSame(elem.eolRange)) {
                    decoArray[elemType] = [...adjDecoration];
                    props.setIdx(props.idx + adjDecoration.length - 1);
                    return;
                }

                let correspondedGroup: Group = referencedArray.length === 3 && adjDecoration.length === 3 ? new DecoTripleQuoteGroup() : new DecoDoubleQuoteGroup()

                if (referencedArray.length > adjDecoration.length) {
                    // ''' asdf ''
                    this.pushGroup({ group: correspondedGroup, elems: [...referencedArray.slice(Number(`-${adjDecoration.length}`)), ...adjDecoration] })
                    decoArray[elemType] = [];
    
                    props.setIdx(props.idx + adjDecoration.length - 1);
                } else {
                    // '' asdf '' || '' asdf '''
                    this.pushGroup({ group: correspondedGroup, elems: [...referencedArray, ...adjDecoration.slice(0, referencedArray.length)] })
                    decoArray[elemType] = [];
    
                    props.setIdx(props.idx + referencedArray.length - 1);
                }
            }
        };

        type ProcessorType = { [k in HolderType]?: ((props: ProcessorProps) => void)[] };

        const firstMappedProcessor: ProcessorType = {
            Comment: [processComment],
            Escape: [processEscape],
            TripleBracketOpen: [processTripleBracketOpen],
            TripleBracketClose: [processTripleBracketClose],
            SquareBracketOpen: [processSquareBracketOpen],
            SquareBracketClose: [processSquareBracketClose],
            HeadingOpen: [processHeadingOpen],
            HeadingClose: [processHeadingClose],
            MathTagOpen: [processMathTagOpen],
            MathTagClose: [processMathTagClose],
        };
        const firstGrouping = () => {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                const elem = this.holderArray[idx];

                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });

                if (elem.fixed) {
                    continue;
                }

                const doubleSquare = elem.group.find((v) => v instanceof DoubleSquareBracketGroup);
                if (doubleSquare !== undefined) {
                    const foundGroup = elem.group.find((v) => v instanceof SingleSquareBracketGroup);
                    if (foundGroup !== undefined) {
                        this.removeGroup({ group: foundGroup });
                    }
                    if (doubleSquare.elems.length !== 4 && doubleSquare.elems.length !== 5) {
                        this.removeGroup({ group: doubleSquare });
                        continue;
                    }
                    const start = this.holderArray.findIndex((v) => v.uuid === doubleSquare.elems[1].uuid);
                    const end = this.holderArray.findIndex(
                        (v) => v.uuid === doubleSquare.elems[doubleSquare.elems.length === 4 /* pipe 제외 시 */ ? 2 : 3].uuid
                    );
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    const pipeIndex = sliced.findIndex((v) => v.type === "Pipe");
                    (pipeIndex !== -1 ? sliced.slice(0, pipeIndex) : sliced).forEach((v) => (v.ignore = true));
                }

                const singleSquare = elem.group.find((v) => v instanceof SingleSquareBracketGroup);
                if (singleSquare !== undefined) {
                    if (singleSquare.elems.length !== 2 && singleSquare.elems.length !== 4) {
                        this.removeGroup({ group: singleSquare });
                        continue;
                    }
                    const start = this.holderArray.findIndex((v) => v.uuid === singleSquare.elems[0].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === singleSquare.elems[singleSquare.elems.length - 1].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    sliced.forEach((v) => {
                        if (v.type !== "ParenthesisOpen" && v.type !== "ParenthesisClose") v.ignore = true;
                    });
                }

                const triple = elem.group.find((v) => v instanceof TripleBracketGroup);
                if (triple !== undefined) {
                    if (triple.elems.length !== 2) {
                        this.removeGroup({ group: triple });
                        continue;
                    }
                }

                const heading = elem.group.find((v) => v instanceof HeadingGroup);
                if (heading !== undefined) {
                    if (heading.elems.length !== 2) {
                        this.removeGroup({ group: heading });
                        continue;
                    }
                }

                const mathtag = elem.group.find((v) => v instanceof MathTagGroup);
                if (mathtag !== undefined) {
                    if (mathtag.elems.length !== 2) {
                        this.removeGroup({ group: mathtag });
                        continue;
                    }
                    const range = mathtag.elems.map((v) => v.range);
                    this.holderArray.forEach((holder) => {
                        // mathtag의 regex는 tableargument의 regex와 비슷함
                        const filtered = range.filter((v) => holder.range.isContainedIn(v) && !holder.range.isSame(v));
                        if (filtered.length !== 0) {
                            holder.ignore = true;
                        }
                    });
                    const start = this.holderArray.findIndex((v) => v.uuid === mathtag.elems[0].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === mathtag.elems[1].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    sliced.forEach((v) => (v.ignore = true));
                }

                const tripleContent = elem.group.find((v) => v instanceof TripleBracketContentGroup);
                if (tripleContent !== undefined) {
                    tripleContent.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: tripleContent });
                    continue;
                }

                const content = elem.group.find((v) => v instanceof ContentGroup);
                if (content !== undefined) {
                    content.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: content });
                    continue;
                }

                const comment = elem.group.find((v) => v instanceof CommentGroup);
                if (comment !== undefined) {
                    comment.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: comment });
                    continue;
                }

                for (const group of elem.group) {
                    group.elems.forEach((v) => (v.fixed = true));
                }
            }
        };

        const secondMappedProcessor: ProcessorType = {
            FootnoteOpen: [processFootnoteOpen],
            SquareBracketClose: [processFootnoteClose],
        };
        const secondGrouping = () => {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                const elem = this.holderArray[idx];

                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });

                if (elem.fixed) {
                    continue;
                }

                const footnote = elem.group.find((v) => v instanceof FootnoteGroup);
                if (footnote !== undefined) {
                    if (footnote.elems.length !== 3) {
                        this.removeGroup({ group: footnote });
                        continue;
                    }
                }

                for (const group of elem.group) {
                    group.elems.forEach((v) => (v.fixed = true));
                }
            }
        };

        const thirdMappedProcessor: ProcessorType = {
            Quote: [processTextDecoration],
            Underbar: [processTextDecoration],
            Tilde: [processTextDecoration],
            Carot: [processTextDecoration],
            Comma: [processTextDecoration],
            Hyphen: [processTextDecoration],
        };
        const thirdGrouping = () => {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                const elem = this.holderArray[idx];

                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });

                if (elem.fixed) {
                    continue;
                }

                const underbar = elem.group.find((v) => v instanceof DecoUnderbarGroup);
                const tilde = elem.group.find((v) => v instanceof DecoTildeGroup);
                const carot = elem.group.find((v) => v instanceof DecoCarotGroup);
                const comma = elem.group.find((v) => v instanceof DecoCommaGroup);
                const hyphen = elem.group.find((v) => v instanceof DecoHyphenGroup);
                const doublequote = elem.group.find((v) => v instanceof DecoDoubleQuoteGroup);
                const triplequote = elem.group.find((v) => v instanceof DecoTripleQuoteGroup);

                const groups = [underbar, tilde, carot, comma, hyphen, doublequote, triplequote]

                for (const group of groups) {
                    if (group !== undefined) {
                        if ((group instanceof DecoTripleQuoteGroup) && group.elems.length !== 6) {
                            this.removeGroup({ group });
                            continue;
                        }
                        if (!(group instanceof DecoTripleQuoteGroup) && group.elems.length !== 4) {
                            this.removeGroup({ group });
                            continue;
                        }
                        const start = this.holderArray.findIndex((v) => v.uuid === group.elems[1].uuid);
                        const end = this.holderArray.findIndex((v) => v.uuid === group.elems[2].uuid);
                        const sliced = this.holderArray
                            .slice(start, end + 1)
                            .toSpliced(0, 1)
                            .toSpliced(-1, 1);
                        sliced.forEach((v) => {
                            const underbar = v.group.find((v) => v instanceof DecoUnderbarGroup);
                            const tilde = v.group.find((v) => v instanceof DecoTildeGroup);
                            const carot = v.group.find((v) => v instanceof DecoCarotGroup);
                            const comma = v.group.find((v) => v instanceof DecoCommaGroup);
                            const hyphen = v.group.find((v) => v instanceof DecoHyphenGroup);
                            const doublequote = v.group.find((v) => v instanceof DecoDoubleQuoteGroup);
                            const triplequote = v.group.find((v) => v instanceof DecoTripleQuoteGroup);
                            if (underbar !== undefined || tilde !== undefined || carot !== undefined || comma !== undefined || hyphen !== undefined || doublequote !== undefined || triplequote !== undefined) {
                                v.ignore = true
                            }
                        });
                    }
                }

                for (const group of elem.group) {
                    group.elems.forEach((v) => (v.fixed = true));
                }
            }
        };

        const processorTuple: [ProcessorType, () => void][] = [
            [firstMappedProcessor, firstGrouping],
            [secondMappedProcessor, secondGrouping],
            [thirdMappedProcessor, thirdGrouping],
        ];

        for (const [currentMappedProcessor, currentGrouping] of processorTuple) {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                const elem = this.holderArray[idx];
                const props: ProcessorProps = { idx, setIdx: (v: number) => (idx = v) };
                const currentProcessor = currentMappedProcessor[elem.type];
                if (currentProcessor !== undefined) {
                    for (const processor of currentProcessor) {
                        processor(props);
                    }
                    continue;
                }
            }
            currentGrouping();
            this.holderArray = this.holderArray.filter((v) => {
                if (v.ignore) {
                    v.group.forEach((group) => this.removeGroup({ group }));
                    return false;
                }
                return true;
            });
        }

        // console.log(this.holderArray)
        // console.log(util.inspect(this.groupArray, false, null, true))
        console.log(util.inspect(this.holderArray, false, 3, true));
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.fillEolHolder();
            this.collectHolderElem();
            this.doParsing();
        }
    }
}
