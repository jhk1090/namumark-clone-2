import { Range } from "./utils";
import { v4 as uuidv4 } from "uuid";

export abstract class Elem {
    uuid: string = uuidv4();
    range: Range = new Range(0, 1);
    parentUUID: string | null = null;
    constructor(range: Range) {
        this.range = range;
    }
    setParent(uuid: string) { this.parentUUID = uuid }
}

export abstract class UnableChild extends Elem {}

export abstract class AbleChild extends Elem {}

export class HeadingElem extends AbleChild {
    headingLevel: number = 0;
    isHeadingHidden: boolean = false;
    haedingLevelAt: number[] = [];
    constructor(range: Range, headingLevel: number, isHeadingHidden: boolean, headingLevelAt: number[]) {
        super(range)
        this.headingLevel = headingLevel;
        this.isHeadingHidden = isHeadingHidden;
        this.haedingLevelAt = headingLevelAt;
    }
}

export type SyntaxLanguageType = "basic"| "cpp"| "csharp"| "css"| "erlang"| "go"| "html"| "java"| "javascript"| "json"| "kotlin"| "lisp"| "lua"| "markdown"| "objectivec"| "perl"| "php"| "powershell"| "python"| "ruby"| "rust"| "sh"| "sql"| "swift"| "typescript"| "xml" | ""

export class SyntaxBracketElem extends AbleChild {
    language: SyntaxLanguageType = "";
    constructor(range: Range, language: SyntaxLanguageType) {
        super(range)
        this.language = language;
    }
}

export class WikiBracketElem extends AbleChild {
    style: string | undefined = undefined;
    constructor(range: Range, style?: string) {
        super(range)
        this.style = style;
    }
}

export class FoldingBracketElem extends AbleChild {
    summary: string = ""
    constructor(range: Range, summary?: string) {
        super(range)
        this.summary = summary ?? "More";
    }
}

export class RawBracketElem extends AbleChild {
    constructor(range: Range) {
        super(range)
    }
}

type NumberRangeType = "1" | "2" | "3" | "4" | "5";
export type TextSizeType = `-${NumberRangeType}` | `+${NumberRangeType}` | ""
export class TextSizeBracketElem extends AbleChild {
    size: TextSizeType = ""
    constructor(range: Range, size: TextSizeType) {
        super(range)
        this.size = size;
    }
}

export class TextColorBracketElem extends AbleChild {
    primary: string = ""
    secondary?: string
    constructor(range: Range, primary: string, secondary?: string) {
        super(range)
        this.primary = primary;
        this.secondary = secondary;
    }
}

export type HolderType = "Pipe" /* TableCell, LinkPipe */ | "Comment" | "MacroArgumentOpen" | "MacroArgumentClose" | "SquareBracketOpen" /* LinkOpen, MacroOpen */ | "SquareBracketClose" /* LinkClose, MacroClose, FootnoteClose */ | "HeadingOpen" | "HeadingClose" | "TripleBracketOpen" | "TripleBracketClose" | "UnorderedList" | "OrderedList" | "Cite" | "FootnoteOpen" | "TableArgumentOpen" | "TableArgumentClose" | "MathTagOpen" | "MathTagClose" | "Quote" | "Underbar" | "Tilde" | "Carot" | "Comma" | "Hyphen" | ""

export class HolderElem {
    range: Range = new Range(0, 1);
    eolRange: Range = new Range(0, 1);
    type: HolderType = "";
    uuid: string = uuidv4();
    constructor(range: Range, eolRange: Range, type: HolderType) {
        this.range = range;
        this.eolRange = eolRange;
        this.type = type;
    }
}