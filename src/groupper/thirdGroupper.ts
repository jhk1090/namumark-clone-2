import { textDecorationProcessor } from "../processor/textDecoration.js";
import { Range } from "range-admin";
import { TGroupperTuple, TProcessorMap } from "./index.js";
import { NamuMark } from "../index.js";
import { BaseGroup, Group, TGroupTag } from "../elem.js";

const mappedProcessor: TProcessorMap = {
    Quote: [textDecorationProcessor],
    Underbar: [textDecorationProcessor],
    Tilde: [textDecorationProcessor],
    Carot: [textDecorationProcessor],
    Comma: [textDecorationProcessor],
    Hyphen: [textDecorationProcessor],
};
function groupper(this: NamuMark) {
    for (let idx = 0; idx < this.holderArray.length; idx++) {
        const elem = this.holderArray[idx];
        if (elem.immutable) {
            continue;
        }

        const groupTokens: TGroupTag[] = [
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
                this.removeGroup({ group: elem.group.find((v) => v.type === group.type) as Group<"DecoTripleQuote"> });
                continue;
            }
            if (group.type !== "DecoTripleQuote" && group.elems.length !== 4) {
                this.removeGroup({ group: elem.group.find((v) => v.type === group.type) as BaseGroup });
                continue;
            }
            const startLocation = group.type === "DecoTripleQuote" ? 2 : 1;
            const endLocation = group.type === "DecoTripleQuote" ? 3 : 2;
            const start = this.holderArray.findIndex((v) => v.uuid === group.elems[startLocation].uuid);
            const end = this.holderArray.findIndex((v) => v.uuid === group.elems[endLocation].uuid);
            const sliced = this.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log("deco")
            sliced.filter(v => v.type !== "Newline").forEach((v) => {
                if (v.group.filter((v) => groupTokens.includes(v.type)).length !== 0) {
                    v.ignore = true;
                } else {
                    v.layerRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start)
                }
            });
        }

        for (const group of elem.group) {
            group.elems.forEach((v) => (v.immutable = true));
        }

        this.holderArray = this.holderArray.filter(v => {
            if (v.ignore) {
                v.group.forEach(group => this.removeGroup({ group }));
                return false;
            }
            return true;
        })
    }
};

export default [mappedProcessor, groupper] as TGroupperTuple