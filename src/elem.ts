import { Range } from "./utils";
import { v4 as uuidv4 } from "uuid";

export abstract class Elem {
    uuid: string = uuidv4();
    range: Range = new Range(0, 1);
    parentUUID: string | null = null;
    isMultiline: boolean = false;
    constructor(range: Range, isMultiline: boolean) {
        this.range = range;
        this.isMultiline = isMultiline;
    }
    setParent(uuid: string) { this.parentUUID = uuid }
}

export abstract class UnableChild extends Elem {}

export abstract class AbleChild extends Elem {}

interface ICommentElem {
    range: Range;
}


export class CommentElem extends UnableChild {
    constructor(groups: ICommentElem) {
        super(groups.range, false)
    }
}

interface IHeadingElem {
    range: Range;
    headingLevel: number;
    isHeadingHidden: boolean;
    headingLevelAt: number[];
}
export class HeadingElem extends AbleChild {
    headingLevel: number = 0;
    isHeadingHidden: boolean = false;
    haedingLevelAt: number[] = [];
    constructor(groups: IHeadingElem) {
        super(groups.range, false)
        this.headingLevel = groups.headingLevel;
        this.isHeadingHidden = groups.isHeadingHidden;
        this.haedingLevelAt = groups.headingLevelAt;
    }
}

interface IBracketElem {
    range: Range;
    isMultiline: boolean;
}

export type SyntaxLanguageType = "basic"| "cpp"| "csharp"| "css"| "erlang"| "go"| "html"| "java"| "javascript"| "json"| "kotlin"| "lisp"| "lua"| "markdown"| "objectivec"| "perl"| "php"| "powershell"| "python"| "ruby"| "rust"| "sh"| "sql"| "swift"| "typescript"| "xml" | ""
export class SyntaxBracketElem extends AbleChild {
    language: SyntaxLanguageType = "";
    constructor(groups: IBracketElem & { language: SyntaxLanguageType }) {
        super(groups.range, groups.isMultiline)
        this.language = groups.language;
    }
}

export class WikiBracketElem extends AbleChild {
    style: string | undefined = undefined;
    constructor(groups: IBracketElem & { style?: string }) {
        super(groups.range, groups.isMultiline)
        this.style = groups.style;
    }
}

export class FoldingBracketElem extends AbleChild {
    summary: string = ""
    constructor(groups: IBracketElem & { summary?: string }) {
        super(groups.range, groups.isMultiline)
        this.summary = groups.summary ?? "More";
    }
}

export class HtmlBracketElem extends AbleChild {
    constructor(groups: IBracketElem) {
        super(groups.range, groups.isMultiline)
    }
}

export class RawBracketElem extends AbleChild {
    constructor(groups: IBracketElem) {
        super(groups.range, groups.isMultiline)
    }
}

export abstract class TextEffectBracketElem extends AbleChild {}

type NumberRangeType = "1" | "2" | "3" | "4" | "5";
export type TextSizeType = `-${NumberRangeType}` | `+${NumberRangeType}` | ""
export class TextSizeBracketElem extends TextEffectBracketElem {
    size: TextSizeType = ""
    constructor(groups: IBracketElem & { size: TextSizeType }) {
        super(groups.range, groups.isMultiline)
        this.size = groups.size;
    }
}

export class TextColorBracketElem extends TextEffectBracketElem {
    primary: string = ""
    secondary?: string
    constructor(groups: IBracketElem & { primary: string; secondary?: string }) {
        super(groups.range, groups.isMultiline)
        this.primary = groups.primary;
        this.secondary = groups.secondary;
    }
}

export class ParenthesisElem extends UnableChild {
    constructor(groups: { range: Range; isMultiline: boolean; }) {
        super(groups.range, groups.isMultiline)
    }
}

export class Group {
    uuid: string = uuidv4();
    elems: HolderElem[] = [];
}

export class CommentGroup extends Group {}

export class ContentGroup extends Group {}

export class TripleBracketGroup extends Group {}

export class TripleBracketContentGroup extends Group {}

export class SquareBracketGroup extends Group {}

export class SingleSquareBracketGroup extends Group {}

export class DoubleSquareBracketGroup extends Group {}

export class HeadingGroup extends Group {}

export class MathTagGroup extends Group {}

export class IndentGroup extends Group {}

export class ListGroup extends Group {}

export class CiteGroup extends Group {}

export class FootnoteGroup extends Group {}

export type HolderType = "Pipe" /* TableCell, LinkPipe */ | "Comment" | "ParenthesisOpen" | "ParenthesisClose" | "SquareBracketOpen" /* LinkOpen, MacroOpen */ | "SquareBracketClose" /* LinkClose, MacroClose, FootnoteClose */ | "HeadingOpen" | "HeadingClose" | "TripleBracketOpen" | "TripleBracketClose" | "Indent" | "UnorderedList" | "OrderedList" | "Cite" | "FootnoteOpen" | "TableArgumentOpen" | "TableArgumentClose" | "MathTagOpen" | "MathTagClose" | "Quote" | "Underbar" | "Tilde" | "Carot" | "Comma" | "Hyphen" | "Escape" | "Newline" | ""

export class HolderElem {
    range: Range = new Range(0, 1);
    eolRange: Range = new Range(0, 1);
    group: Group[] = [];
    type: HolderType = "";
    uuid: string = uuidv4();
    fixed: boolean = false;
    ignore: boolean = false;
    constructor(range: Range, eolRange: Range, type: HolderType) {
        this.range = range;
        this.eolRange = eolRange;
        this.type = type;
    }
}