import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const commentProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const end = mark.holderArray.slice(props.idx).findIndex((v) => v.type === "Newline") + props.idx;
    mark.pushGroup({ group: new Group("Comment"), elems: mark.holderArray.slice(props.idx, end) });
};