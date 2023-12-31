import { Range, seekEOL } from "./utils";
import { BaseGroup, Elem, Group, GroupPropertySingleSquareBracketNameType, GroupType, HolderElem, HolderType } from "./elem";
const util = require("node:util");

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    holderArray: HolderElem[] = [];
    groupArray: BaseGroup[] = [];
    eolHolderArray: { range: Range; holders: HolderElem[] | null }[] = [];
    headingLevelAt: number[] = [0, 0, 0, 0, 0, 0];

    constructor(wikiText: string) {
        // \n는 regex 방지용
        this.wikiText = "\n" + wikiText + "\n";
    }

    pushGroup(props: { group: BaseGroup; elems: HolderElem[] }) {
        props.group.elems.push(...props.elems);
        props.group.elems.sort((a, b) => a.range.start - b.range.start);
        for (const elem of props.elems) {
            elem.group.push(props.group);
        }
        this.groupArray.push(props.group);
    }

    removeGroup(props: { group: BaseGroup }) {
        const targetIndex = this.groupArray.findIndex((v) => v.uuid === props.group.uuid);
        if (targetIndex === -1) {
            return;
        }
        for (const elem of this.groupArray[targetIndex].elems) {
            elem.group = elem.group.filter((v) => v.uuid !== props.group.uuid);
        }
        this.groupArray.splice(targetIndex, 1);
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
        const tableArgumentOpen: offsetOnlyStart = [/(\||\>)\</g, "TableArgumentOpen", 1];
        const tableArgumentClose: offsetNone = [/\>/g, "TableArgumentClose"];
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
            Comma: [],
        };
        const tableArray: {[k: string]: {rowStartIndex: number; argumentHolder: HolderElem | null; isTableEnd: boolean; data: HolderElem[][];}} = {};

        interface ProcessorProps {
            idx: number;
            setIdx: (v: number) => void;
        }
        const processComment = (props: ProcessorProps) => {
            const end = this.holderArray.slice(props.idx).findIndex((v) => v.type === "Newline") + props.idx;
            this.pushGroup({ group: new Group("Comment"), elems: this.holderArray.slice(props.idx, end + 1) });
        };
        const processEscape = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const next = this.holderArray[props.idx + 1];

            if (next.type === "Newline") {
                return;
            }
            if (elem.range.isAdjacent(next.range)) {
                this.pushGroup({ group: new Group(next.type === "TripleBracketOpen" ? "TripleBracketContent" : "Content"), elems: [elem, next] });

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

            const group = new Group(lastItem.group.find((v) => v.type === "TripleBracketContent") ? "TripleBracketContent" : "TripleBracket");
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
                const parseParenthesis = (group: Group<"SingleSquareBracket">) => {
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

                    const result = validMacroRegex.exec(
                        this.wikiText.substring(
                            (bracket.value.at(-1)?.range.start as number) + 1,
                            pEnd === undefined ? adjBrackets[0].range.start : pStart?.range.start
                        )
                    );

                    if (result === null) {
                        return false;
                    }
                    
                    const elems =
                        pStart === undefined
                            ? [adjBrackets[0], bracket.value[0]]
                            : [adjBrackets[0], pStart as HolderElem, pEnd as HolderElem, bracket.value[0]];
                    group.property = { name: result[0] as GroupPropertySingleSquareBracketNameType }
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
                    const group = new Group(bracket.value.length >= 2 && bracket.max >= 2 ? "DoubleSquareBracket" : "SingleSquareBracket");
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
                            if (element.group.find((v) => v.type === "TripleBracket")) {
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

                        const group = new Group("DoubleSquareBracket");
                        this.pushGroup({
                            group,
                            elems: [adjBrackets[0], adjBrackets[1], this.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]],
                        });
                    } else {
                        // 매크로
                        const group = new Group("SingleSquareBracket");
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

                this.pushGroup({ group: new Group("Heading", { level: openGroup?.level.length as number, isHidden: openGroup?.isHidden === "#" }), elems: [elem, headingOpenElement] });
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

            this.pushGroup({ group: new Group("MathTag"), elems: [mathOpenElement, elem] });
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

            if (lastTuple[0].availableRange !== elem.availableRange) {
                return;
            }

            this.pushGroup({ group: new Group("Footnote"), elems: [...lastTuple, elem] });
        };
        const processTextDecoration = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const elemType = elem.type as "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma";

            const adjDecoration = [elem];
            let lastRange: Range = elem.range;
            let decoCount = 1;
            const decoCountMax = elemType === "Quote" ? 3 : 2;
            for (const subElem of this.holderArray.slice(props.idx + 1)) {
                if (decoCount === decoCountMax) {
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

                if (referencedArray.length === 0 || !referencedArray[0].eolRange.isSame(elem.eolRange) || !(referencedArray[0].availableRange === elem.availableRange)) {
                    decoArray[elemType] = [...adjDecoration];
                    props.setIdx(props.idx + adjDecoration.length - 1);
                    return;
                }

                this.pushGroup({ group: new Group(`Deco${elemType}`), elems: [...referencedArray, ...adjDecoration] });
                decoArray[elemType] = [];

                props.setIdx(props.idx + adjDecoration.length - 1);
            } else {
                let referencedArray = decoArray[elemType];

                if (referencedArray.length === 0 || !referencedArray[0].eolRange.isSame(elem.eolRange) || !(referencedArray[0].availableRange === elem.availableRange)) {
                    decoArray[elemType] = [...adjDecoration];
                    props.setIdx(props.idx + adjDecoration.length - 1);
                    return;
                }

                let correspondedGroup = new Group(
                    referencedArray.length === 3 && adjDecoration.length === 3 ? "DecoTripleQuote" : "DecoDoubleQuote"
                );

                if (referencedArray.length > adjDecoration.length) {
                    // ''' asdf ''
                    this.pushGroup({
                        group: correspondedGroup,
                        elems: [...referencedArray.slice(Number(`-${adjDecoration.length}`)), ...adjDecoration],
                    });
                    decoArray[elemType] = [];

                    props.setIdx(props.idx + adjDecoration.length - 1);
                } else {
                    // '' asdf '' || '' asdf '''
                    this.pushGroup({ group: correspondedGroup, elems: [...referencedArray, ...adjDecoration.slice(0, referencedArray.length)] });
                    decoArray[elemType] = [];

                    props.setIdx(props.idx + referencedArray.length - 1);
                }
            }
        };
        
        const processTablePipe = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];
            const next = this.holderArray[props.idx + 1];
            if (next.type !== "Pipe") {
                return;
            }
            
            const adjNext = this.wikiText[next.range.end];
            const adjPipe = [elem, next]
            const currentTable = tableArray[elem.availableRange.toString()]

            if (currentTable === undefined || currentTable.data[0].length === 0) {
                if (this.wikiText.substring(elem.eolRange.start, elem.range.end).trim() !== "|") {
                    props.setIdx(props.idx + adjPipe.length - 1);
                    return;
                }
            }

            if (currentTable === undefined) {
                if (adjNext !== "\n") {
                    tableArray[elem.availableRange.toString()] = {rowStartIndex: 0, data: [[...adjPipe]], isTableEnd: false, argumentHolder: null}
                }
                props.setIdx(props.idx + adjPipe.length - 1);
                return;
            }

            if (currentTable.isTableEnd) {
                tableArray[elem.availableRange.toString()].rowStartIndex = currentTable.data[0].length;
                currentTable.isTableEnd = false;
            }

            tableArray[elem.availableRange.toString()].data[0].push(...adjPipe)
            props.setIdx(props.idx + adjPipe.length - 1);
            return;
        }    
        const processTableNewline = (props: ProcessorProps) => {
            const prev = this.holderArray[props.idx - 1];
            const elem = this.holderArray[props.idx];
            if (prev === undefined) {
                return;
            }

            const currentTable = tableArray[elem.availableRange.toString()]
            if (currentTable === undefined || currentTable.data[0].length === 0) {
                return;
            }

            if (currentTable.isTableEnd) {
                tableArray[elem.availableRange.toString()] = { data: [[], ...currentTable.data], rowStartIndex: 0, isTableEnd: false, argumentHolder: null }
                return;
            }

            if (prev.type === "Pipe" && prev.range.isAdjacent(elem.range)) {
                this.pushGroup({group: new Group("TableRow"), elems: [ ...currentTable.data[0].slice(currentTable.rowStartIndex) ]})
                tableArray[elem.availableRange.toString()].isTableEnd = true;
                return;
            }
        }

        const processTableArgumentOpen = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];

            const currentTable = tableArray[elem.availableRange.toString()]
            if (currentTable === undefined || currentTable.data[0].length === 0) {
                return;
            }

            const argumentHolder = currentTable.argumentHolder;
            if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
                if (argumentHolder !== null && !argumentHolder.range.isAdjacent(elem.range)) {
                    return;
                }
                tableArray[elem.availableRange.toString()].argumentHolder = elem;
                return;
            }

            tableArray[elem.availableRange.toString()].argumentHolder = null;
            return;
        }

        const processTableArgumentClose = (props: ProcessorProps) => {
            const elem = this.holderArray[props.idx];

            const currentTable = tableArray[elem.availableRange.toString()]
            if (currentTable === undefined || currentTable.data[0].length === 0) {
                return;
            }

            const argumentHolder = currentTable.argumentHolder;
            if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
                tableArray[elem.availableRange.toString()].argumentHolder = null;
                return;
            }

            const argument = [argumentHolder, elem]
            this.pushGroup({ group: new Group("TableArgument"), elems: [...argument] })
            tableArray[elem.availableRange.toString()].data[0].push(...argument)
            tableArray[elem.availableRange.toString()].argumentHolder = null;
        }

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
            const flag = { skipFixing: false };
            const mainGrouping = (elem: HolderElem, idx: number) => {
                const comment = elem.group.find((v) => v.type === "Comment");
                if (comment !== undefined) {
                    comment.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: comment });
                    flag.skipFixing = true;
                    return;
                }

                const doubleSquare = elem.group.find((v) => v.type === "DoubleSquareBracket");
                if (doubleSquare !== undefined) {
                    const foundGroup = elem.group.find((v) => v.type === "SingleSquareBracket");
                    if (foundGroup !== undefined) {
                        this.removeGroup({ group: foundGroup });
                    }
                    if (doubleSquare.elems.length !== 4 && doubleSquare.elems.length !== 5) {
                        this.removeGroup({ group: doubleSquare });
                        flag.skipFixing = true;
                        return;
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
                    
                    if (pipeIndex !== -1) {
                        sliced.slice(0, pipeIndex).forEach(v => v.ignore = true);
                        const pipeHolder = sliced[pipeIndex];
                        // console.log("double")
                        sliced.slice(pipeIndex + 1).forEach(v => v.availableRange = new Range(pipeHolder.range.end, this.holderArray[end].range.start))
                    } else {
                        sliced.forEach(v => v.ignore = true);
                    }

                    return;
                }

                const singleSquare = elem.group.find((v) => v.type === "SingleSquareBracket");
                if (singleSquare !== undefined) {
                    if (singleSquare.elems.length !== 2 && singleSquare.elems.length !== 4) {
                        this.removeGroup({ group: singleSquare });
                        flag.skipFixing = true;
                        return;
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
                    return;
                }

                const triple = elem.group.find((v) => v.type === "TripleBracket") as Group<"TripleBracket">;
                if (triple !== undefined) {
                    if (triple.elems.length !== 2) {
                        this.removeGroup({ group: triple });
                        flag.skipFixing = true;
                        return;
                    }

                    const sizingRegex = /^(\+|-)([1-5])( |\n)/g;
                    const wikiRegex = /^#!wiki([^\}]+)?\n/g;
                    const htmlRegex = /^#!html/g;
                    const cssColor =
                        "black|gray|grey|silver|white|red|maroon|yellow|olive|lime|green|aqua|cyan|teal|blue|navy|magenta|fuchsia|purple|dimgray|dimgrey|darkgray|darkgrey|lightgray|lightgrey|gainsboro|whitesmoke|brown|darkred|firebrick|indianred|lightcoral|rosybrown|snow|mistyrose|salmon|tomato|darksalmon|coral|orangered|lightsalmon|sienna|seashell|chocolate|saddlebrown|sandybrown|peachpuff|peru|linen|bisque|darkorange|burlywood|anaatiquewhite|tan|navajowhite|blanchedalmond|papayawhip|moccasin|orange|wheat|oldlace|floralwhite|darkgoldenrod|goldenrod|cornsilk|gold|khaki|lemonchiffon|palegoldenrod|darkkhaki|beige|ivory|lightgoldenrodyellow|lightyellow|olivedrab|yellowgreen|darkolivegreen|greenyellow|chartreuse|lawngreen|darkgreen|darkseagreen|forestgreen|honeydew|lightgreen|limegreen|palegreen|seagreen|mediumseagreen|springgreen|mintcream|mediumspringgreen|mediumaquamarine|aquamarine|turquoise|lightseagreen|mediumturquoise|azure|darkcyan|darkslategray|darkslategrey|lightcyan|paleturquoise|darkturquoise|cadetblue|powderblue|lightblue|deepskyblue|skyblue|lightskyblue|steelblue|aliceblue|dodgerblue|lightslategray|lightslategrey|slategray|slategrey|lightsteelblue|comflowerblue|royalblue|darkblue|ghostwhite|lavender|mediumblue|midnightblue|slateblue|darkslateblue|mediumslateblue|mediumpurple|rebeccapurple|blueviolet|indigo|darkorchid|darkviolet|mediumorchid|darkmagenta|plum|thistle|violet|orchid|mediumvioletred|deeppink|hotpink|lavenderblush|palevioletred|crimson|pink|lightpink";
                    const hexCode = "(?:[0-9a-fA-F]{3}){1,2}";
                    const textColorRegex = new RegExp(`^#(${cssColor}|${hexCode})(?:\,#(${cssColor}|${hexCode}))?( |\n)`, "g");
                    const syntaxRegex = /^#!syntax (basic|cpp|csharp|css|erlang|go|java(?:script)?|html|json|kotlin|lisp|lua|markdown|objectivec|perl|php|powershell|python|ruby|rust|sh|sql|swift|typescript|xml)/g;

                    const content = this.wikiText.substring(triple.elems[0].range.end)
                    let match: RegExpExecArray | null;
                    let detected = false;
                    let ignoredRange = new Range(0, 1);
                    const doMatchIgnoring = () => {
                        if (ignoredRange.end === triple.elems[1].range.start) {
                            this.holderArray.forEach(v => {
                                if (v.type !== "TripleBracketOpen" && v.range.isOverlap(ignoredRange)) {
                                    v.ignore = true;
                                }
                            })
                        } else {
                            const availableRange = new Range(ignoredRange.end, triple.elems[1].range.start);
                            this.holderArray.forEach(v => {
                                if (v.type !== "TripleBracketOpen" && v.range.isOverlap(ignoredRange)) {
                                    v.ignore = true;
                                }
                                if (v.range.isContainedIn(availableRange)) {
                                    v.availableRange = availableRange;
                                }
                            })
                        }
                    }
                    const doWholeIgnoring = () => {
                        const start = this.holderArray.findIndex((v) => v.uuid === triple.elems[0].uuid);
                        const end = this.holderArray.findIndex((v) => v.uuid === triple.elems[1].uuid);
                        const sliced = this.holderArray
                            .slice(start, end + 1)
                            .toSpliced(0, 1)
                            .toSpliced(-1, 1);
                        sliced.forEach((v) => (v.ignore = true));
                    }
                    if (!detected && (match = sizingRegex.exec(content)) !== null) {
                        ignoredRange = new Range(triple.elems[0].range.end, triple.elems[0].range.end + sizingRegex.lastIndex)
                        doMatchIgnoring();
                        triple.property = {type: "Sizing"}
                        detected = true;
                    }
                    if (!detected && (match = wikiRegex.exec(content)) !== null) {
                        ignoredRange = new Range(triple.elems[0].range.end, elem.eolRange.end)
                        doMatchIgnoring();
                        triple.property = {type: "Wiki"}
                        detected = true;
                    }
                    if (!detected && (match = htmlRegex.exec(content)) !== null) {
                        doWholeIgnoring();
                        triple.property = {type: "Html"}
                        detected = true;
                    }
                    if (!detected && (match = textColorRegex.exec(content)) !== null) {
                        ignoredRange = new Range(triple.elems[0].range.end, triple.elems[0].range.end + textColorRegex.lastIndex)
                        doMatchIgnoring();
                        triple.property = {type: "TextColor"}
                        detected = true;
                    }
                    if (!detected && (match = syntaxRegex.exec(content)) !== null) {
                        doWholeIgnoring();
                        triple.property = {type: "Syntax"}
                        detected = true;
                    }
                    if (!detected) {
                        doWholeIgnoring();
                        triple.property = {type: "Raw"}
                        detected = true;
                    }
                    return;
                }

                const heading = elem.group.find((v) => v.type === "Heading");
                if (heading !== undefined) {
                    if (heading.elems.length !== 2) {
                        this.removeGroup({ group: heading });
                        flag.skipFixing = true;
                        return;
                    }

                    const start = this.holderArray.findIndex((v) => v.uuid === heading.elems[0].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === heading.elems[1].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    // console.log('heading')
                    sliced.forEach(v => v.availableRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start))

                    return;
                }

                const mathtag = elem.group.find((v) => v.type === "MathTag");
                if (mathtag !== undefined) {
                    if (mathtag.elems.length !== 2) {
                        this.removeGroup({ group: mathtag });
                        flag.skipFixing = true;
                        return;
                    }
                    const ranges = mathtag.elems.map((v) => v.range);
                    ranges.forEach((range) => {
                        const filtered =this.holderArray.filter(v => v.type === "TableArgumentOpen" || v.type === "TableArgumentClose")
                        filtered.filter(v => v.range.isContainedIn(range)).forEach(v => v.ignore = true);
                    })
                    const start = this.holderArray.findIndex((v) => v.uuid === mathtag.elems[0].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === mathtag.elems[1].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    sliced.forEach((v) => (v.ignore = true));
                    return;
                }

                const tripleContent = elem.group.find((v) => v.type === "TripleBracketContent");
                if (tripleContent !== undefined) {
                    tripleContent.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: tripleContent });
                    flag.skipFixing = true;
                    return;
                }

                const content = elem.group.find((v) => v.type === "Content");
                if (content !== undefined) {
                    content.elems.forEach((v) => (v.ignore = true));
                    this.removeGroup({ group: content });
                    flag.skipFixing = true;
                    return;
                }
            }
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                flag.skipFixing = false;
                
                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });
                
                const elem = this.holderArray[idx];
                if (elem.fixed) {
                    continue;
                }
                
                mainGrouping(elem, idx);

                if (!flag.skipFixing) {
                    for (const group of elem.group) {
                        group.elems.forEach((v) => (v.fixed = true));
                    }
                }
            }
        };

        const secondMappedProcessor: ProcessorType = {
            FootnoteOpen: [processFootnoteOpen],
            SquareBracketClose: [processFootnoteClose],
        };
        const secondGrouping = () => {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });
                
                const elem = this.holderArray[idx];
                if (elem.fixed) {
                    continue;
                }

                const footnote = elem.group.find((v) => v.type === "Footnote");
                if (footnote !== undefined) {
                    if (footnote.elems.length !== 3) {
                        this.removeGroup({ group: footnote });
                        continue;
                    }

                    const start = this.holderArray.findIndex((v) => v.uuid === footnote.elems[1].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === footnote.elems[2].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    // console.log('footnote')
                    sliced.forEach((v) => (v.availableRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start)));
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
                this.holderArray = this.holderArray.filter((v) => {
                    if (v.ignore) {
                        v.group.forEach((group) => this.removeGroup({ group }));
                        return false;
                    }
                    return true;
                });
                
                const elem = this.holderArray[idx];
                if (elem.fixed) {
                    continue;
                }

                const groupTokens: GroupType[] = [
                    "DecoUnderbar",
                    "DecoTilde",
                    "DecoCarot",
                    "DecoComma",
                    "DecoHyphen",
                    "DecoDoubleQuote",
                    "DecoTripleQuote",
                ];
                const filteredGroup = elem.group.filter((v) => groupTokens.includes(v.type));

                for (const group of filteredGroup) {
                    if (group.type === "DecoTripleQuote" && group.elems.length !== 6) {
                        this.removeGroup({ group: elem.group.find((v) => v.type === group.type) as Group<"DecoTripleQuote"> });
                        continue;
                    }
                    if (group.type !== "DecoDoubleQuote" && group.elems.length !== 4) {
                        this.removeGroup({ group: elem.group.find((v) => v.type === group.type) as BaseGroup });
                        continue;
                    }
                    const startLocation = group.type === "DecoTripleQuote" ? 2 : 1;
                    const endLocation = group.type === "DecoTripleQuote" ? 3 : 2;
                    const start = this.holderArray.findIndex((v) => v.uuid === group.elems[startLocation].uuid);
                    const end = this.holderArray.findIndex((v) => v.uuid === group.elems[endLocation].uuid);
                    const sliced = this.holderArray
                        .slice(start, end + 1)
                        .toSpliced(0, 1)
                        .toSpliced(-1, 1);
                    // console.log("deco")
                    sliced.forEach((v) => {
                        if (v.group.filter((v) => groupTokens.includes(v.type)).length !== 0) {
                            v.ignore = true;
                        } else {
                            v.availableRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start)
                        }
                    });
                }

                for (const group of elem.group) {
                    group.elems.forEach((v) => (v.fixed = true));
                }
            }
        };

        const fourthMappedProcessor: ProcessorType = {
            Pipe: [processTablePipe],
            Newline: [processTableNewline],
            TableArgumentOpen: [processTableArgumentOpen],
            TableArgumentClose: [processTableArgumentClose]
        }
        const fourthGrouping = () => {
            for (const elem of Object.values(tableArray)) {
                if (elem.data.length === 0) {
                    continue;
                }
                for (const value of elem.data) {
                    if (value.length === 0) {
                        continue;
                    }

                    this.pushGroup({ group: new Group("TableRow"), elems: [ ...value.filter(v => v.group.find(v => v.type === "TableRow") === undefined) ] })

                    const last = value.findLast(v => v.type === "Pipe")
                    if (last === undefined) {
                        continue;
                    }

                    let substrText = "";
                    // global
                    if (last.availableRange.end === -999) {
                        substrText = this.wikiText.substring(last.range.start, last.eolRange.end - 1);
                    } else {
                        substrText = this.wikiText.substring(last.range.start, last.availableRange.end)
                    }

                    if (substrText !== "|") {
                        const foundGroup = last.group.find(v => v.type === "TableRow") as Group<"TableRow">
                        const argumentGroups: BaseGroup[] = []
                        foundGroup.elems.forEach(v => {
                            const argumentGroup = v.group.find(v => v.type === "TableArgument")
                            if (argumentGroup !== undefined) {
                                argumentGroups.push(argumentGroup)
                            }
                        })
                        argumentGroups.forEach(group => this.removeGroup({ group }))
                        this.removeGroup({ group: foundGroup })
                    }

                    this.pushGroup({ group: new Group("Table"), elems: [...value.filter(v => v.group.find(v => v.type === "TableRow") !== undefined )] })
                }
            }

            // 마지막이라서 grouping 할 필요 없음
        }

        const processorTuple: [ProcessorType, () => void][] = [
            [firstMappedProcessor, firstGrouping],
            [secondMappedProcessor, secondGrouping],
            [thirdMappedProcessor, thirdGrouping],
            [fourthMappedProcessor, fourthGrouping]
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
            const m = currentGrouping.name;
            console.time(m);
            currentGrouping();
            console.timeEnd(m);
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
    }
    
    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.fillEolHolder();
            this.collectHolderElem();
            this.doParsing();
            console.log(util.inspect(this.holderArray, false, 4, true));
        }
    }
}
