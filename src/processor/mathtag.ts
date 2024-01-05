import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const mathtagOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const mathOpenElement = mark.parserStore.mathOpenElement;

    const elem = mark.holderArray[props.idx];
    // 같은 math 태그는 앞에 것이 우선, 단 eolRange가 같을때만
    if (mathOpenElement !== undefined && mathOpenElement.eolRange.isSame(elem.eolRange)) {
        if (mathOpenElement.eolRange.isSame(elem.eolRange)) {
            return;
        }
    }
    mark.parserStore["mathOpenElement"] = elem;
};

export const mathtagCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const mathOpenElement = mark.parserStore.mathOpenElement;

    const elem = mark.holderArray[props.idx];
    if (mathOpenElement === undefined) {
        return;
    }
    if (!mathOpenElement.eolRange.isSame(elem.eolRange)) {
        mark.parserStore["mathOpenElement"] = undefined;
        return;
    }

    mark.pushGroup({ group: new Group("MathTag"), elems: [mathOpenElement, elem] });
    mark.parserStore["mathOpenElement"] = undefined;
};