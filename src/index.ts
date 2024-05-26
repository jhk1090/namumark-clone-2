import { TGroupperTuple } from "./groupper/index.js";
import { BaseGroup, HolderElem, IIndent, IlElement, IlIndent, IlStructure, THolderTag } from "./elem.js";
import { Range } from "range-admin";
import { IProcessorProps } from "./processor/index.js";
import firstGroupper from "./groupper/firstGroupper.js";
import secondGroupper from "./groupper/secondGroupper.js";
import thirdGroupper from "./groupper/thirdGroupper.js";
import fourthGroupper from "./groupper/fourthGroupper.js";
import util from "node:util"
import middleGroupper from "./groupper/middleGroupper.js";

function seekEOL(text: string, offset = 0) {
    return text.indexOf("\n", offset);
}

interface IParserStore {
    tripleBracketQueue: HolderElem[];
    squareBracketArray: { value: HolderElem[]; max: number }[];
    headingOpenElement?: HolderElem;
    mathOpenElement?: HolderElem;
    footnoteQueue: [HolderElem, HolderElem][];
    decoArray: { [k in "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma"]: HolderElem[] };
    tableArray: {
        [k: string]: {
            indentSequence: { count: number; type: THolderTag }[] | null;
            rowStartIndex: number;
            argumentHolder: HolderElem | null;
            isTableEnd: boolean;
            data: HolderElem[][];
        };
    };
    newIndentArray: { [k: string ]: { minIndentSize: number | null, dataArray: IIndent[][], indentStructures: IlStructure[][] } };
    indentArray: { [k: string]: { min: number | null; lastNewlineUUID: string | null; data: IIndent[][] } };
    indentlikeArray: { [k: string]: IlElement[] };
    indentlikeTreeArray: { [k: string]: { data: IlIndent[][]; lastElement: IlElement | null} };
}

export class NamuMark {
    wikiText: string;
    isRedirect: boolean = false;
    holderArray: HolderElem[] = [];
    groupArray: BaseGroup[] = [];
    eolHolderArray: { range: Range; holders: HolderElem[] | null }[] = [];
    headingLevelArray: number[] = [0, 0, 0, 0, 0, 0];
    parserStore: IParserStore = {
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
        newIndentArray: {},
        indentArray: {},
        indentlikeArray: {},
        indentlikeTreeArray: {},
    };

    constructor(wikiText: string) {
        // \n은 regex 방지용
        this.wikiText = `\n${wikiText}\n`;
    }

    public pushGroup(props: { group: BaseGroup; elems: HolderElem[] }) {
        props.group.elems.push(...props.elems);
        props.group.elems.sort((a, b) => a.range.start - b.range.start);
        for (const elem of props.elems) {
            elem.group.push(props.group);
        }
        this.groupArray.push(props.group);
    }

    public removeGroup(props: { group: BaseGroup }) {
        const targetIndex = this.groupArray.findIndex((v) => v.uuid === props.group.uuid);
        if (targetIndex === -1) {
            return;
        }
        for (const elem of this.groupArray[targetIndex].elems) {
            elem.group = elem.group.filter((v) => v.uuid !== props.group.uuid);
        }
        this.groupArray.splice(targetIndex, 1);
    }

    private processRedirect() {
        const redirectRegex = /^\n#redirect ([^\n]+)/g;
        const match = redirectRegex.exec(this.wikiText);
        if (match !== null) {
            this.isRedirect = true;
        }
    }

