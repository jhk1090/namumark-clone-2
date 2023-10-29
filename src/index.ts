import { Range, seekEOL } from "./utils";
import { Elem, HeadingElem, HolderElem, HolderType } from "./elem"

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

    evaluateHolder(arr: [RegExp, HolderType] | [RegExp, HolderType, number |undefined] | [RegExp, HolderType, number | undefined, number | undefined]) {
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
        type StackedType = {[k in HolderType]: {holder: HolderElem, index: number}[][]}
        const stacked: StackedType = {} as StackedType
        const substringRange = (range: Range) => {
            return this.wikiText.substring(range.start, range.end)
        }
        const wikiTemp: Elem[] = [];

        const handleStacked = () => {    
            const pushElem = (holder: HolderElem, index: number) => {
                if (stacked[holder.type] === undefined) {
                    stacked[holder.type] = [];
                }
    
                let currentStacked = stacked[holder.type]
                let currentStackedLast = currentStacked.at(-1)
                const result = {holder, index}
                if (currentStackedLast === undefined) {
                    currentStacked.push([result])
                } else {
                    if (currentStackedLast.at(-1)?.holder.range.isAdjacent(holder.range)) {
                        currentStackedLast.push(result);
                    } else {
                        currentStacked.push([result])
                    }
                }
            }
    
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                pushElem(this.holderArray[idx], idx);
            }
        }
        const matchStacked = () => {
            for (const elem of stacked.HeadingOpen.flat()) {
                const openElem = elem.holder;
                // 같은 라인에 있는지 체크
                const openElemLine = this.eolHolderArray.find(v => v.range.isSame(openElem.eolRange)) 
                if (openElemLine === undefined || openElemLine.holders === null) {
                    continue;
                }
                const closeElem = openElemLine.holders.find(v => v.type === "HeadingClose")
                if (closeElem === undefined) {
                    continue;
                }

                // 같은 레벨인지 체크
                const openElemString = substringRange(openElem.range)
                const closeElemString = substringRange(closeElem.range)
                const startRegex = /^(?<level>={1,6})(?<hide>#)? $/g;
                const endRegex = /^ (?<hide>#)?(?<level>={1,6})$/g;
                const startGroup = startRegex.exec(openElemString)?.groups
                const endGroup = endRegex.exec(closeElemString)?.groups
                const isSameKind = startGroup?.level === endGroup?.level && startGroup?.hide === endGroup?.hide

                if (!isSameKind) {
                    continue;
                }
                // push
                const level = startGroup?.level.length ?? 0
                const isHidden = startGroup?.hide ? true : false

                this.headingLevelAt[level - 1] += 1;
                this.headingLevelAt.fill(0, level);

                wikiTemp.push(new HeadingElem(new Range(openElem.range.start, closeElem.range.end), level, isHidden, [...this.headingLevelAt]))
            }
            for (const elem of stacked.TripleBracketOpen) {
                const openElem = elem[0];
                const closeElem = stacked.TripleBracketClose.find(v => v.length !== 0 && v[0].index > openElem.index)
                if (closeElem === undefined) {
                    continue;
                }

                
            }
        }
        // const DEPR__matchStacked = () => {
        //     for (const elemArray of stacked.HeadingOpen) {
        //         const elem = elemArray[0];
        //         const headingCloseFlatted = stacked.HeadingClose.flat();

        //         // pair가 있는지 확인
        //         const foundPair = headingCloseFlatted.find(v => v.index > elem.index)
        //         if (foundPair === undefined) {
        //             continue;
        //         }
        //         // heading 맞추기
        //         const elemRange = findHolderElemRange(elem.uuid)
        //         const foundPairRange = findHolderElemRange(foundPair.uuid)
        //         const elemString = substringRange(elemRange)
        //         const foundPairString = substringRange(foundPairRange)

        //         const startRegex = /^(?<level>={1,6})(?<hide>#)? $/g;
        //         const endRegex = /^ (?<hide>#)?(?<level>={1,6})$/g;
        //         const startGroup = startRegex.exec(elemString)?.groups
        //         const endGroup = endRegex.exec(foundPairString)?.groups
        //         const isSameKind = startGroup?.level === endGroup?.level && startGroup?.hide === endGroup?.hide
                
        //         if (!isSameKind) {
        //             continue;
        //         }
        //         // \n 감지 todo
        //         const headingContentString = substringRange(new Range(elemRange.end, foundPairRange.start));
        //         if (headingContentString.indexOf("\n") !== -1) {
        //             continue;
        //         }

        //         const level = startGroup?.level.length ?? 0
        //         const isHidden = startGroup?.hide ? true : false

        //         this.headingLevelAt[level - 1] += 1;
        //         this.headingLevelAt.fill(0, level);

        //         wikiTemp.push(new HeadingElem(new Range(elemRange.start, foundPairRange.end), level, isHidden, [...this.headingLevelAt]))
        //     }
        //     type FlagType = "MacroOpen"
        //     const flag: {type: FlagType, index: number}[] = []
        //     for (const elemArray of stacked.SquareBracketOpen) {
        //         if (elemArray.length === 1) {
        //             flag.push({type: "MacroOpen", index: elemArray[0].index})
        //         }
        //     }
        // }
        handleStacked()
        matchStacked()
        // console.log(this.eolHolderArray)
        console.log(wikiTemp)
        // DEPR__matchStacked()
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.fillEolHolder()
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