import { Range } from "range-admin";
import { v4 as uuidv4 } from "uuid";

type OrderedListSuffix = "1" | "a" | "A" | "i" | "I"
export interface IIndent {
    type: "Indent" | "Cite" | `OrderedList-${OrderedListSuffix}` | `OrderedList-Ordered-${OrderedListSuffix}` | `UnorderedList`;
    count: number;
    element: HolderElem;
    children: IIndent[];
}

export type IlStructurePrecede = "Newline" | "Indent" | "Cite" | "List";
export type IlStructureFollow = "Indent" | `OrderedList-${OrderedListSuffix}` | `OrderedList-Ordered-${OrderedListSuffix}` | "UnorderedList" | "Cite"
export interface IlIndent {
    type: IlStructureFollow;
    count: number;
    originElement: IlElement;
    children: IlIndent[];
}

/** p stands for precede, c stands for count */
export type IlStructure = { indentSize: { p: IlStructurePrecede; c: number }[]; sequence: IlStructureFollow[] };
export type IlElement = { range: Range, data: HolderElem[], structure: IlStructure, uuid: string; };

/*

list > cite (3)
cite (2)

aaa*xxx>xtext
aaaxx>xtext


*/

export type TGroupTag = "" | "Comment" | "Content" | "TripleBracket" | "TripleBracketContent" | "SquareBracket" | "SingleSquareBracket" | "DoubleSquareBracket" | "Heading" | "MathTag" | "Indent" | "List" | "SingleCite" | "Cite" | "Footnote" | "DecoDoubleQuote" | "DecoTripleQuote" | "DecoUnderbar" | "DecoTilde" | "DecoCarot" | "DecoComma" | "DecoHyphen" | "Table" | "TableRow" | "TableArgument"

type TGroupProperty<Type> = Type extends "SingleSquareBracket"
    ? TGroupPropertySingleSquareBracket
    : Type extends "TripleBracket"
    ? TGroupPropertyTripleBracket
    : Type extends "Heading"
    ? TGroupPropertyHeading
    : { [k: string]: any };
export type TGroupPropertySingleSquareBracketName = "clearfix" | "date" | "datetime" | "목차" | "tableofcontents" | "각주" | "footnote" | "br" | "pagecount" | "anchor" | "age" | "dday" | "youtube" | "kakaotv" | "nicovideo" | "vimeo" | "navertv" | "pagecount" | "math" | "include"
type TGroupPropertySingleSquareBracket = { name: TGroupPropertySingleSquareBracketName; }
type TGroupPropertyTripleBracket = { type: "Raw" | "Sizing" | "TextColor" | "Html" | "Syntax" | "Wiki" }
type TGroupPropertyHeading = { level: number; isHidden: boolean; }

export class BaseGroup {
    uuid: string = uuidv4();
    elems: HolderElem[] = [];
    type: TGroupTag = "";
    constructor() {}
}

export class Group<Type extends TGroupTag> extends BaseGroup {
    property?: TGroupProperty<Type>;
    constructor(type: Type, property?: TGroupProperty<Type>) {
        super();
        this.type = type;
        this.property = property;
    }
}

export type THolderTag = "Pipe" /* TableCell, LinkPipe */ | "Comment" | "ParenthesisOpen" | "ParenthesisClose" | "SquareBracketOpen" /* LinkOpen, MacroOpen */ | "SquareBracketClose" /* LinkClose, MacroClose, FootnoteClose */ | "HeadingOpen" | "HeadingClose" | "TripleBracketOpen" | "TripleBracketClose" | "Newline>Indent" | "Cite>Indent" | "List>Indent" | "Indent>UnorderedList" | "Indent>OrderedList" | /* "Cite>UnorderedList" | "Cite>OrderedList" | */ "Newline>Cite" | "Indent>Cite" | "Cite>Cite" | "List>Cite" | "FootnoteOpen" | "TableArgumentOpen" | "TableArgumentClose" | "MathTagOpen" | "MathTagClose" | "Quote" | "Underbar" | "Tilde" | "Carot" | "Comma" | "Hyphen" | "Escape" | "Newline" | ""

export class HolderElem {
    range: Range = new Range(0, 1);
    rowRange: Range = new Range(0, 1);
    layerRange: Range = new Range(-1000, -999); // 기본 global 값 Range(-1000, -999)
    group: BaseGroup[] = [];
    type: THolderTag = "";
    uuid: string = uuidv4();
    immutable: boolean = false;
    ignore: boolean = false;
    constructor(range: Range, rowRange: Range, type: THolderTag) {
        this.range = range;
        this.rowRange = rowRange;
        this.type = type;
    }
}