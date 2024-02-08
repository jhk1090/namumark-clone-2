import { ProcessorProps } from ".";
import { NamuMark } from "..";
import { IlStructure } from "../elem";
import { Range } from "../utils";

export const indentlikeProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const innerArray = mark.parserStore.tempIndentlikeArray;

    const elem = mark.holderArray[props.idx];
    const INNER_AR = elem.availableRange.toString();

    if (elem.ignore || elem.fixed) {
        return;
    }

    const adjacentIndentlike = [elem];
    /* "Newline>Indent" | "Cite>Indent" | "List>Indent" | "Indent>UnorderedList" | "Indent>OrderedList" | "Cite>UnorderedList" | "Cite>OrderedList" | "Newline>Cite" | "Indent>Cite" | "Cite>Cite" | "List>Cite"
     */
    let isIndentlikeFinished = false;
    let lastIndentlikeRange: Range = elem.range;
    type OriginType = "Newline" | "Cite" | "List" | "Indent";
    type CurrentType = "Cite" | "UnorderedList" | "OrderedList" | "Indent";
    let [originType, currentType] = elem.type.split(">") as [OriginType, CurrentType];
    const matchType = () => {
        switch (currentType) {
            case "Cite":
                return originType === "Cite";
            case "OrderedList":
            case "UnorderedList":
                return originType === "List";
            case "Indent":
                return originType === "Indent";
            default:
                return false;
        }
    };

    let bracketLock = false;
    let rangeEnd = elem.availableRange.end;
    const slicedArray = INNER_AR === "Range(-1000, -999)" ? mark.holderArray.slice(props.idx + 1) : mark.holderArray.slice(props.idx + 1, mark.holderArray.findLastIndex(v => v.availableRange.isSame(elem.availableRange)))

    for (let i = 0; i < slicedArray.length - 1; i++) {
        const subElem = slicedArray[i];

        if (!isIndentlikeFinished) {
            originType = subElem.type.split(">")[0] as OriginType;
            if (lastIndentlikeRange.isAdjacent(subElem.range) && matchType()) {
                currentType = subElem.type.split(">")[1] as CurrentType;
                adjacentIndentlike.push(subElem);
                lastIndentlikeRange = subElem.range;
                continue;
            }
            isIndentlikeFinished = true;
        }

        if (subElem.group.find(v => v.type === "TripleBracket")) {
            bracketLock = !bracketLock;
            continue;
        }

        if (!bracketLock && subElem.type === "Newline") {
            rangeEnd = subElem.range.end;
        }
    }

    if (innerArray[INNER_AR] === undefined) {
        innerArray[INNER_AR] = [];
    }
    let structure: IlStructure = { indentSize: [], sequence: [] };
    adjacentIndentlike.forEach(v => {
        const [precede, follow] = v.type.split(">") as ["Newline" | "Cite" | "List" | "Indent", "Indent" | "List" | "Cite"];
        structure.sequence.push(follow)
        if (follow === "Indent") {
            structure.indentSize.push({p: precede as "Newline" | "Cite" | "List", c: v.range.end - v.range.start})
        }
    })
    innerArray[INNER_AR].push({ range: new Range(elem.range.start, rangeEnd), data: adjacentIndentlike, structure });

    props.setIdx(props.idx + adjacentIndentlike.length - 1);
};
