import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { IlIndent, IlStructureFollow } from "../elem";
import { indentlikeProcessor } from "../processor/indentlike";

const mappedProcessor: ProcessorType = {
    "Newline>Cite": [ indentlikeProcessor ],
    "Newline>Indent": [ indentlikeProcessor ]
}

const groupper = (mark: NamuMark) => {
    const treeArray = mark.parserStore.indentlikeTreeArray
    for (const [innerArrayAR, innerArray] of Object.entries(mark.parserStore.indentlikeArray)) {
        if (treeArray[innerArrayAR] === undefined) {
            treeArray[innerArrayAR] = { data: [], lastElement: null };
        }
        for (let idx = 0; idx < innerArray.length; idx++) {
            const innerElem = innerArray[idx];
            const { data: innerData, range: innerRange, structure: { indentSize: innerIndentSize, sequence: innerSequence }, uuid: innerUUID } = innerElem;

            if (treeArray[innerArrayAR].lastElement === null) {
                let indentStruct: IlIndent | null = null;
                let indentStructRef: IlIndent[] | null = null;
                treeArray[innerArrayAR].lastElement = innerElem;
                const filtered = innerSequence.filter(v => v !== "Indent")
                console.log(innerIndentSize)
                for (const [idx, value] of filtered.entries()) {
                    const output: IlIndent = { type: value, children: [], count: innerIndentSize[idx].c, originElement: innerElem }
                    if (indentStruct === null) {
                        indentStruct = output
                        indentStructRef = indentStruct.children;
                    } else {
                        if (indentStructRef === null) {
                            break;
                        }
                        indentStructRef.push(output)
                        indentStructRef = indentStructRef[indentStructRef.length - 1].children
                    }
                }
                const util = require('util');
                function excludeElement(array: IlIndent[]) {
                    interface ModifiedIIndent {
                        t: "x" | ">" | "*" | "1#" | "1";
                        c: number;
                        d: ModifiedIIndent[];
                    }
                    const output: ModifiedIIndent[] = [];
                    for (let element of array) {
                        let t: "x" | ">" | "*" | "1#" | "1" = element.type === "Indent" ? "x" : element.type === "Cite" ? ">" : element.type === "UnorderedList" ? "*" : element.type.startsWith("OrderedList-Ordered") ? "1#" : "1";
                        output.push({ t: t, c: element.count, d: excludeElement(element.children) })
                    }
                    return output;
                }
                console.log(util.inspect(excludeElement([indentStruct] as IlIndent[]), false, null, true))
            }
        }
    }
}

export default [mappedProcessor, groupper] as GroupperReturnType