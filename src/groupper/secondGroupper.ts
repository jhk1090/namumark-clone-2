import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { footnoteCloseProcessor, footnoteOpenProcessor } from "../processor/footnote";
import { Range } from "../utils";

const mappedProcessor: ProcessorType = {
    FootnoteOpen: [footnoteOpenProcessor],
    SquareBracketClose: [footnoteCloseProcessor],
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

        const footnote = elem.group.find((v) => v.type === "Footnote");
        if (footnote !== undefined) {
            if (footnote.elems.length !== 3) {
                mark.removeGroup({ group: footnote });
                continue;
            }

            const start = mark.holderArray.findIndex((v) => v.uuid === footnote.elems[1].uuid);
            const end = mark.holderArray.findIndex((v) => v.uuid === footnote.elems[2].uuid);
            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log('footnote')
            sliced.forEach((v) => (v.availableRange = new Range(mark.holderArray[start].range.end, mark.holderArray[end].range.start)));
        }

        for (const group of elem.group) {
            group.elems.forEach((v) => (v.fixed = true));
        }
    }
};

export default [mappedProcessor, groupper] as GroupperReturnType