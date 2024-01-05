import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const footnoteOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const footnoteQueue = mark.parserStore.footnoteQueue;

    const elem = mark.holderArray[props.idx];
    const prev = mark.holderArray[props.idx - 1];

    // 이미 사용중
    if (prev.fixed) {
        return;
    }

    // 인접 여부
    if (!elem.range.isAdjacent(prev.range)) {
        return;
    }

    footnoteQueue.push([prev, elem]);
};

export const footnoteCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const footnoteQueue = mark.parserStore.footnoteQueue;
    
    const elem = mark.holderArray[props.idx];

    if (elem.fixed) {
        return;
    }

    const lastTuple = footnoteQueue.pop();

    if (lastTuple === undefined) {
        return;
    }

    if (lastTuple[0].availableRange !== elem.availableRange) {
        return;
    }

    mark.pushGroup({ group: new Group("Footnote"), elems: [...lastTuple, elem] });
};