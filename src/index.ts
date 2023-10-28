import { Range } from "./utils";
import { Elem, HolderElem, holderType } from "./elem"

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    holderArray: HolderElem[] = [];
    headingLevelAt: number[] = [0, 0, 0, 0, 0, 0];

    constructor(wikiText: string) {
        // \n는 regex 방지용
        this.wikiText = "\n" + wikiText + "\n";
    }

    processRedirect() {
        const redirectRegex = /^\n#redirect ([^\n]+)/g
        const match = redirectRegex.exec(this.wikiText)
        if (match !== null) {
            this.isRedirect = true;
        }
    }

    evaluateHolder(arr: [RegExp, holderType] | [RegExp, holderType, number |undefined] | [RegExp, holderType, number | undefined, number | undefined]) {
        let [regex, type, offsetStart, offsetEnd] = arr;
        offsetStart = offsetStart ?? 0
        offsetEnd = offsetEnd ?? 0

        let match;
        while ((match = regex.exec(this.wikiText)) !== null) {
            this.holderArray.push(new HolderElem(new Range(match.index + offsetStart, regex.lastIndex + offsetEnd), type))
        }
    }

    collectHolderElem() {
        type offset = number | undefined;
        type offsetNone = [RegExp, holderType]
        type offsetOnlyStart = [RegExp, holderType, offset]
        type offsetBoth = [RegExp, holderType, offset, offset]
        // linkpipe, tablecell
        const pipe: offsetNone = [/\|/g, "Pipe"]
        const comment: offsetOnlyStart = [/\n##[^\n]+/g, "Comment", 1]
        // linkOpen, macroOpen
        const squareBracketOpen: offsetNone = [/\[/g, "SquareBracketOpen"];
        // footnoteclose, linkclose, macroclose
        const squareBracketClose: offsetNone = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: offsetNone = [/\(/g, "MacroArgumentOpen"];
        const macroArgumentClose: offsetNone = [/\)/g, "MacroArgumentClose"];
        const headingOpen: offsetOnlyStart = [/\n={1,6}(#?) /g, "HeadingOpen", 1];
        const headingClose: offsetBoth = [/ (#?)={1,6}\n/g, "HeadingClose", undefined, -1];
        const tripleBracketOpen: offsetNone = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: offsetNone = [/\}\}\}/g, "TripleBracketClose"]
        const unorderedList: offsetOnlyStart = [/\n( ){1,}\*/g, "UnorderedList", 1]
        const orderedList: offsetOnlyStart = [/\n( ){1,}(1|a|A|i|I)\.(\#\d)?/g, "OrderedList", 1]
        const cite: offsetOnlyStart = [/\n>{1,}/g, "Cite", 1]
        const footnoteOpen: offsetNone = [/\[\*/g, "FootnoteOpen"]
        const tableArgumentOpen: offsetNone = [/\</g, "TableArgumentOpen"]
        const tableArgumentClose: offsetNone = [/\</g, "TableArgumentClose"]
        const mathTagOpen: offsetNone = [/\<math\>/g, "MathTagOpen"]
        const mathTagClose: offsetNone = [/\<\/math\>/g, "MathTagClose"]
        const quote: offsetNone = [/\'/g, "Quote"]
        const underbar: offsetNone = [/\_/g, "Underbar"]
        const tilde: offsetNone = [/\~/g, "Tilde"]
        const carot: offsetNone = [/\^/g, "Carot"]
        const comma: offsetNone = [/\,/g, "Comma"]
        const hyphen: offsetNone = [/\-/g, "Hyphen"]

        const evaluators = [pipe, comment, squareBracketOpen, squareBracketClose, macroArgumentOpen, macroArgumentClose, headingOpen, headingClose, tripleBracketOpen, tripleBracketClose, unorderedList, orderedList, cite, footnoteOpen, tableArgumentOpen, tableArgumentClose, mathTagOpen, mathTagClose, quote, underbar, tilde, carot, comma, hyphen]
        
        for (const evaluator of evaluators) {
            this.evaluateHolder(evaluator)
        }

        this.holderArray.sort((a, b) => a.range.start - b.range.start)
    }

    parseHolderElem() {
        const events: HolderElem[] = [];

        for (const holder of this.holderArray) {
            const lastEvent = events[events.length - 1];

            if (holder.type === "SquareBracketOpen") {
                events.push(holder)
            }
            if (holder.type === "MacroArgumentOpen") {
                if (lastEvent.type === "SquareBracketOpen") {
                    events.push(holder)
                }
            }
            if (holder.type === "MacroArgumentClose") {
                const result = events.findLastIndex(v => v.type === "MacroArgumentOpen")
                if (result !== -1) {
                    events.push(holder)
                }
            }
            if (holder.type === "SquareBracketClose") {
                
            }
        }
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.collectHolderElem()
        }

        console.log("asdf ====================================== asdf")
        console.log(this.holderArray)

        return `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <link rel="stylesheet" href="viewStyle.css">
        </head>
        <body><script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script></body>
        </html>`;
    }
}