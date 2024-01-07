import { Range, seekEOL } from "./utils";
import { BaseGroup, Elem, Group, GroupPropertySingleSquareBracketNameType, GroupType, HolderElem, HolderType, parserStoreType, regexType } from "./elem";
import firstGroupper from "./groupper/firstGroupper";
import secondGroupper from "./groupper/secondGroupper";
import thirdGroupper from "./groupper/thirdGroupper";
import fourthGroupper from "./groupper/fourthGroupper";
import { GroupperReturnType } from "./groupper";
import { ProcessorProps } from "./processor";
import fifthGroupper from "./groupper/fifthGroupper";
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

    evaluateHolder(arr: regexType) {
        let [regex, type, offset] = arr;
        let offsetStart = offset?.start ?? 0;
        let offsetEnd = offset?.end ?? 0;
        let offsetUseGroupStart = offset?.useGroupStart;
        let offsetUseGroupEnd = offset?.useGroupEnd;

        let match;

        while ((match = regex.exec(this.wikiText)) !== null) {
            if (offsetUseGroupStart !== undefined) {
                offsetStart = match.groups?.[offsetUseGroupStart].length as number;
            }
            if (offsetUseGroupEnd !== undefined) {
                offsetEnd = match.groups?.[offsetUseGroupEnd].length as number;
            }

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
        // linkpipe, tablecell
        const pipe: regexType = [/\|/g, "Pipe"];
        const comment: regexType = [/\n##/g, "Comment", { start: 1 }];
        // linkOpen, macroOpen
        const squareBracketOpen: regexType = [/\[/g, "SquareBracketOpen"];
        const footnoteOpen: regexType = [/\[\*/g, "FootnoteOpen", { start: 1 }];
        // footnoteclose, linkclose, macroclose
        const squareBracketClose: regexType = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: regexType = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: regexType = [/\)/g, "ParenthesisClose"];
        const headingOpen: regexType = [/\n={1,6}(#?) /g, "HeadingOpen", { start: 1 }];
        const headingClose: regexType = [/ (#?)={1,6}\n/g, "HeadingClose", { end: -1 }];
        const tripleBracketOpen: regexType = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: regexType = [/\}\}\}/g, "TripleBracketClose"];
        const indent: regexType = [/\n( ){1,}/g, "Indent", { start: 1 }];
        const citeIndent: regexType = [/\>( ){1,}/g, "CiteIndent", { start: 1 }];
        const listIndent: regexType = [/(?<head>((\>|( ))(\*|(1|a|A|i|I)\.(\#\d)?)))( ){1,}/g, "ListIndent", { useGroupStart: "head" }];
        const unorderedList: regexType = [/(?<head>(\>|( )))\*/g, "UnorderedList", { useGroupStart: "head" }];
        const orderedList: regexType = [/(?<head>(\>|( )))(1|a|A|i|I)\.(\#\d)?/g, "OrderedList", { useGroupStart: "head" }];
        const citeUnorderedList: regexType = [/(\>)( ){1,}\*/g, "CiteUnorderedList", { start: 1 }];
        const citeOrderedList: regexType = [/(\>)( ){1,}(1|a|A|i|I)\.(\#\d)?/g, "CiteOrderedList", { start: 1 }];
        const cite: regexType = [/(?<head>\n|\>|( )|((\>|( ))(\*|(1|a|A|i|I)\.(\#\d)?)))\>( ){0,}/g, "Cite", { useGroupStart: "head" }];
        const tableArgumentOpen: regexType = [/(\||\>)\</g, "TableArgumentOpen", { start: 1 }];
        const tableArgumentClose: regexType = [/(\w{1})\>/g, "TableArgumentClose", { start: 1 }];
        const mathTagOpen: regexType = [/\<math\>/g, "MathTagOpen"];
        const mathTagClose: regexType = [/\<\/math\>/g, "MathTagClose"];
        const quote: regexType = [/\'/g, "Quote"];
        const underbar: regexType = [/\_/g, "Underbar"];
        const tilde: regexType = [/\~/g, "Tilde"];
        const carot: regexType = [/\^/g, "Carot"];
        const comma: regexType = [/\,/g, "Comma"];
        const hyphen: regexType = [/\-/g, "Hyphen"];
        const escape: regexType = [/\\/g, "Escape"];
        const newline: regexType = [/[\n]/g, "Newline"];

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
            citeIndent,
            listIndent,
            unorderedList,
            orderedList,
            citeUnorderedList,
            citeOrderedList,
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

    parserStore: parserStoreType = {
        tripleBracketQueue: [],
        squareBracketArray: [],
        headingOpenElement: undefined,
        mathOpenElement: undefined,
        footnoteQueue: [],
        decoArray: {
            Quote: [],
            Underbar: [],
            Hyphen: [],
            Tilde: [],
            Carot: [],
            Comma: [],
        },
        tableArray: {},
        indentArray: {},
    };

    doParsing() {
        const processorTuple: GroupperReturnType[] = [firstGroupper, secondGroupper, thirdGroupper, fourthGroupper, fifthGroupper];

        for (const [currentMappedProcessor, currentGrouping] of processorTuple) {
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                const elem = this.holderArray[idx];
                const props: ProcessorProps = { idx, setIdx: (v: number) => (idx = v) };
                const currentProcessor = currentMappedProcessor[elem.type];
                if (currentProcessor !== undefined) {
                    for (const processor of currentProcessor) {
                        processor(this, props);
                    }
                    continue;
                }
            }
            const m = currentGrouping.name;
            console.time(m);
            currentGrouping(this);
            console.timeEnd(m);
            this.holderArray = this.holderArray.filter((v) => {
                if (v.ignore) {
                    v.group.forEach((group) => this.removeGroup({ group }));
                    return false;
                }
                return true;
            });
        }

        console.log(util.inspect(this.parserStore.indentArray, false, 4, true));
        // console.log(util.inspect(decoArray, false, 3, true))
        // console.log(util.inspect(tableArray, false, 4, true))
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.fillEolHolder();
            this.collectHolderElem();
            this.doParsing();
        }
        return this.holderArray;
    }
}
