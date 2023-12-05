import { Range, seekEOL } from "./utils";
import { TripleBracketContentGroup, TripleBracketGroup, CommentElem, ContentGroup, Elem, FoldingBracketElem, Group, HeadingElem, HolderElem, HolderType, HtmlBracketElem, ParenthesisElem, RawBracketElem, SyntaxBracketElem, SyntaxLanguageType, TextColorBracketElem, TextSizeBracketElem, TextSizeType, WikiBracketElem, SquareBracketGroup, DoubleSquareBracketGroup, SingleSquareBracketGroup } from "./elem"
const util = require("node:util");

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    holderArray: HolderElem[] = [];
    eolHolderArray: { range: Range; holders: HolderElem[] | null }[] = [];
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

    fillEolHolder() {
        let offset = 0
        while (true) {
            const result = seekEOL(this.wikiText, offset)
            if (result === -1) {
                break;
            } else {
                this.eolHolderArray.push({range: new Range(offset, result + 1), holders: null})
                offset = result + 1;
            }
        }
    }

    evaluateHolder(arr: [RegExp, HolderType, number?, number?]) {
        let [regex, type, offsetStart, offsetEnd] = arr;
        offsetStart = offsetStart ?? 0
        offsetEnd = offsetEnd ?? 0

        let match;

        while ((match = regex.exec(this.wikiText)) !== null) {
            let target;
            let targetRange = new Range(match.index + offsetStart, regex.lastIndex + offsetEnd)
            for (const eol of this.eolHolderArray) {
                if (targetRange.isContainedIn(eol.range)) {
                    target = new HolderElem(targetRange, eol.range, type)
                    if (eol.holders === null) {
                        eol.holders = [target]
                    } else {
                        eol.holders.push(target)
                    }
                    break;
                }
            }
            this.holderArray.push(target as HolderElem)
        }
    }

    collectHolderElem() {
        type offset = number | undefined;
        type offsetNone = [RegExp, HolderType]
        type offsetOnlyStart = [RegExp, HolderType, offset]
        type offsetBoth = [RegExp, HolderType, offset, offset]
        // linkpipe, tablecell
        const pipe: offsetNone = [/\|/g, "Pipe"]
        const comment: offsetOnlyStart = [/\n##[^\n]+/g, "Comment", 1]
        // linkOpen, macroOpen
        const squareBracketOpen: offsetNone = [/\[/g, "SquareBracketOpen"];
        // footnoteclose, linkclose, macroclose
        const squareBracketClose: offsetNone = [/\]/g, "SquareBracketClose"];
        const macroArgumentOpen: offsetNone = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: offsetNone = [/\)/g, "ParenthesisClose"];
        const headingOpen: offsetOnlyStart = [/\n={1,6}(#?) /g, "HeadingOpen", 1];
        const headingClose: offsetBoth = [/ (#?)={1,6}\n/g, "HeadingClose", undefined, -1];
        const tripleBracketOpen: offsetNone = [/\{\{\{/g, "TripleBracketOpen"];
        const tripleBracketClose: offsetNone = [/\}\}\}/g, "TripleBracketClose"]
        const unorderedList: offsetOnlyStart = [/\n( ){1,}\*/g, "UnorderedList", 1]
        const orderedList: offsetOnlyStart = [/\n( ){1,}(1|a|A|i|I)\.(\#\d)?/g, "OrderedList", 1]
        const cite: offsetOnlyStart = [/\n>{1,}/g, "Cite", 1]
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
        const escape: offsetNone = [/\\/g, "Escape"]
        const newline: offsetNone = [/[\n]/g, "Newline"]

        const evaluators = [pipe, comment, squareBracketOpen, squareBracketClose, macroArgumentOpen, macroArgumentClose, headingOpen, headingClose, tripleBracketOpen, tripleBracketClose, unorderedList, orderedList, cite, tableArgumentOpen, tableArgumentClose, mathTagOpen, mathTagClose, quote, underbar, tilde, carot, comma, hyphen, escape, newline]
        
        for (const evaluator of evaluators) {
            this.evaluateHolder(evaluator)
        }

        this.holderArray.sort((a, b) => a.range.start - b.range.start)
    }

    doParsing() {
        const tripleBracketQueue: HolderElem[] = [];
        let squareBracketArray: { value: HolderElem[], max: number }[] = [];
        for (let idx = 0; idx < this.holderArray.length; idx++) {
            const elem = this.holderArray[idx]
            const next = this.holderArray[idx + 1]
            if (elem.type === "Escape") {
                if (next.type === "Newline") {
                    continue;
                }
                if (elem.range.isAdjacent(next.range)) {
                    const group = new (next.type === "TripleBracketOpen" ? TripleBracketContentGroup : ContentGroup)();
                    elem.group = group;
                    next.group = group;

                    // 다음 text 건너뛰기
                    if (next.type === "TripleBracketClose" || next.type === "TripleBracketOpen") {
                        continue;
                    }

                    idx += 1;
                }
                continue;
            }
            if (elem.type === "TripleBracketOpen") {
                tripleBracketQueue.push(elem)
                continue;
            }
            if (elem.type === "TripleBracketClose") {
                const lastItem = tripleBracketQueue.pop();
                if (lastItem === undefined) {
                    elem.isObsolete = true;
                    continue;
                }
                
                const lastItemOrigin = this.holderArray.findIndex(v => v.uuid === lastItem.uuid)
                
                const group: Group = (lastItem.group ?? new TripleBracketGroup())
                elem.group = group;
                this.holderArray[lastItemOrigin].group = group;
                continue;
            }
            if (elem.type === "SquareBracketOpen") {
                const adjBrackets = [elem];
                let lastRange: Range = elem.range;
                let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
                for (const subElem of this.holderArray.slice(idx + 1)) {
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

                squareBracketArray.push({ value: adjBrackets, max: 0 })
                // 인접한 bracket은 pass해도 됨
                idx += adjBrackets.length - 1;
                continue;
            }
            if (elem.type === "SquareBracketClose") {
                const adjBrackets = [elem];
                let lastRange: Range = elem.range;
                let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
                for (const subElem of this.holderArray.slice(idx + 1)) {
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
                    adjBrackets.forEach(v => v.isObsolete = true);
                    // 인접한 bracket은 pass해도 됨
                    idx += adjBrackets.length - 1;
                    continue;
                }

                for (const [index, bracket] of squareBracketArray.entries()) {
                    if (bracket.value[0].eolRange === adjBrackets[0].eolRange) {
                        if (adjBrackets.length > bracket.max) {
                            bracket.max = adjBrackets.length;
                            const group: Group = new (bracket.value.length >= 2 && bracket.max >= 2 ? DoubleSquareBracketGroup : SingleSquareBracketGroup)()
                            if (bracket.value.length >= 2 && bracket.max >= 2) {
                                adjBrackets[0].group = group;
                                adjBrackets[1].group = group;
                                bracket.value[0].group = group;
                                bracket.value[1].group = group;
                            } else {
                                adjBrackets[0].group = group;
                                bracket.value[0].group = group;
                            }
                        } else {
                            continue;
                        }
        
                        if (bracket.value.length >= 2 && bracket.max >= 2 || bracket.value.length === 1 && bracket.max >= 1) {
                            squareBracketArray = squareBracketArray.filter(v => v.value[0].range.start > adjBrackets[0].range.start)
                            break;
                        }
                    } else {
                        continue;
                        // const firstPipe = this.holderArray.slice(this.holderArray.findIndex(v => v.uuid === correspondBracket[0].uuid), this.holderArray.findIndex(v => v.uuid === adjBrackets[0].uuid)).find(v => v.type === "Pipe")
                        // if (firstPipe === undefined) {
                        //     adjBrackets.forEach(v => v.isObsolete = true);
                        //     // 인접한 bracket은 pass해도 됨
                        //     idx += adjBrackets.length - 1;
                        //     continue;
                        // }
                    }
                }

                // 인접한 bracket은 pass해도 됨
                idx += adjBrackets.length - 1;
                continue;
            }
        }
        console.log(this.holderArray)
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.fillEolHolder()
            this.collectHolderElem()
            this.doParsing()
        }

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