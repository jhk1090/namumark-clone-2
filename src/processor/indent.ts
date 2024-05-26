import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group, IIndent, IlStructure, IlStructurePrecede } from "../elem.js";

export function indentNewlineProcessor(this: NamuMark, props: IProcessorProps) {
    const indentArray = this.parserStore.indentArray;

    const newline = this.holderArray[props.index];
    const indent = this.holderArray[props.index + 1];
    const INDENT_AR = newline.layerRange.toString()
    const currentArray = indentArray[INDENT_AR];

    // indent === 0 일경우,
    // layerRange 배열에 빈 배열을 하나 더 삽입
    // indent > 0 일경우,
    /*
    배열이 없을 때, indentCount 설정, indent 푸쉬
    layerRange 배열 0번째가 비었을 경우, indent 푸쉬
    min > indent일 경우, indent 푸쉬
    min === indent indent 푸쉬


    */
    if (indent === undefined) {
        return;
    }

    if (indent.type !== "Newline>Indent") {
        if (currentArray === undefined || currentArray.data[0].length === 0) {
            return;    
        }

        indentArray[INDENT_AR] = { min: null, lastNewlineUUID: null, data: [[], ...currentArray.data] }
    } else {
        const indentCount = indent.range.end - indent.range.start;
    
        if (currentArray === undefined) {
            indentArray[INDENT_AR] = { min: indentCount, lastNewlineUUID: newline.uuid, data: [[{ type: "Indent", count: indentCount, element: indent, children: [] }]] }
            props.setIndex(props.index + 1);
            return;
        }
    
        if (currentArray.data[0].length === 0) {
            indentArray[INDENT_AR].min = indentCount;
            indentArray[INDENT_AR].data[0].push({ type: "Indent", count: indentCount, element: indent, children: [] });
            indentArray[INDENT_AR].lastNewlineUUID = newline.uuid;
            props.setIndex(props.index + 1);
            return;
        }

        const filteredLastEndlineIndex = this.holderArray.slice(0, props.index).findLastIndex(v => v.layerRange.isEqual(newline.layerRange) && v.type === "Newline");
        const arrayLastEndlineIndex = this.holderArray.findLastIndex(v => v.uuid === currentArray.lastNewlineUUID);
        if (filteredLastEndlineIndex !== arrayLastEndlineIndex) {
            indentArray[INDENT_AR] = { min: null, lastNewlineUUID: null, data: [[], ...currentArray.data] }
            props.setIndex(props.index + 1);
            return;
        }
    
        if ((currentArray.min as number) > indentCount) {
            indentArray[INDENT_AR] = { min: indentCount, lastNewlineUUID: newline.uuid, data: [[{ type: "Indent", count: indentCount, element: indent, children: [] }], ...currentArray.data] }
            props.setIndex(props.index + 1);
            return;
        }
        
        if (currentArray.min === indentCount) {
            indentArray[INDENT_AR].data[0].push({ type: "Indent", count: indentCount, element: indent, children: [] })
            indentArray[INDENT_AR].lastNewlineUUID = newline.uuid;
            props.setIndex(props.index + 1);
            return;
        }
    
        let ref = indentArray[INDENT_AR].data[0].at(-1) as IIndent;
        while (true) {
            if (ref.children.length !== 0 && (ref.children.at(-1) as IIndent).count < indentCount) {
                ref = ref.children.at(-1) as IIndent;
                continue;
            }
    
            ref.children.push({ type: "Indent", count: indentCount, element: indent, children: [] })
            break;
        }

        indentArray[INDENT_AR].lastNewlineUUID = newline.uuid;
        props.setIndex(props.index + 1);
    }
}