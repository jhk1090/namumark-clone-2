import { Range } from "./utils";
import { Elem, HeadingElem, HolderElem, holderType } from "./elem"

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
        type StackedType = {[k in holderType]: {uuid: string, index: number}[][]}
        const stacked: StackedType = {} as StackedType
        const uuidifyHolderArray = this.holderArray.map(v => v.uuid);
        const findHolderElem = (uuid: string) => {
            return this.holderArray.find(v => v.uuid === uuid) as HolderElem
        }
        const findHolderElemRange = (uuid: string) => {
            return findHolderElem(uuid).range
        }
        const substringRange = (range: Range) => {
            return this.wikiText.substring(range.start, range.end)
        }
        const wikiTemp: Elem[] = [];

        const handleStacked = () => {    
            const pushElem = (holder: HolderElem) => {
                if (stacked[holder.type] === undefined) {
                    stacked[holder.type] = [];
                }
    
                let currentStacked = stacked[holder.type]
                let currentStackedLast = currentStacked.at(-1)
                const result = {uuid: holder.uuid, index: uuidifyHolderArray.findIndex(v => v === holder.uuid)}
                if (currentStackedLast === undefined) {
                    currentStacked.push([result])
                } else {
                    if (findHolderElemRange(currentStackedLast.at(-1)?.uuid as string).compare(holder.range).status === "ADJACENT") {
                        currentStackedLast.push(result)
                    } else {
                        currentStacked.push([result])
                    }
                }
            }
    
            for (const holder of this.holderArray) {
                pushElem(holder);
            }
        }
        const matchStacked = () => {
            for (const elemArray of stacked.HeadingOpen) {
                const elem = elemArray[0];
                const headingCloseFlatted = stacked.HeadingClose.flat();

                // pair가 있는지 확인
                const foundPair = headingCloseFlatted.find(v => v.index > elem.index)
                if (foundPair === undefined) {
                    continue;
                }
                // heading 맞추기
                const elemRange = findHolderElemRange(elem.uuid)
                const foundPairRange = findHolderElemRange(foundPair.uuid)
                const elemString = substringRange(elemRange)
                const foundPairString = substringRange(foundPairRange)

                const startRegex = /^(?<level>={1,6})(?<hide>#)? $/g;
                const endRegex = /^ (?<hide>#)?(?<level>={1,6})$/g;
                const startGroup = startRegex.exec(elemString)?.groups
                const endGroup = endRegex.exec(foundPairString)?.groups
                const isSameKind = startGroup?.level === endGroup?.level && startGroup?.hide === endGroup?.hide
                
                if (!isSameKind) {
                    continue;
                }
                // \n 감지 todo
                const headingContentString = substringRange(new Range(elemRange.end, foundPairRange.start));
                if (headingContentString.indexOf("\n") !== -1) {
                    continue;
                }

                const level = startGroup?.level.length ?? 0
                const isHidden = startGroup?.hide ? true : false

                this.headingLevelAt[level - 1] += 1;
                this.headingLevelAt.fill(0, level);

                wikiTemp.push(new HeadingElem(new Range(elemRange.start, foundPairRange.end), level, isHidden, [...this.headingLevelAt]))
            }
        }

        
        handleStacked()
        matchStacked()
        
        console.log(wikiTemp)
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.collectHolderElem()
            this.parseHolderElem()
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