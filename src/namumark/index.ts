import { Elem, HeadingElem, MacroElem, RedirectElem } from "./elem";
import { Range } from "./utils";

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    tempArray: Elem[] = [];
    headingLevel: number[] = [0, 0, 0, 0, 0, 0];

    constructor(wikiText: string) {
        // \n는 regex 방지용
        this.wikiText = "\n" + wikiText + "\n";
    }

    processRedirect() {
        const redirectRegex = /^\n#redirect ([^\n]+)/g
        const match = redirectRegex.exec(this.wikiText)
        if (match !== null) {
            this.isRedirect = true;
            this.wikiArray.push(new RedirectElem(new Range(match.index, match.index + match[0].length)))
        }
    }

    processHeading() {
        const headingRegex = /\n(?<inner>(?<level>={1,6})(?<isHide>#?) ?(?<remained>[^\n]+))\n/g
        type groupType = Record<"full" | "inner" | "level" | "isHide" | "remained", string>;
        let match;

        while ((match = headingRegex.exec(this.wikiText)) !== null) {
            const _groups = match.groups as groupType;
            const inner = _groups["inner"];
            const level = _groups["level"];
            const headingLevel = level.length;
            const isHide = _groups["isHide"];
            const remained = _groups["remained"];

            // heading verification
            const splitedRemained = remained.split(" ")
            const lastRemained = splitedRemained[splitedRemained.length - 1];
            if (lastRemained !== isHide + level) {
                continue;
            }

            this.headingLevel[headingLevel - 1] += 1
            this.headingLevel.fill(0, headingLevel)
            const range = new Range(match.index - 1, headingRegex.lastIndex - 1);
            const availableRange = new Range(range.start + (headingLevel + 2), range.end - (headingLevel + 2));
            const splitedInner = inner.split(" ")
            const value = splitedInner.slice(1, splitedInner.length - 1).join(" ");

            this.wikiArray.push(new HeadingElem(value, range, availableRange, headingLevel, [...this.headingLevel]));
        }
    }

    processMacro() {
        const macroRegex = /\[(?<name>[^[(\]]+)\((?<value>[^\)\]]+)\)\]/g;
        const macroNoargValidNameRegex = /(clearfix|date|datetime|목차|tableofcontents|각주|footnote|br|pagecount)/g
        const validMacroName = ["anchor", "age", "dday", "youtube", "kakaotv", "nicovideo", "vimeo", "navertv", "pagecount", "math"]
        type groupType = Record<"name" | "value", string>;
        let match;

        while ((match = macroRegex.exec(this.wikiText)) !== null) {
            const _groups = match.groups as groupType;
            const macroName = _groups["name"].toLowerCase();
            if (!(validMacroName.includes(macroName))) {
                continue;
            }
            const macroValue = _groups["value"];
            const range = new Range(match.index - 1, macroRegex.lastIndex - 1);
            this.tempArray.push(new MacroElem(macroValue, macroName, range));
        }
        console.log(this.wikiArray)
        console.log(this.tempArray)
        this.processTempArray();
    }

    processTempArray() {
        for (const tempElem of this.tempArray) {
            this.wikiArray = tempElem.flushArr(this.wikiArray)
            this.sortWikiArray();
        }
        this.tempArray = [];
    }

    sortWikiArray() {
        this.wikiArray.sort((a, b) => a.range.start - b.range.start)
    }

    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.processHeading();
            this.processMacro();
        }

        console.log("========================")
        console.log(this.wikiArray)
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