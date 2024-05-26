import { IProcessorProps } from "./index.js";
import { NamuMark } from "../index.js";
import { Group } from "../elem.js";

export function commentProcessor(this: NamuMark, props: IProcessorProps) {
    // endIndex 찾기: 다음 Newline까지
    const endIndex = this.holderArray.slice(props.index).findIndex(v => v.type === "Newline") + props.index;
    // groupping
    this.pushGroup({ group: new Group("Comment"), elems: this.holderArray.slice(props.index, endIndex) })
}