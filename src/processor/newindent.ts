import { IProcessorProps } from ".";
import { NamuMark } from "..";
import { HolderElem, IIndent, IlElement, IlStructure, IlStructureFollow, IlStructurePrecede } from "../elem";
import util from "node:util";

type TPrecede = "Newline" | "Cite" | "List" | "Indent";
type TFollow = "Cite" | "UnorderedList" | "OrderedList" | "Indent";

function debugTarget(target: IIndent) {
    function excludeElement(array: IIndent) {
        console.log(array)
        interface ModifiedIIndent {
            t: "x" | ">" | "*" | "*#" | "*#1";
            c: number;
            d: ModifiedIIndent[][];
        }
        const output: ModifiedIIndent[] = [];
        
        let t: "x" | ">" | "*" | "*#" | "*#1" = array.type === "Indent" ? "x" : array.type === "Cite" ? ">" : array.type === "UnorderedList" ? "*" : array.type.startsWith("OrderedList-Ordered") ? "*#1" : "*#";
        output.push({ t: t, c: array.count, d: array.children.map(v => excludeElement(v)) })

        return output;
    }
    console.log(util.inspect(excludeElement(target), false, 1000, true))
}

export function newIndentProcessor(this: NamuMark, props: IProcessorProps) {
    const indentArray = this.parserStore.newIndentArray;

    const newline = this.holderArray[props.index];
    const indent = this.holderArray[props.index + 1];
    const INDENT_LR = newline.layerRange.toString();
    const currentArray = indentArray[INDENT_LR];

    if (newline === undefined) {
        return;
    }

    if (newline.type !== "Newline>Indent" && newline.type !== "Newline>Cite") {
        if (currentArray === undefined || currentArray.dataArray[0].length === 0) {
            return;
        }

        indentArray[INDENT_LR] = { minIndentSize: null, dataArray: [[], ...currentArray.dataArray], indentStructures: [[], ...currentArray.indentStructures] }
    } else {
        let target!: IIndent;
        if (currentArray === undefined) {
            target = processWhenUndefined.call(this, props);
            // debugTarget(target)
            // 역순임
            indentArray[INDENT_LR].dataArray[0].unshift(target as IIndent)
        } else {
            target = processWhenDefined.call(this, props);
        }
        console.log("--".repeat(35))
    }
}

function processWhenDefined(this: NamuMark, props: IProcessorProps): any {
    const indentArray = this.parserStore.newIndentArray;
    const elem = this.holderArray[props.index]
    const structure = buildIndentStructure.call(this, props);
    const adjacentArray = buildAdjacentArray.call(this, props);
    const indentCount = structure.indentSize[0].c;

    const INDENT_LR = elem.layerRange.toString();

    
}

function processWhenUndefined(this: NamuMark, props: IProcessorProps) {
    const indentArray = this.parserStore.newIndentArray;
    const elem = this.holderArray[props.index]
    const structure = buildIndentStructure.call(this, props);
    const adjacentArray = buildAdjacentArray.call(this, props);
    const indentCount = structure.indentSize[0].c;

    const INDENT_LR = elem.layerRange.toString();

    console.log(structure)
    console.log(adjacentArray.map(v => ({ type: v.type, uuid: v.uuid.substring(0, 3), range: v.range.toString() })))
    indentArray[INDENT_LR] = { minIndentSize: indentCount, dataArray: [[]], indentStructures: [[structure]] }
    
    let target: IIndent | undefined;
    let ref!: IIndent;
    for (let i = 0; i < structure.indentSize.length; i++) {
        const currentIndentSize = structure.indentSize[i];
        const filteredSequence = structure.sequence.filter(v => v !== "Indent")
        const filteredAdjacentArray = adjacentArray.filter(v => v.type !== "Cite>Indent" && v.type !== "List>Indent" && v.type !== "Newline>Indent")
        let currentSequence!: IlStructureFollow;
        let element!: HolderElem;
        if (structure.sequence.length === 1) {
            currentSequence = "Indent";
            element = adjacentArray[0];
        } else if (i === structure.indentSize.length - 1 && filteredSequence[i] === undefined) {
            currentSequence = "Indent";
            element = adjacentArray.at(-1) as HolderElem;
        } else {
            currentSequence = filteredSequence[i];
            element = filteredAdjacentArray[i]
        }

        console.log(currentIndentSize, currentSequence, element.type, element.uuid.substring(0, 3))
        const result = { type: currentSequence, count: currentIndentSize.c, element, children: [] }
        if (target === undefined) {
            target = result;
            ref = target;
        } else {
            ref.children.push(result)
            ref = ref.children[0]
        }
    }

    return target as IIndent;
}

