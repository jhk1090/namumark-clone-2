import { Group } from "../elem.js";
import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";

export function tripleBracketOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const tripleBracketQueue = this.parserStore.tripleBracketQueue;
    const elem = this.holderArray[props.index];

    tripleBracketQueue.push(elem);
}

export function tripleBracketCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const tripleBracketQueue = this.parserStore.tripleBracketQueue;
    const elem = this.holderArray[props.index];
    const lastBracket = tripleBracketQueue.pop();

    if (lastBracket === undefined) {
        return;
    }

    const group = new Group(lastBracket.group.find(v => v.type === "TripleBracketContent") ? "TripleBracketContent" : "TripleBracket");
    this.pushGroup({ group, elems: [lastBracket, elem] })
}