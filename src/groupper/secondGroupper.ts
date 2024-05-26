import { TGroupperTuple, TProcessorMap } from "./index.js";
import { NamuMark } from "../index.js";
import { footnoteCloseProcessor, footnoteOpenProcessor } from "../processor/footnote.js";
import { Range } from "range-admin";

const mappedProcessor: TProcessorMap = {
    FootnoteOpen: [footnoteOpenProcessor],
    SquareBracketClose: [footnoteCloseProcessor],
};

function groupper(this: NamuMark) {
    for (let idx = 0; idx < this.holderArray.length; idx++) {
        const elem = this.holderArray[idx];
        if (elem.immutable) {
            continue;
        }

        const footnoteGroup = elem.group.find((v) => v.type === "Footnote");
        if (footnoteGroup !== undefined) {
            if (footnoteGroup.elems.length !== 3) {
                this.removeGroup({ group: footnoteGroup });
                continue;
            }

            const start = this.holderArray.findIndex((v) => v.uuid === footnoteGroup.elems[1].uuid);
            const end = this.holderArray.findIndex((v) => v.uuid === footnoteGroup.elems[2].uuid);
            const sliced = this.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log('footnote')
            sliced.forEach((v) => (v.layerRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start)));
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