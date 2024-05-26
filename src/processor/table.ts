import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group, THolderTag } from "../elem.js";

export function tablePipeProcessor(this: NamuMark, props: IProcessorProps) {
    const tableArray = this.parserStore.tableArray;

    const elem = this.holderArray[props.index];
    const next = this.holderArray[props.index + 1];
    if (next.type !== "Pipe") {
        return;
    }
    
    const adjNext = this.wikiText[next.range.end];
    const adjPipe = [elem, next]
    const currentTable = tableArray[elem.layerRange.toString()]

    if (currentTable === undefined || currentTable.data[0].length === 0) {
        if (this.wikiText.substring(elem.rowRange.start, elem.range.end).trim() !== "|") {
            props.setIndex(props.index + adjPipe.length - 1);
            return;
        }              
    }

    if (currentTable === undefined) {
        // if (adjNext !== "\n") {
        const precedeEndlineIndex = this.holderArray.slice(0, props.index).findLastIndex(v => v.type === "Newline");
        const indents = this.holderArray.slice(precedeEndlineIndex, props.index).filter(v => v.type === "Newline>Indent" || v.type === "Cite>Indent" || v.type === "List>Indent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        tableArray[elem.layerRange.toString()] = {indentSequence, rowStartIndex: 0, data: [[...adjPipe]], isTableEnd: false, argumentHolder: null}
        // }
        props.setIndex(props.index + adjPipe.length - 1);
        return;
    }

    if (currentTable.data[0].length === 0) {
        const precedeEndlineIndex = this.holderArray.slice(0, props.index).findLastIndex(v => v.type === "Newline");
        const indents = this.holderArray.slice(precedeEndlineIndex, props.index).filter(v => v.type === "Newline>Indent" || v.type === "Cite>Indent" || v.type === "List>Indent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        tableArray[elem.layerRange.toString()].indentSequence = indentSequence;
    }

    if (currentTable.isTableEnd) {
        const precedeEndlineIndex = this.holderArray.slice(0, props.index).findLastIndex(v => v.type === "Newline");
        const indents = this.holderArray.slice(precedeEndlineIndex, props.index).filter(v => v.type === "Newline>Indent" || v.type === "Cite>Indent" || v.type === "List>Indent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        const isSequenceEqual = (x: {count: number; type: THolderTag}[], y: {count: number; type: THolderTag}[]) => {
            if (x.length === 0 && y.length === 0) {
                return true;
            }

            if ((x.length === 0 && y.length > 0) || (x.length > 0 && y.length === 0)) {
                return false;
            }

            if (x.filter(v => v.type === "List>Indent").length > 0 && y.filter(v => v.type === "List>Indent").length > 0) {
                return false;
            }

            x = x.map(v => v.type === "List>Indent" ? { count: v.count - 1, type: v.type } : v )
            y = y.map(v => v.type === "List>Indent" ? { count: v.count - 1, type: v.type } : v )
            
            if (x.reduce((acc, cur) => acc + cur.count, 0) !== y.reduce((acc, cur) => acc + cur.count, 0)) {
                return false;
            }
            
            let xidx = 0;
            let xcount = x[xidx].count;
            let yidx = 0;
            let ycount = y[yidx].count;

            while (true) {
                if (x[xidx].type !== "List>Indent" && y[yidx].type !== "List>Indent" && x[xidx].type !== y[yidx].type) {
                    return false;
                }
                if (xcount < ycount) {
                    xcount = 0;
                    ycount = ycount - xcount
                    xidx++;
                    if (x[xidx] === undefined) {
                        break;
                    }
                    xcount = x[xidx].count;
                    continue;
                }
                if (xcount > ycount) {
                    xcount = xcount - ycount
                    ycount = 0;
                    yidx++;
                    if (y[yidx] === undefined) {
                        break;
                    }
                    ycount = y[yidx].count;
                    continue;
                }
                if (xcount === ycount) {
                    xidx++;
                    yidx++;
                    xcount = 0;
                    ycount = 0;
                    if (x[xidx] === undefined || y[yidx] === undefined) {
                        break;
                    }
                    xcount = x[xidx].count;
                    ycount = y[yidx].count;
                    continue;
                }
            }

            if (xcount === 0 && ycount === 0) {
                return true;
            } else {
                return false;
            }
        }

        if (isSequenceEqual([...indentSequence], [...(currentTable.indentSequence ?? [])])) {
            tableArray[elem.layerRange.toString()].rowStartIndex = currentTable.data[0].length;
            currentTable.isTableEnd = false;
        } else {
            tableArray[elem.layerRange.toString()] = { indentSequence, data: [[...adjPipe], ...currentTable.data], rowStartIndex: 0, isTableEnd: false, argumentHolder: null }
            props.setIndex(props.index + adjPipe.length - 1);
            return;
        }
    }

    const start = this.holderArray.findIndex(v => v.uuid === currentTable.data[0].at(-1)?.uuid);
    const end = this.holderArray.findIndex(v => v.uuid === adjPipe[0].uuid);
    const sliced = this.holderArray.slice(start, end + 1).toSpliced(0, 1).toSpliced(-1, 1);
    const filteredSliced = sliced.filter(v => v.group.find(v => v.type === "Heading") !== undefined);
    if (filteredSliced.length === 0) {
        tableArray[elem.layerRange.toString()].data[0].push(...adjPipe)
    } else {
        // ||<asdf> ||
        const lastPipeIndex = currentTable.data[0].findLastIndex(v => v.type === "Pipe") - 1
        const found = currentTable.data[0].slice(lastPipeIndex).find(v => v.type === "TableArgumentOpen")
        if (found !== undefined) {
            this.removeGroup({ group: found.group.find((v) => v.type === "TableArgument") as Group<"TableArgument"> });
        }

        tableArray[elem.layerRange.toString()].data[0] = currentTable.data[0].slice(0, lastPipeIndex)
        tableArray[elem.layerRange.toString()].data[0].push(...adjPipe)
    }
    props.setIndex(props.index + adjPipe.length - 1);
    return;
}    
export function tableNewlineProcessor(this: NamuMark, props: IProcessorProps) {
    const tableArray = this.parserStore.tableArray;

    const prev = this.holderArray[props.index - 1];
    const elem = this.holderArray[props.index];
    if (prev === undefined) {
        return;
    }

    const currentTable = tableArray[elem.layerRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    if (currentTable.isTableEnd) {
        tableArray[elem.layerRange.toString()] = { indentSequence: null, data: [[], ...currentTable.data], rowStartIndex: 0, isTableEnd: false, argumentHolder: null }
        return;
    }

    if (!(currentTable.data[0].slice(currentTable.rowStartIndex).length === 2 && currentTable.data[0].length === 2) && prev.type === "Pipe" && prev.range.isAdjacent(elem.range)) {
        this.pushGroup({group: new Group("TableRow"), elems: [ ...currentTable.data[0].slice(currentTable.rowStartIndex) ]})
        tableArray[elem.layerRange.toString()].isTableEnd = true;
        return;
    }
}

export function tableArgumentOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const tableArray = this.parserStore.tableArray;

    const elem = this.holderArray[props.index];

    const currentTable = tableArray[elem.layerRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    const argumentHolder = currentTable.argumentHolder;
    if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
        if (argumentHolder !== null && !argumentHolder.range.isAdjacent(elem.range)) {
            return;
        }
        tableArray[elem.layerRange.toString()].argumentHolder = elem;
        return;
    }

    tableArray[elem.layerRange.toString()].argumentHolder = null;
    return;
}

export function tableArgumentCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const tableArray = this.parserStore.tableArray;
    
    const elem = this.holderArray[props.index];

    const currentTable = tableArray[elem.layerRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    const argumentHolder = currentTable.argumentHolder;
    if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
        tableArray[elem.layerRange.toString()].argumentHolder = null;
        return;
    }

    const argument = [argumentHolder, elem]
    this.pushGroup({ group: new Group("TableArgument"), elems: [...argument] })
    tableArray[elem.layerRange.toString()].data[0].push(...argument)
    tableArray[elem.layerRange.toString()].argumentHolder = null;
}