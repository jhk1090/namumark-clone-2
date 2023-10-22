import { CommentElem, Elem, HeadingElem, LinkElem, MacroElem, RedirectElem, ULinkElem } from "./elem";
import { Range } from "./utils";

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: Elem[] = [];
    tempArray: Elem[] = [];
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
            this.wikiArray.push(new RedirectElem(new Range(match.index, redirectRegex.lastIndex)))
        }
    }

    processComment() {
        const commentRegex = /\n##[^\n]+/g
        let match;

        while ((match = commentRegex.exec(this.wikiText)) !== null) {
            this.wikiArray.push(new CommentElem(new Range(match.index + 1, commentRegex.lastIndex)))
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

            this.headingLevelAt[headingLevel - 1] += 1
            this.headingLevelAt.fill(0, headingLevel)
            const range = new Range(match.index + 1, headingRegex.lastIndex - 1);
            const availableRange = new Range(range.start + (headingLevel + 1), range.end - (headingLevel + 1));
            const splitedInner = inner.split(" ")
            const value = splitedInner.slice(1, splitedInner.length - 1).join(" ");

            this.wikiArray.push(new HeadingElem(value, range, availableRange, headingLevel, isHide === "#", [...this.headingLevelAt]));

            // \n== 제목1 ==\n== 제목2 ==가 있을때 \n== 제목1 ==\n을 감지후 == 제목2 ==\n가 감지되지 않음
            headingRegex.lastIndex -= 1;
        }
    }

    processMacro() {
        const macroRegex = /\[(?<name>[^[(\]]+)(?<argument>\((?<value>(?:(?!\)\])[^])+)?\))?\]/g;
        const validNoargMacroName = ["clearfix", "date", "datetime", "목차", "tableofcontents", "각주", "footnote", "br", "pagecount"]
        const validMacroName = ["anchor", "age", "dday", "youtube", "kakaotv", "nicovideo", "vimeo", "navertv", "pagecount", "math", "include"]
        type groupType = Record<"name" | "argument" | "value", string | undefined>;
        let match;

        while ((match = macroRegex.exec(this.wikiText)) !== null) {
            const _groups = match.groups as groupType;
            const macroName = (_groups["name"] as string).toLowerCase();
            const macroArgument = _groups["argument"] ?? "";
            if (macroArgument === "" && !(validNoargMacroName.includes(macroName))) {
                continue;
            }
            if (macroArgument !== "" && !(validMacroName.includes(macroName))) {
                continue;
            }
            const macroValue = _groups["value"] ?? null;
            const range = new Range(match.index, macroRegex.lastIndex);
            this.tempArray.push(new MacroElem(macroValue, macroName, range));
        }

        this.processTempArray();
    }

    processLink() {
        const linkRegex = /\[\[(?<linkTo>(?:(?!\[\[|\]\]|\||<|>).)+)(?:\|(?<displayAs>(?:(?!\[\[|\]\]|\|).)+)?)?\]\]/g;
        type groupType = Record<"linkTo" | "displayAs", string | undefined>;
        let match;

        while ((match = linkRegex.exec(this.wikiText)) !== null) {
            const _groups = match.groups as groupType;
            const linkTo = _groups["linkTo"] as string
            const displayAs = _groups["displayAs"] ?? null;
            const range = new Range(match.index, linkRegex.lastIndex);
            if (displayAs === null) {
                this.tempArray.push(new ULinkElem(linkTo, range));
            } else {
                const splitedFull = match[0].split("|");
                const preceded = splitedFull[0];
                const followed = "]]"
                // [[asdf|asdf]]
                const availableRange = new Range(range.start + preceded.length + 1, range.end - followed.length)
                this.tempArray.push(displayAs === null ? new ULinkElem(linkTo, range) : new LinkElem(linkTo, displayAs, range, availableRange))
            }
        }

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
            this.processComment();
            this.processHeading();
            console.log(this.wikiArray)
            this.processMacro();
            this.processLink();
        }

        console.log("asdf ====================================== asdf")
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