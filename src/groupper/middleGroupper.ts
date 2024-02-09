import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { indentlikeProcessor } from "../processor/indentlike";

const mappedProcessor: ProcessorType = {
    "Newline>Cite": [ indentlikeProcessor ],
    "Newline>Indent": [ indentlikeProcessor ]
}

const groupper = (mark: NamuMark) => {
    for (const [innerArrayAR, innerArray] of Object.entries(mark.parserStore.indentlikeArray)) {
        for (const innerElem of innerArray) {
            
        }
    }
}

export default [mappedProcessor, groupper] as GroupperReturnType