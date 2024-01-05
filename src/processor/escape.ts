import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const escapeProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const elem = mark.holderArray[props.idx];
    const next = mark.holderArray[props.idx + 1];

    if (next.type === "Newline") {
        return;
    }
    if (elem.range.isAdjacent(next.range)) {
        mark.pushGroup({ group: new Group(next.type === "TripleBracketOpen" ? "TripleBracketContent" : "Content"), elems: [elem, next] });

        // 다음 text 건너뛰기
        if (next.type === "TripleBracketClose" || next.type === "TripleBracketOpen") {
            return;
        }

        props.setIdx(props.idx + 1);
    }
};