import { Range } from "./utils";

export class NamuMark {
    wikiText: string = "";
    isRedirect: boolean = false;
    wikiArray: any[] = [];
    tempArray: any[] = [];

    constructor(wikiText: string) {
        // \n는 regex 방지용
        this.wikiText = "\n" + wikiText + "\n";
    }

    processRedirect() {
        const redirectRegex = /^\n#redirect ([^\n]+)/g
        const match = redirectRegex.exec(this.wikiText)
        if (match !== null) {
            this.isRedirect = true;
            const value = match[1];
            this.wikiArray.push({ type: "redirect", value })
        }
    }

    processHeading() {
        const headingRegex = /\n(= [^\n]+ =|== [^\n]+ ==|=== [^\n]+ ===|==== [^\n]+ ====|===== [^\n]+ =====|====== [^\n]+ ======|=# [^\n]+ #=|==# [^\n]+ #==|===# [^\n]+ #===|====# [^\n]+ #====|=====# [^\n]+ #=====|======# [^\n]+ #======)\n/g
        const headingSubRegex = /^(={1,6}#?) ?(.+)/g
        let match;

        while ((match = headingRegex.exec(this.wikiText)) !== null) {
            headingSubRegex.lastIndex = 0;

            const value = match[1];
            // headingLength == headingLength + space
            const headingLength = (headingSubRegex.exec(value) as RegExpExecArray)[1].length + 1
            const range = new Range(match.index, match.index + value.length - 1);
            const availableRange = new Range(range.start + headingLength, range.end - headingLength);
            this.wikiArray.push({ type: "heading", value, range, availableRange });
        }
    }
    parse() {
        this.processRedirect();
        if (this.isRedirect === false) {
            this.processHeading();
        }
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