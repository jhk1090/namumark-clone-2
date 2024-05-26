import { Group } from "../elem.js";
import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";

export function escapeProcessor(this: NamuMark, props: IProcessorProps) {
    const elem = this.holderArray[props.index];
    const next = this.holderArray[props.index + 1];

    // Newline은 이스케이프 대상이 아님
    if (next.type === "Newline") {
        return;
    }

    // 인접할 때
    if (elem.range.isAdjacent(next.range)) {
        this.pushGroup({ group: new Group(next.type === "TripleBracketOpen" ? "TripleBracketContent" : "Content"), elems: [elem, next] });

        // triple의 경우 따로 처리
        if (next.type === "TripleBracketClose" || next.type === "TripleBracketOpen") {
            return;
        }

        props.setIndex(props.index + 1);
    }
}