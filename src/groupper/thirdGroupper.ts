import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { BaseGroup, Group, GroupType } from "../elem";
import { textDecorationProcessor } from "../processor/textDecoration";
import { Range } from "../utils";

const mappedProcessor: ProcessorType = {
    Quote: [textDecorationProcessor],
    Underbar: [textDecorationProcessor],
    Tilde: [textDecorationProcessor],
    Carot: [textDecorationProcessor],
    Comma: [textDecorationProcessor],
    Hyphen: [textDecorationProcessor],
};
const groupper = (mark: NamuMark) => {
    for (let idx = 0; idx < mark.holderArray.length; idx++) {
        mark.holderArray = mark.holderArray.filter((v) => {
            if (v.ignore) {
                v.group.forEach((group) => mark.removeGroup({ group }));
                return false;
            }
            return true;
        });
        
        const elem = mark.holderArray[idx];
        if (elem.fixed) {
            continue;
        }

        const groupTokens: GroupType[] = [
            "DecoUnderbar",
            "DecoTilde",
            "DecoCarot",
            "DecoComma",
            "DecoHyphen",
            "DecoDoubleQuote",
            "DecoTripleQuote",
        ];
        const filteredGroup = elem.group.filter((v) => groupTokens.includes(v.type));

        for (const group of filteredGroup) {
            if (group.type === "DecoTripleQuote" && group.elems.length !== 6) {
                mark.removeGroup({ group: elem.group.find((v) => v.type === group.type) as Group<"DecoTripleQuote"> });
                continue;
            }
            if (group.type !== "DecoTripleQuote" && group.elems.length !== 4) {
                mark.removeGroup({ group: elem.group.find((v) => v.type === group.type) as BaseGroup });
                continue;
            }
            const startLocation = group.type === "DecoTripleQuote" ? 2 : 1;
            const endLocation = group.type === "DecoTripleQuote" ? 3 : 2;
            const start = mark.holderArray.findIndex((v) => v.uuid === group.elems[startLocation].uuid);
            const end = mark.holderArray.findIndex((v) => v.uuid === group.elems[endLocation].uuid);
            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log("deco")
            sliced.filter(v => v.type !== "Newline").forEach((v) => {
                if (v.group.filter((v) => groupTokens.includes(v.type)).length !== 0) {
                    v.ignore = true;
                } else {
                    v.availableRange = new Range(mark.holderArray[start].range.end, mark.holderArray[end].range.start)
                }
            });
        }

        for (const group of elem.group) {
            group.elems.forEach((v) => (v.fixed = true));
        }
    }
};

export default [mappedProcessor, groupper] as GroupperReturnType