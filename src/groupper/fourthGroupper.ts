import { tableArgumentCloseProcessor, tableArgumentOpenProcessor, tableNewlineProcessor, tablePipeProcessor } from "../processor/table.js";
import { BaseGroup, Group, HolderElem } from "../elem.js";
import { NamuMark } from "../index.js";
import { TGroupperTuple, TProcessorMap } from "./index.js";
import { Range } from "range-admin";

const mappedProcessor: TProcessorMap = {
    Pipe: [tablePipeProcessor],
    Newline: [tableNewlineProcessor],
    TableArgumentOpen: [tableArgumentOpenProcessor],
    TableArgumentClose: [tableArgumentCloseProcessor]
}

function groupper(this: NamuMark) {
    const tableArray = this.parserStore.tableArray;
    for (const elem of Object.values(tableArray)) {
        if (elem.data.length === 0) {
            continue;
        }
        for (const value of elem.data) {
            if (value.length === 0 || value.length === 2) {
                continue;
            }

            this.pushGroup({ group: new Group("TableRow"), elems: [ ...value.filter(v => v.group.find(v => v.type === "TableRow") === undefined) ] })

            const last = value.findLast(v => v.type === "Pipe")
            if (last === undefined) {
                continue;
            }

            let substrText = "";
            // global
            if (last.layerRange.end === -999) {
                substrText = this.wikiText.substring(last.range.start, last.rowRange.end - 1);
            } else {
                if (last.rowRange.end - 1 > last.layerRange.end) {
                    substrText = this.wikiText.substring(last.range.start, last.layerRange.end)
                } else {
                    substrText = this.wikiText.substring(last.range.start, last.rowRange.end - 1);
                }
            }

            if (substrText !== "|") {
                const foundGroup = last.group.find(v => v.type === "TableRow") as Group<"TableRow">
                const argumentGroups: BaseGroup[] = []
                foundGroup.elems.forEach(v => {
                    const argumentGroup = v.group.find(v => v.type === "TableArgument")
                    if (argumentGroup !== undefined) {
                        argumentGroups.push(argumentGroup)
                    }
                })
                argumentGroups.forEach(group => this.removeGroup({ group }))
                this.removeGroup({ group: foundGroup })
            }

            const filtered = value.filter(v => v.group.find(v => v.type === "TableRow") !== undefined )

            const mappedResult: HolderElem[][] = [];
            let current: HolderElem[] = [];
            let fulfilled = false;

            for (const element of filtered) {
                if (current.length >= 2) {
                    fulfilled = true;
                }
                if (!fulfilled && element.type === "Pipe") {
                    current.push(element)
                    continue;
                }
                if (fulfilled && element.type === "Pipe") {
                    mappedResult.push(current)
                    fulfilled = false;
                    current = [element];
                    continue;
                }
                if (element.type === "TableArgumentOpen") {
                    current.push(element)
                    continue;
                }
                if (element.type === "TableArgumentClose") {
                    current.push(element)
                    continue;
                }
            }

            if (current.length >= 2) {
                mappedResult.push(current)
            }

            // console.log(util.inspect(mappedResult, false, 4, true))

            const boundaryIndexes: [number, number][] = [];

            for (let i = 0; i < mappedResult.length; i++) {
                const cur = mappedResult[i];                   
                const next = mappedResult[i + 1];
                if (cur === undefined || next === undefined) {
                    break;
                }

                const start = this.holderArray.findIndex(v => v.uuid === cur[cur.length - 1].uuid)
                const end = this.holderArray.findIndex(v => v.uuid === next[0].uuid)
                boundaryIndexes.push([start, end])
            }
            
            boundaryIndexes.forEach((indexes) => {
                const sliced = this.holderArray.slice(indexes[0], indexes[1] + 1).filter(v => v.layerRange.isEqual(new Range(-1000, -999))).toSpliced(0, 1).toSpliced(-1, 1);
                sliced.forEach(v => v.layerRange = new Range(this.holderArray[indexes[0]].range.end, this.holderArray[indexes[1]].range.start))
            })


            this.pushGroup({ group: new Group("Table"), elems: [...filtered] })
        }
    }

    // 마지막이라서 grouping 할 필요 없음
}

export default [mappedProcessor, groupper] as TGroupperTuple