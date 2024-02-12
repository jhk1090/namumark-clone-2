import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { IlElement, IlIndent, IlStructureFollow } from "../elem";
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
            const compileFirstARRow = () => {
                let indentStruct: IlIndent | null = null;
                let indentStructRef: IlIndent[] | null = null;
                treeArray[innerArrayAR].lastElement = innerElem;
                const filtered = innerSequence.filter((v) => v !== "Indent");
                console.log(innerIndentSize, innerSequence);
                for (const [idx, value] of filtered.entries()) {
                    const output: IlIndent = { type: value, children: [], count: innerIndentSize[idx].c, originElement: innerElem };
                    if (indentStruct === null) {
                        indentStruct = output;
                        indentStructRef = indentStruct.children;
                    } else {
                        if (indentStructRef === null) {
                            break;
                        }
                        indentStructRef.push(output);
                        indentStructRef = indentStructRef[indentStructRef.length - 1].children;
                    }
                }
                return indentStruct as IlIndent;
                /*const util = require('util');
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
                console.log(util.inspect(excludeElement([indentStruct] as IlIndent[]), false, null, true))*/
            }

            // first of availableRange
            if (treeArray[innerArrayAR].lastElement === null) {
                const indentStruct = compileFirstARRow()
                treeArray[innerArrayAR].data = [[indentStruct]]
                continue;
            }

            /*
            range checking - row vs lastElement isadjacent
            -> true = next level
            -> false = change into lastElement && new push

            min checking - min comparison; innerIndentSize's first size >= min
            -> true = next level
            -> false = change into lastElement && new push

            min === innerIndentSize's first size && adjacentType checking
            indent: x (o) / * > (x)
            list: * x (o) / > (x)
            cite: > (o) / * x (x)
            -> true = next level
            -> false = change into lastElement && new push

            level checking
            */

            const beComparedRange = (treeArray[innerArrayAR].lastElement as IlElement).range
            
            if (!beComparedRange.isAdjacent(innerRange)) {
                const indentStruct = compileFirstARRow();
                treeArray[innerArrayAR].data = [[indentStruct], ...treeArray[innerArrayAR].data]
                continue;
            }

            // in array
            const firstRowElem = treeArray[innerArrayAR].data[0][0];
            // innerArray's elem
            const firstIndentSize = innerIndentSize[0].c;
            const firstType = innerSequence[0];

            if (!(firstIndentSize >= firstRowElem.count)) {
                const indentStruct = compileFirstARRow();
                treeArray[innerArrayAR].data = [[indentStruct], ...treeArray[innerArrayAR].data]
                continue;
            }

            const indentDisallowed = firstRowElem.type === "Indent" && (firstType === "Cite" || /List/.test(firstType))
            const citeDisallowed = firstRowElem.type === "Cite" && (firstType === "Indent" || /List/.test(firstType))
            const listDisallowed = /List/.test(firstType) && (firstType === "Cite")
            if (firstIndentSize === firstRowElem.count && (indentDisallowed || citeDisallowed || listDisallowed)) {
                const indentStruct = compileFirstARRow();
                treeArray[innerArrayAR].data = [[indentStruct], ...treeArray[innerArrayAR].data]
                continue;
            }

            // todo below
            /*
             * > * > asdf
             > > asdf
            */
        }
    }
}

export default [mappedProcessor, groupper] as GroupperReturnType