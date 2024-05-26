import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group, IlStructure, IlStructurePrecede } from "../elem.js";
import { v4 as uuidv4 } from "uuid";
import { Range } from "range-admin";

export function indentlikeProcessor(this: NamuMark, props: IProcessorProps) {
    const innerArray = this.parserStore.indentlikeArray;

    const elem = this.holderArray[props.index];
    const INNER_AR = elem.layerRange.toString();

    if (elem.ignore || elem.immutable) {
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
    let rangeEnd = elem.layerRange.end;
    const slicedArray = INNER_AR === "-1000~-999" ? this.holderArray.slice(props.index + 1) : this.holderArray.slice(props.index + 1, this.holderArray.findLastIndex(v => v.layerRange.isEqual(elem.layerRange)))

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
            break;
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
            const { suffix, isOrdered } = followRegex.exec(this.wikiText.substring(v.range.start, v.range.end))?.groups as { suffix: "1" | "a" | "A" | "i" | "I", isOrdered?: string }
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

    props.setIndex(props.index + adjacentIndentlike.length - 1);
};