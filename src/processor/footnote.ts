import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group } from "../elem.js";

export function footnoteOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const footnoteQueue = this.parserStore.footnoteQueue;

    const elem = this.holderArray[props.index];
    const prev = this.holderArray[props.index - 1];

    // 이미 사용중
    if (prev.immutable) {
        return;
    }

    // 인접 여부
    if (!elem.range.isAdjacent(prev.range)) {
        return;
    }

    footnoteQueue.push([prev, elem]);
};

export function footnoteCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const footnoteQueue = this.parserStore.footnoteQueue;
    
    const elem = this.holderArray[props.index];

    if (elem.immutable) {
        return;
    }

    const lastTuple = footnoteQueue.pop();

    if (lastTuple === undefined) {
        return;
    }

    if (!lastTuple[0].layerRange.isEqual(elem.layerRange)) {
        return;
    }

    this.pushGroup({ group: new Group("Footnote"), elems: [...lastTuple, elem] });
};