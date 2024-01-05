import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const tripleBracketOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tripleBracketQueue = mark.parserStore.tripleBracketQueue;

    const elem = mark.holderArray[props.idx];
    tripleBracketQueue.push(elem);
};

export const tripleBracketCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tripleBracketQueue = mark.parserStore.tripleBracketQueue;

    const elem = mark.holderArray[props.idx];
    const lastItem = tripleBracketQueue.pop();

    if (lastItem === undefined) {
        // elem.ignore = true;
        return;
    }

    const group = new Group(lastItem.group.find((v) => v.type === "TripleBracketContent") ? "TripleBracketContent" : "TripleBracket");
    mark.pushGroup({ group, elems: [lastItem, elem] });
};