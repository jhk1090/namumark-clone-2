import { Range, seekEOL } from "./utils";
import { CommentElem, Elem, FoldingBracketElem, HeadingElem, HolderElem, HolderType, HtmlBracketElem, ParenthesisElem, RawBracketElem, SyntaxBracketElem, SyntaxLanguageType, TextColorBracketElem, TextSizeBracketElem, TextSizeType, WikiBracketElem } from "./elem"

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
        const macroArgumentOpen: offsetNone = [/\(/g, "ParenthesisOpen"];
        const macroArgumentClose: offsetNone = [/\)/g, "ParenthesisClose"];
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
        type HolderIndexType = {holder: HolderElem, index: number};
        type StackedType = {[k in HolderType]: (HolderIndexType[] | undefined)}
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
                
                let currentStacked = stacked[holder.type] ?? [];
                currentStacked.push({holder, index})
            }
    
            for (let idx = 0; idx < this.holderArray.length; idx++) {
                pushElem(this.holderArray[idx], idx);
            }
        }
        const matchStacked = () => {
            const commentMatch = () => {
                if (stacked.Comment === undefined) {
                    return;
                }

                for (const elem of stacked.Comment) {
                    wikiTemp.push(new CommentElem({ range: elem.holder.range }))
                }
            }
            const headingMatch = () => {
                if (stacked.HeadingOpen === undefined || stacked.HeadingClose === undefined) {
                    return;
                }

                for (const elem of stacked.HeadingOpen) {
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
    
                    wikiTemp.push(
                        new HeadingElem({
                            range: new Range(openElem.range.start, closeElem.range.end),
                            headingLevel: level,
                            isHeadingHidden: isHidden,
                            headingLevelAt: [...this.headingLevelAt],
                        })
                    );
                }
            }

            const tripleBracketMatch = () => {
                if (stacked.TripleBracketOpen === undefined || stacked.TripleBracketClose === undefined) {
                    return;
                }
                
                let pairs: [[HolderIndexType, HolderIndexType]] | undefined; // [open, close]
                let tripleBracketTemp: Elem[] = [];

                const doPairing = () => {
                    if (stacked.TripleBracketOpen === undefined || stacked.TripleBracketClose === undefined) {
                        return;
                    }

                    const concattedArray = [...stacked.TripleBracketOpen, ...stacked.TripleBracketClose].sort((a, b) => a.index - b.index);
                    let openStack: HolderIndexType[] = [];
                    let closeStack: HolderIndexType[] = [];

                    const fillPair = () => {
                        const reversedOpenStack = openStack.toReversed();
                        let i = 0;
                        for (; i < closeStack.length; i++) {
                            if (reversedOpenStack[i] === undefined) {
                                closeStack = [];
                                break;
                            }
                            if (pairs === undefined) {
                                pairs = [[reversedOpenStack[i], closeStack[i]]];
                            } else {
                                pairs.push([reversedOpenStack[i], closeStack[i]]);
                            }
                        }
                        // clean
                        while (i !== 0) {
                            openStack.pop();
                            closeStack.splice(0, 1);
                            i--;
                        }
                    };

                    for (const concattedElem of concattedArray) {
                        if (concattedElem.holder.type === "TripleBracketOpen") {
                            if (closeStack.length !== 0) {
                                fillPair();
                            }
                            openStack.push(concattedElem);
                        }
                        if (concattedElem.holder.type === "TripleBracketClose") {
                            closeStack.push(concattedElem);
                        }
                    }

                    fillPair();
                };
                const decideElemType = () => {
                    if (pairs === undefined) {
                        return;
                    }

                    for (const pair of pairs) {
                        const [openElem, closeElem] = pair;

                        // texteffect, wiki, folding, syntax, raw, html
                        const syntaxRegex =
                            /^{{{#!syntax (?<lang>basic|cpp|csharp|css|erlang|go|html|java(?:script)?|json|kotlin|lisp|lua|markdown|objectivec|perl|php|powershell|python|ruby|rust|sh|sql|swift|typescript|xml)/g;
                        const textSizeRegex = /^{{{(?<size>(?:\+|-)(?:[1-5]))/g;
                        const cssColor =
                            "black|gray|grey|silver|white|red|maroon|yellow|olive|lime|green|aqua|cyan|teal|blue|navy|magenta|fuchsia|purple|dimgray|dimgrey|darkgray|darkgrey|lightgray|lightgrey|gainsboro|whitesmoke|brown|darkred|firebrick|indianred|lightcoral|rosybrown|snow|mistyrose|salmon|tomato|darksalmon|coral|orangered|lightsalmon|sienna|seashell|chocolate|saddlebrown|sandybrown|peachpuff|peru|linen|bisque|darkorange|burlywood|anaatiquewhite|tan|navajowhite|blanchedalmond|papayawhip|moccasin|orange|wheat|oldlace|floralwhite|darkgoldenrod|goldenrod|cornsilk|gold|khaki|lemonchiffon|palegoldenrod|darkkhaki|beige|ivory|lightgoldenrodyellow|lightyellow|olivedrab|yellowgreen|darkolivegreen|greenyellow|chartreuse|lawngreen|darkgreen|darkseagreen|forestgreen|honeydew|lightgreen|limegreen|palegreen|seagreen|mediumseagreen|springgreen|mintcream|mediumspringgreen|mediumaquamarine|aquamarine|turquoise|lightseagreen|mediumturquoise|azure|darkcyan|darkslategray|darkslategrey|lightcyan|paleturquoise|darkturquoise|cadetblue|powderblue|lightblue|deepskyblue|skyblue|lightskyblue|steelblue|aliceblue|dodgerblue|lightslategray|lightslategrey|slategray|slategrey|lightsteelblue|comflowerblue|royalblue|darkblue|ghostwhite|lavender|mediumblue|midnightblue|slateblue|darkslateblue|mediumslateblue|mediumpurple|rebeccapurple|blueviolet|indigo|darkorchid|darkviolet|mediumorchid|darkmagenta|plum|thistle|violet|orchid|mediumvioletred|deeppink|hotpink|lavenderblush|palevioletred|crimson|pink|lightpink";
                        const hexCode = "(?:[0-9a-fA-F]{3}){1,2}";
                        const textColorRegex = new RegExp(
                            `^(?<primary>#(${cssColor}|${hexCode}))(?:\,(?<secondary>#(${cssColor}|${hexCode})))?`,
                            "g"
                        );
                        const htmlRegex = /^{{{#!html/g;
                        const foldingRegex = /^{{{#!folding(?<summary>.+)?/g;
                        const wikiRegex = /^{{{#!wiki(?:(.+)?style="(?<style>[^"]+)?")?/g;
                        // otherwise, just raw

                        const targetedString = substringRange(new Range(openElem.holder.range.start, openElem.holder.eolRange.end));
                        const resultRange = new Range(openElem.holder.range.start, closeElem.holder.range.end);

                        const syntaxExecResult = syntaxRegex.exec(targetedString);
                        const textSizeExecResult = textSizeRegex.exec(targetedString);
                        const textColorExecResult = textColorRegex.exec(targetedString);
                        const htmlExecResult = htmlRegex.exec(targetedString);
                        const foldingExecResult = foldingRegex.exec(targetedString);
                        const wikiExecResult = wikiRegex.exec(targetedString);
                        const isMultiline = !openElem.holder.eolRange.isSame(closeElem.holder.eolRange);
                        const defaultProvider = { range: resultRange, isMultiline };

                        if (syntaxExecResult !== null) {
                            tripleBracketTemp.push(
                                new SyntaxBracketElem({ ...defaultProvider, language: syntaxExecResult.groups?.lang as SyntaxLanguageType })
                            );
                            continue;
                        }
                        if (textSizeExecResult !== null) {
                            tripleBracketTemp.push(new TextSizeBracketElem({ ...defaultProvider, size: textSizeExecResult.groups?.size as TextSizeType }));
                            continue;
                        }

                        if (textColorExecResult !== null) {
                            tripleBracketTemp.push(
                                new TextColorBracketElem({
                                    ...defaultProvider,
                                    primary: textColorExecResult.groups?.primary as string,
                                    secondary: textColorExecResult.groups?.secondary,
                                })
                            );
                            continue;
                        }

                        if (htmlExecResult !== null) {
                            tripleBracketTemp.push(new HtmlBracketElem({ ...defaultProvider }));
                            continue;
                        }

                        if (foldingExecResult !== null && isMultiline) {
                            tripleBracketTemp.push(new FoldingBracketElem({ ...defaultProvider, summary: foldingExecResult.groups?.summary }));
                            continue;
                        }

                        if (wikiExecResult !== null && isMultiline) {
                            tripleBracketTemp.push(new WikiBracketElem({ ...defaultProvider, style: wikiExecResult.groups?.style }));
                            continue;
                        }

                        tripleBracketTemp.push(new RawBracketElem({ ...defaultProvider }));
                    }
                };
                /* const checkCollision = () => {
                    const excludeIndices: number[] = [];
                    for (const [i, outerElem] of tripleBracketTemp.entries()) {
                        if (outerElem instanceof SyntaxBracketElem || outerElem instanceof HtmlBracketElem || outerElem instanceof RawBracketElem) {
                            for (const [j, innerElem] of tripleBracketTemp.entries()) {
                                if (innerElem.range.isSame(outerElem.range)) continue;
                                if (excludeIndices.includes(j)) continue;
                                if (innerElem.range.isContainedIn(outerElem.range)) {
                                    excludeIndices.push(j)
                                }
                            }
                        }
                    }
                    tripleBracketTemp = tripleBracketTemp.filter((_, index) => !excludeIndices.includes(index))
                } */

                doPairing()
                decideElemType()
                // checkCollision()
                wikiTemp.push(...tripleBracketTemp)
            }

            const parenthesisMatch = () => {
                if (stacked.ParenthesisOpen === undefined || stacked.ParenthesisClose === undefined) {
                    return;
                }

                let pairs: [[HolderIndexType, HolderIndexType]] | undefined;
                let parenthesisTemp: Elem[] = [];

                const doPairing = () => {
                    if (stacked.ParenthesisOpen === undefined || stacked.ParenthesisClose === undefined) {
                        return;
                    }

                    const concattedArray = [...stacked.ParenthesisOpen, ...stacked.ParenthesisClose].sort((a, b) => a.index - b.index);
                    let openStack: HolderIndexType[] = [];
                    let closeStack: HolderIndexType[] = [];

                    const fillPair = () => {
                        const reversedOpenStack = openStack.toReversed();
                        let i = 0;
                        for (; i < closeStack.length; i++) {
                            if (reversedOpenStack[i] === undefined) {
                                closeStack = [];
                                break;
                            }
                            if (pairs === undefined) {
                                pairs = [[reversedOpenStack[i], closeStack[i]]];
                            } else {
                                pairs.push([reversedOpenStack[i], closeStack[i]])
                            }
                        }

                        while (i !== 0) {
                            openStack.pop();
                            closeStack.splice(0, 1);
                            i--;
                        }
                    }

                    for (const concattedElem of concattedArray) {
                        if (concattedElem.holder.type === "ParenthesisOpen") {
                            if (closeStack.length !== 0) {
                                fillPair();
                            }
                            openStack.push(concattedElem);
                        }
                        if (concattedElem.holder.type === "ParenthesisClose") {
                            closeStack.push(concattedElem);
                        }
                    }

                    fillPair();
                }
                const decideElemType = () => {
                    if (pairs === undefined) {
                        return;
                    }

                    for (const pair of pairs) {
                        const [openElem, closeElem] = pair;
                        const resultRange = new Range(openElem.holder.range.start, closeElem.holder.range.end);
                        const isMultiline = !openElem.holder.eolRange.isSame(closeElem.holder.eolRange);
                        const defaultProvider = { range: resultRange, isMultiline };
                        parenthesisTemp.push(new ParenthesisElem({ ...defaultProvider }))
                    }
                }
                doPairing();
                decideElemType();

                wikiTemp.push(...parenthesisTemp)
            }

            commentMatch();
            headingMatch();
            tripleBracketMatch();
            parenthesisMatch();
        }

        handleStacked()
        matchStacked()
        console.log(wikiTemp)
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