import { Range } from "./utils";
import { v4 as uuidv4 } from "uuid";

export abstract class Elem {
    range: Range = new Range(0, 1);
    parentUUID: string | null = null;
    constructor(range: Range) {
        this.range = range;
    }
    setParent(uuid: string) { this.parentUUID = uuid }
}

export abstract class UnableChild extends Elem {}

export abstract class AbleChild extends Elem {
    uuid: string = uuidv4();
}

export type holderType = "Pipe" /* TableCell, LinkPipe */ | "Comment" | "MacroArgumentOpen" | "MacroArgumentClose" | "SquareBracketOpen" /* LinkOpen, MacroOpen */ | "SquareBracketClose" /* LinkClose, MacroClose, FootnoteClose */ | "HeadingOpen" | "HeadingClose" | "TripleBracketOpen" | "TripleBracketClose" | "UnorderedList" | "OrderedList" | "Cite" | "FootnoteOpen" | "TableArgumentOpen" | "TableArgumentClose" | "MathTagOpen" | "MathTagClose" | "Quote" | "Underbar" | "Tilde" | "Carot" | "Comma" | "Hyphen" | ""

export class HolderElem {
    range: Range = new Range(0, 1);
    type: holderType = "";
    constructor(range: Range, type: holderType) {
        this.range = range;
        this.type = type;
    }
}