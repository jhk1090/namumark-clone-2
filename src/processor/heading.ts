import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group } from "../elem.js";

export function headingOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const elem = this.holderArray[props.index];
    this.parserStore["headingOpenElement"] = elem;
}

export function headingCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const headingOpenElement = this.parserStore.headingOpenElement;
    const elem = this.holderArray[props.index];
    if (!(headingOpenElement !== undefined && headingOpenElement.rowRange.isEqual(elem.rowRange))) {
        return;
    }

    const openRegex = /(?<level>={1,6})(?<isHidden>#?) /g;
    const closeRegex = / (?<isHidden>#?)(?<level>={1,6})/g;
    const openGroup = (openRegex.exec(this.wikiText.substring(headingOpenElement.range.start, headingOpenElement.range.end)) as RegExpExecArray).groups;
    const closeGroup = (closeRegex.exec(this.wikiText.substring(elem.range.start, elem.range.end)) as RegExpExecArray).groups;
    
    // 같은 종류의 heading인지 확인
    if (!((openGroup?.level ?? "1") === (closeGroup?.level ?? "2") && (openGroup?.isHidden ?? "1") === (closeGroup?.isHidden ?? "2"))) {
        return;
    }

    this.pushGroup({ group: new Group("Heading", { level: openGroup?.level.length as number, isHidden: openGroup?.isHidden === "#" }), elems: [elem, headingOpenElement] });
    return;
}