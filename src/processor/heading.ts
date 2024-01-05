import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";

export const headingOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const elem = mark.holderArray[props.idx];
    mark.parserStore["headingOpenElement"] = elem;
};

export const headingCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const headingOpenElement = mark.parserStore.headingOpenElement;

    const elem = mark.holderArray[props.idx];
    if (headingOpenElement !== undefined && headingOpenElement.eolRange === elem.eolRange) {
        const openRegex = /(?<level>={1,6})(?<isHidden>#?) /g;
        const closeRegex = / (?<isHidden>#?)(?<level>={1,6})/g;
        const openGroup = (
            openRegex.exec(mark.wikiText.substring(headingOpenElement.range.start, headingOpenElement.range.end)) as RegExpExecArray
        ).groups;
        const closeGroup = (closeRegex.exec(mark.wikiText.substring(elem.range.start, elem.range.end)) as RegExpExecArray).groups;

        // 같은 종류의 heading인지 확인
        if (!((openGroup?.level ?? "1") === (closeGroup?.level ?? "2") && (openGroup?.isHidden ?? "1") === (closeGroup?.isHidden ?? "2"))) {
            return;
        }

        mark.pushGroup({ group: new Group("Heading", { level: openGroup?.level.length as number, isHidden: openGroup?.isHidden === "#" }), elems: [elem, headingOpenElement] });
        return;
    }
};