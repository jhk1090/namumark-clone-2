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

    pushGroup(props: {group: Group, elems: HolderElem[]}) {
        for (const elem of props.elems) {
            elem.group.push(props.group);
        }
        this.groupArray.push(props.group);
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
        const comment: offsetOnlyStart = [/\n##[^\n]+/g, "Comment", 1];
        // linkOpen, macroOpen
        const squareBracketOpen: offsetNone = [/\[/g, "SquareBracketOpen"];
        // footnoteclose, linkclose, macroclose
        const squareBracketClose: offsetNone = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: offsetNone = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: offsetNone = [/\)/g, "ParenthesisClose"];
        const headingOpen: offsetOnlyStart = [/\n={1,6}(#?) /g, "HeadingOpen", 1];
        const headingClose: offsetBoth = [/ (#?)={1,6}\n/g, "HeadingClose", undefined, -1];
        const tripleBracketOpen: offsetNone = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: offsetNone = [/\}\}\}/g, "TripleBracketClose"];
        const indent: offsetOnlyStart = [/\n( ){1,}/g, "Indent", 1]
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

        interface ProcessorProps {
            idx: number;
            setIdx: (v: number) => void;
        }
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
                elem.isObsolete = true;
                return;
            }

            const group: Group = lastItem.group.find(v => v instanceof TripleBracketContentGroup) ? new TripleBracketContentGroup() : new TripleBracketGroup();
            this.pushGroup({ group, elems: [elem] })
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
                        subElem.isObsolete = true;
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
                        subElem.isObsolete = true;
                    }
                    adjBrackets.push(subElem);
                    lastRange = subElem.range;
                    continue;
                }
                break;
            }
            const firstItem = squareBracketArray[0];
            if (firstItem === undefined) {
                adjBrackets.forEach((v) => (v.isObsolete = true));
                // 인접한 bracket은 pass해도 됨
                props.setIdx(props.idx + adjBrackets.length - 1);
                return;
            }

            for (const bracket of squareBracketArray) {
                const parseParenthesis = (group: Group) => {
                    let parenthesisPair: [HolderElem?, HolderElem?] = [undefined, undefined];
                    const startOrigin = this.holderArray.findIndex(v => v.uuid === bracket.value[0].uuid);
                    const endOrigin = this.holderArray.findIndex(v => v.uuid === adjBrackets[0].uuid);
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
                    const validMacroRegex = /clearfix|date|datetime|목차|tableofcontents|각주|footnote|br|pagecount|anchor|age|dday|youtube|kakaotv|nicovideo|vimeo|navertv|pagecount|math|include/g
                    const [pStart, pEnd] = parenthesisPair;
                    if (!((pStart === undefined && pEnd === undefined) || (pStart !== undefined && pEnd !== undefined))) {
                        return false;
                    }
                    if (pEnd !== undefined) {
                        if (!(pEnd.range.isAdjacent(adjBrackets[0].range))) {
                            return false;
                        }
                    }
                    if (validMacroRegex.exec(this.wikiText.substring(bracket.value.at(-1)?.range.start as number, (pEnd === undefined ? adjBrackets[0].range.start : pStart?.range.start))) === null) {
                        return false;
                    }
                    
                    this.pushGroup({group, elems: [adjBrackets[0], bracket.value[0]]})
                    return true
                }
                // 같은 개행 줄에 있는지 여부
                if (bracket.value[0].eolRange === adjBrackets[0].eolRange) {
                    if (adjBrackets.length > bracket.max) {
                        bracket.max = adjBrackets.length;
                        const group: Group = new (
                            bracket.value.length >= 2 && bracket.max >= 2 ? DoubleSquareBracketGroup : SingleSquareBracketGroup
                        )();
                        if (bracket.value.length >= 2 && bracket.max >= 2) {
                            // 링크 문법
                            this.pushGroup({group, elems: [adjBrackets[0], adjBrackets[1], bracket.value[0], bracket.value[1]]})
                        } else {
                            // 매크로 문법
                            const isSucceed = parseParenthesis(group);
                            if (!isSucceed) {
                                adjBrackets.forEach((v) => (v.isObsolete = true));
                                break;
                            }
                        }
                    } else {
                        continue;
                    }
                } else {
                    if (bracket.value.length >= 2 && bracket.max >= 2) {
                        // 링크
                        const originIndex = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                        const elementIndex = this.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                        const firstPipeIndex = this.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                        if (firstPipeIndex - originIndex === -1) {
                            adjBrackets.forEach((v) => (v.isObsolete = true));
                            break;
                        }
    
                        const fromPipeToElemArray = this.holderArray.slice(firstPipeIndex, elementIndex);
                        let lock = false;
                        const filteredArray = [];
                        for (const element of fromPipeToElemArray) {
                            if (element.group instanceof TripleBracketGroup) {
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
                            adjBrackets.forEach((v) => (v.isObsolete = true));
                            break;
                        }
    
                        const group: Group = new DoubleSquareBracketGroup();
                        this.pushGroup({group, elems: [adjBrackets[0], adjBrackets[1], bracket.value[0], bracket.value[1]]})
                    } else {
                        // 매크로
                        const group: Group = new SingleSquareBracketGroup();
                        const isSucceed = parseParenthesis(group);
                        if (!isSucceed) {
                            adjBrackets.forEach((v) => (v.isObsolete = true));
                            break;
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

                this.pushGroup({group: new HeadingGroup(), elems: [elem, headingOpenElement]})
                return;
            }
        };

        const mappedProcessor: { [k in HolderType]?: ((props: ProcessorProps) => void)[] } = {
            Escape: [ processEscape ],
            TripleBracketOpen: [ processTripleBracketOpen ],
            TripleBracketClose: [ processTripleBracketClose ],
            SquareBracketOpen: [ processSquareBracketOpen ],
            SquareBracketClose: [ processSquareBracketClose ],
            HeadingOpen: [ processHeadingOpen ],
            HeadingClose: [ processHeadingClose ],
        };

        for (let idx = 0; idx < this.holderArray.length; idx++) {
            const elem = this.holderArray[idx];
            const props: ProcessorProps = { idx, setIdx: (v: number) => (idx = v) };
            const currentProcessor = mappedProcessor[elem.type];
            if (currentProcessor !== undefined) {
                for (const processor of currentProcessor) {
                    processor(props)
                }
                continue;
            }
        }

        console.log(util.inspect(this.holderArray, false, null, true))
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
