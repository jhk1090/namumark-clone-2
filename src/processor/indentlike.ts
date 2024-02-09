import { ProcessorProps } from ".";
import { NamuMark } from "..";
import { IlStructure, IlStructureFollow, IlStructurePrecede } from "../elem";
import { Range } from "../utils";
import { v4 as uuidv4 } from "uuid";

export const indentlikeProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const innerArray = mark.parserStore.indentlikeArray;

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
    type FollowType = "Cite" | "UnorderedList" | "OrderedList" | "Indent";
    let [precedeType, followType] = elem.type.split(">") as [IlStructurePrecede, FollowType];
    const matchType = () => {
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
    };

    let bracketLock = false;
    let rangeEnd = elem.availableRange.end;
    const slicedArray = INNER_AR === "Range(-1000, -999)" ? mark.holderArray.slice(props.idx + 1) : mark.holderArray.slice(props.idx + 1, mark.holderArray.findLastIndex(v => v.availableRange.isSame(elem.availableRange)))

    for (let i = 0; i < slicedArray.length - 1; i++) {
        const subElem = slicedArray[i];

        if (!isIndentlikeFinished) {
            precedeType = subElem.type.split(">")[0] as OriginType;
            if (lastIndentlikeRange.isAdjacent(subElem.range) && matchType()) {
                followType = subElem.type.split(">")[1] as FollowType;
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
    const followRegex = /(?<suffix>1|a|A|i|I)\.(?<isOrdered>\#\d{1,})?/g;
    adjacentIndentlike.forEach(v => {
        const [precede, follow] = v.type.split(">") as [IlStructurePrecede, FollowType];
        if (follow === "OrderedList") {
            const { suffix, isOrdered } = followRegex.exec(mark.wikiText.substring(v.range.start, v.range.end))?.groups as { suffix: "1" | "a" | "A" | "i" | "I", isOrdered?: string }
            followRegex.lastIndex = 0;
            structure.sequence.push(`OrderedList-${isOrdered !== undefined ? "Ordered-" : ""}${suffix}`)
        } else {
            structure.sequence.push(follow)
        }

        if (follow === "Indent") {
            structure.indentSize.push({p: precede as "Newline" | "Cite" | "List", c: v.range.end - v.range.start})
        }

        /* \n> >*> 같은 경우 예방 */
        if (precede !== "Indent" && follow !== "Indent") {
            structure.indentSize.push({p: precede as "Newline" | "Cite" | "List", c: 0})
        }
    })
    innerArray[INNER_AR].push({ range: new Range(elem.range.start, rangeEnd), data: adjacentIndentlike, structure, uuid: uuidv4() });

    props.setIdx(props.idx + adjacentIndentlike.length - 1);
};