function buildIndentStructure(this: NamuMark, props: IProcessorProps) {
    const adjacentArray: HolderElem[] = buildAdjacentArray.call(this, props);

    let structure: IlStructure = { indentSize: [], sequence: [] };
    const followRegex = /(?<suffix>1|a|A|i|I)\.(?<isOrdered>\#\d{1,})?/g;
    for (const adjacentElem of adjacentArray) {
        const [precedeType, followType] = adjacentElem.type.split(">") as [TPrecede, TFollow];
        if (followType === "OrderedList") {
            const { suffix, isOrdered } = followRegex.exec(this.wikiText.substring(adjacentElem.range.start, adjacentElem.range.end))?.groups as { suffix: "1" | "a" | "A" | "i" | "I", isOrdered?: string }
            followRegex.lastIndex = 0;
            structure.sequence.push(`OrderedList-${isOrdered !== undefined ? "Ordered-" : ""}${suffix}`)
        } else {
            structure.sequence.push(followType)
        }

        if (followType === "Indent") {
            structure.indentSize.push({ p: precedeType as "Newline" | "Cite" | "List", c: adjacentElem.range.end - adjacentElem.range.start })
        }

        /* \n> >*> 같은 경우 예방 */
        if (precedeType !== "Indent" && followType !== "Indent") {
            structure.indentSize.push({p: precedeType as "Newline" | "Cite" | "List", c: 0 })
        }
    }

    return structure;
    // props.setIndex(props.index + adjacentArray.length - 1);
}

function buildAdjacentArray(this: NamuMark, props: IProcessorProps) {
    const elem = this.holderArray[props.index];
    const adjacentArray: HolderElem[] = [elem];
    const INDENT_LR = elem.layerRange.toString();

    let [precedeType, followType] = elem.type.split(">") as [TPrecede, TFollow];
    const isMatchType = () => {
        switch (followType) {
            case "Cite":
                return precedeType === "Cite";
            case "OrderedList":
            case "UnorderedList":
                return precedeType === "List";
            case "Indent":
                return precedeType === "Indent";
            default:
                return false;
        }
    }

    // elem은 newline이므로
    const slicedArray = INDENT_LR === "-1000~-999" ? this.holderArray.slice(props.index + 1) : this.holderArray.slice(props.index + 1, this.holderArray.findLastIndex(v => v.layerRange.isEqual(elem.layerRange)));
    let isDone = false;
    let lastRange = elem.range;
    let bracketLock = false;
    let rangeEnd = elem.layerRange.end;

    for (let idx = 0; idx < slicedArray.length - 1; idx++) {
        const innerElem = slicedArray[idx];

        if (!isDone) {
            precedeType = innerElem.type.split(">")[0] as TPrecede;
            if (lastRange.isAdjacent(innerElem.range) && isMatchType()) {
                followType = innerElem.type.split(">")[1] as TFollow;
                adjacentArray.push(innerElem);
                lastRange = innerElem.range;
                continue;
            }
            isDone = true;
        }

        if (innerElem.group.find(v => v.type === "TripleBracket")) {
            bracketLock = !bracketLock;
            continue;
        }

        if (!bracketLock && innerElem.type === "Newline") {
            rangeEnd = innerElem.range.end;
            break;
        }
    }

    return adjacentArray;
}