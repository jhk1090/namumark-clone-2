import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group, HolderType } from "../elem";

export const tablePipeProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tableArray = mark.parserStore.tableArray;

    const elem = mark.holderArray[props.idx];
    const next = mark.holderArray[props.idx + 1];
    if (next.type !== "Pipe") {
        return;
    }
    
    const adjNext = mark.wikiText[next.range.end];
    const adjPipe = [elem, next]
    const currentTable = tableArray[elem.availableRange.toString()]

    if (currentTable === undefined || currentTable.data[0].length === 0) {
        if (mark.wikiText.substring(elem.eolRange.start, elem.range.end).trim() !== "|") {
            props.setIdx(props.idx + adjPipe.length - 1);
            return;
        }              
    }

    if (currentTable === undefined) {
        // if (adjNext !== "\n") {
        const precedeEndlineIndex = mark.holderArray.slice(0, props.idx).findLastIndex(v => v.type === "Newline");
        const indents = mark.holderArray.slice(precedeEndlineIndex, props.idx).filter(v => v.type === "Indent" || v.type === "CiteIndent" || v.type === "ListIndent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        tableArray[elem.availableRange.toString()] = {indentSequence, rowStartIndex: 0, data: [[...adjPipe]], isTableEnd: false, argumentHolder: null}
        // }
        props.setIdx(props.idx + adjPipe.length - 1);
        return;
    }

    if (currentTable.data[0].length === 0) {
        const precedeEndlineIndex = mark.holderArray.slice(0, props.idx).findLastIndex(v => v.type === "Newline");
        const indents = mark.holderArray.slice(precedeEndlineIndex, props.idx).filter(v => v.type === "Indent" || v.type === "CiteIndent" || v.type === "ListIndent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        tableArray[elem.availableRange.toString()].indentSequence = indentSequence;
    }

    if (currentTable.isTableEnd) {
        const precedeEndlineIndex = mark.holderArray.slice(0, props.idx).findLastIndex(v => v.type === "Newline");
        const indents = mark.holderArray.slice(precedeEndlineIndex, props.idx).filter(v => v.type === "Indent" || v.type === "CiteIndent" || v.type === "ListIndent");
        const indentSequence = indents.map(v => { return {count: v.range.end - v.range.start, type: v.type} }) ?? [];

        const isSequenceEqual = (x: {count: number; type: HolderType}[], y: {count: number; type: HolderType}[]) => {
            if (x.length === 0 && y.length === 0) {
                return true;
            }

            if ((x.length === 0 && y.length > 0) || (x.length > 0 && y.length === 0)) {
                return false;
            }

            if (x.filter(v => v.type === "ListIndent").length > 0 && y.filter(v => v.type === "ListIndent").length > 0) {
                return false;
            }

            x = x.map(v => v.type === "ListIndent" ? { count: v.count - 1, type: v.type } : v )
            y = y.map(v => v.type === "ListIndent" ? { count: v.count - 1, type: v.type } : v )
            
            if (x.reduce((acc, cur) => acc + cur.count, 0) !== y.reduce((acc, cur) => acc + cur.count, 0)) {
                return false;
            }
            
            let xidx = 0;
            let xcount = x[xidx].count;
            let yidx = 0;
            let ycount = y[yidx].count;

            while (true) {
                if (x[xidx].type !== "ListIndent" && y[yidx].type !== "ListIndent" && x[xidx].type !== y[yidx].type) {
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
            tableArray[elem.availableRange.toString()].rowStartIndex = currentTable.data[0].length;
            currentTable.isTableEnd = false;
        } else {
            tableArray[elem.availableRange.toString()] = { indentSequence, data: [[...adjPipe], ...currentTable.data], rowStartIndex: 0, isTableEnd: false, argumentHolder: null }
            props.setIdx(props.idx + adjPipe.length - 1);
            return;
        }
    }

    const start = mark.holderArray.findIndex(v => v.uuid === currentTable.data[0].at(-1)?.uuid);
    const end = mark.holderArray.findIndex(v => v.uuid === adjPipe[0].uuid);
    const sliced = mark.holderArray.slice(start, end + 1).toSpliced(0, 1).toSpliced(-1, 1);
    const filteredSliced = sliced.filter(v => v.group.find(v => v.type === "Heading") !== undefined);
    if (filteredSliced.length === 0) {
        tableArray[elem.availableRange.toString()].data[0].push(...adjPipe)
    } else {
        // ||<asdf> ||
        const lastPipeIndex = currentTable.data[0].findLastIndex(v => v.type === "Pipe") - 1
        const found = currentTable.data[0].slice(lastPipeIndex).find(v => v.type === "TableArgumentOpen")
        if (found !== undefined) {
            mark.removeGroup({ group: found.group.find((v) => v.type === "TableArgument") as Group<"TableArgument"> });
        }

        tableArray[elem.availableRange.toString()].data[0] = currentTable.data[0].slice(0, lastPipeIndex)
        tableArray[elem.availableRange.toString()].data[0].push(...adjPipe)
    }
    props.setIdx(props.idx + adjPipe.length - 1);
    return;
}    
export const tableNewlineProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tableArray = mark.parserStore.tableArray;

    const prev = mark.holderArray[props.idx - 1];
    const elem = mark.holderArray[props.idx];
    if (prev === undefined) {
        return;
    }

    const currentTable = tableArray[elem.availableRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    if (currentTable.isTableEnd) {
        tableArray[elem.availableRange.toString()] = { indentSequence: null, data: [[], ...currentTable.data], rowStartIndex: 0, isTableEnd: false, argumentHolder: null }
        return;
    }

    if (!(currentTable.data[0].slice(currentTable.rowStartIndex).length === 2 && currentTable.data[0].length === 2) && prev.type === "Pipe" && prev.range.isAdjacent(elem.range)) {
        mark.pushGroup({group: new Group("TableRow"), elems: [ ...currentTable.data[0].slice(currentTable.rowStartIndex) ]})
        tableArray[elem.availableRange.toString()].isTableEnd = true;
        return;
    }
}

export const tableArgumentOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tableArray = mark.parserStore.tableArray;

    const elem = mark.holderArray[props.idx];

    const currentTable = tableArray[elem.availableRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    const argumentHolder = currentTable.argumentHolder;
    if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
        if (argumentHolder !== null && !argumentHolder.range.isAdjacent(elem.range)) {
            return;
        }
        tableArray[elem.availableRange.toString()].argumentHolder = elem;
        return;
    }

    tableArray[elem.availableRange.toString()].argumentHolder = null;
    return;
}

export const tableArgumentCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const tableArray = mark.parserStore.tableArray;
    
    const elem = mark.holderArray[props.idx];

    const currentTable = tableArray[elem.availableRange.toString()]
    if (currentTable === undefined || currentTable.data[0].length === 0) {
        return;
    }

    const argumentHolder = currentTable.argumentHolder;
    if (argumentHolder === null || argumentHolder.type === "TableArgumentClose") {
        tableArray[elem.availableRange.toString()].argumentHolder = null;
        return;
    }

    const argument = [argumentHolder, elem]
    mark.pushGroup({ group: new Group("TableArgument"), elems: [...argument] })
    tableArray[elem.availableRange.toString()].data[0].push(...argument)
    tableArray[elem.availableRange.toString()].argumentHolder = null;
}