    private fillEolHolder() {
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

    collectHolderElem() {
        interface IOffset {
            start?: number;
            end?: number;
            useGroupStart?: string;
            useGroupEnd?: string;
        }
        type TRegex = [RegExp, THolderTag, IOffset?];

        const evaluateHolder = (regexArray: TRegex) => {
            let [regex, type, offset] = regexArray;
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
        };

        const pipe: TRegex = [/\|/g, "Pipe"];
        const comment: TRegex = [/\n##/g, "Comment", { start: 1 }];
        const squareBracketOpen: TRegex = [/\[/g, "SquareBracketOpen"];
        const footnoteOpen: TRegex = [/\[\*/g, "FootnoteOpen", { start: 1 }];
        const squareBracketClose: TRegex = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: TRegex = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: TRegex = [/\)/g, "ParenthesisClose"];
        const headingOpen: TRegex = [/\n={1,6}(#?) /g, "HeadingOpen", { start: 1 }];
        const headingClose: TRegex = [/ (#?)={1,6}\n/g, "HeadingClose", { end: -1 }];
        const tripleBracketOpen: TRegex = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: TRegex = [/\}\}\}/g, "TripleBracketClose"];

        const orderedListRegex = /(1|a|A|i|I)\.(\#\d{1,})?/;
        const unorderedListRegex = /\*/;
        const listRegex = new RegExp(`(${unorderedListRegex.source}|${orderedListRegex.source})`);

        const newline_indent: TRegex = [/\n( ){1,}/g, "Newline>Indent", { start: 1 }];
        const cite_indent: TRegex = [new RegExp(`(?<head>\>)( ){1,}`, "g"), "Cite>Indent", { useGroupStart: "head" }];
        const list_indent: TRegex = [new RegExp(`(?<head>${listRegex.source})( ){1,}`, "g"), "List>Indent", { useGroupStart: "head" }];

        const indent_unorderedList: TRegex = [
            new RegExp(`(?<head>( ){1,})${unorderedListRegex.source}`, "g"),
            "Indent>UnorderedList",
            { useGroupStart: "head" },
        ]; // x*
        const indent_orderedList: TRegex = [
            new RegExp(`(?<head>( ){1,})${orderedListRegex.source}`, "g"),
            "Indent>OrderedList",
            { useGroupStart: "head" },
        ]; // x1.
        // const cite_unorderedList: TRegex = [
        //     new RegExp(`(?<head>\>)${unorderedListRegex.source}`, "g"),
        //     "Cite>UnorderedList",
        //     { useGroupStart: "head" },
        // ]; // >*
        // const cite_orderedList: TRegex = [new RegExp(`(?<head>\>)${orderedListRegex.source}`, "g"), "Cite>OrderedList", { useGroupStart: "head" }]; // >1.

        const newline_cite: TRegex = [/(?<head>\n)\>/g, "Newline>Cite", { useGroupStart: "head" }]; //\n>
        const indent_cite: TRegex = [new RegExp("(?<head>( ){1,})>", "g"), "Indent>Cite", { useGroupStart: "head" }]; // x>
        const cite_cite: TRegex = [new RegExp(`(?<head>\>)\>`, "g"), "Cite>Cite", { useGroupStart: "head" }]; // >>
        const list_cite: TRegex = [new RegExp(`(?<head>${listRegex.source})\>`, "g"), "List>Cite", { useGroupStart: "head" }]; // *>

        const tableArgumentOpen: TRegex = [/(\||\>)\</g, "TableArgumentOpen", { start: 1 }];
        const tableArgumentClose: TRegex = [/(\w{1})\>/g, "TableArgumentClose", { start: 1 }];
        const mathTagOpen: TRegex = [/\<math\>/g, "MathTagOpen"];
        const mathTagClose: TRegex = [/\<\/math\>/g, "MathTagClose"];
        const quote: TRegex = [/\'/g, "Quote"];
        const underbar: TRegex = [/\_/g, "Underbar"];
        const tilde: TRegex = [/\~/g, "Tilde"];
        const carot: TRegex = [/\^/g, "Carot"];
        const comma: TRegex = [/\,/g, "Comma"];
        const hyphen: TRegex = [/\-/g, "Hyphen"];
        const escape: TRegex = [/\\/g, "Escape"];
        const newline: TRegex = [/[\n]/g, "Newline"];

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
            newline_indent,
            cite_indent,
            list_indent,
            indent_unorderedList,
            indent_orderedList,
            // cite_unorderedList,
            // cite_orderedList,
            newline_cite,
            indent_cite,
            cite_cite,
            list_cite,
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
            evaluateHolder(evaluator);
        }

        this.holderArray.sort((a, b) => a.range.start - b.range.start);
    }

    doParsing() {
        const groupperTuple: TGroupperTuple[] = [firstGroupper, middleGroupper, secondGroupper, thirdGroupper, fourthGroupper];

        for (const [mappedProcessor, groupper] of groupperTuple) {
            for (let index = 0; index < this.holderArray.length; index++) {
                const elem = this.holderArray[index];
                const props: IProcessorProps = { index, setIndex: (value: number) => (index = value) };
                const targetProcessors = mappedProcessor[elem.type];
                if (targetProcessors !== undefined) {
                    for (const targetProcessor of targetProcessors) {
                        targetProcessor.call(this, props);
                    }
                    continue;
                }
            }
            groupper.call(this);
            this.holderArray = this.holderArray.filter((v) => {
                if (v.ignore) {
                    v.group.forEach((group) => this.removeGroup({ group }));
                    return false;
                }
                return true;
            });
        }

        function excludeElement(array: IlIndent[]) {
            interface ModifiedIIndent {
                t: "x" | ">" | "*" | "1#" | "1";
                c: number;
                d: ModifiedIIndent[];
            }
            const output: ModifiedIIndent[] = [];
            for (let element of array) {
                let t: "x" | ">" | "*" | "1#" | "1" = element.type === "Indent" ? "x" : element.type === "Cite" ? ">" : element.type === "UnorderedList" ? "*" : element.type.startsWith("OrderedList-Ordered") ? "1#" : "1";
                output.push({ t: t, c: element.count, d: excludeElement(element.children) })
            }
            return output;
        }
        for (const [key, value] of Object.entries(this.parserStore.indentlikeTreeArray)) {
            console.log(key)
            console.log(util.inspect(value.data.map(v => excludeElement(v)), false, 10, true))
        }
        console.log(util.inspect(this.parserStore.indentlikeTreeArray, false, 4, true))
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
