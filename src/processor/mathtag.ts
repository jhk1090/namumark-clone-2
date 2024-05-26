import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group } from "../elem.js";

export function mathtagOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const mathOpenElement = this.parserStore.mathOpenElement;

    const elem = this.holderArray[props.index];
    // 같은 math 태그는 앞에 것이 우선, 단 eolRange가 같을때만
    if (mathOpenElement !== undefined && mathOpenElement.rowRange.isEqual(elem.rowRange)) {
        if (mathOpenElement.rowRange.isEqual(elem.rowRange)) {
            return;
        }
    }
    this.parserStore["mathOpenElement"] = elem;
};

export function mathtagCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const mathOpenElement = this.parserStore.mathOpenElement;

    const elem = this.holderArray[props.index];
    if (mathOpenElement === undefined) {
        return;
    }
    if (!mathOpenElement.rowRange.isEqual(elem.rowRange)) {
        this.parserStore["mathOpenElement"] = undefined;
        return;
    }

    this.pushGroup({ group: new Group("MathTag"), elems: [mathOpenElement, elem] });
    this.parserStore["mathOpenElement"] = undefined;
};