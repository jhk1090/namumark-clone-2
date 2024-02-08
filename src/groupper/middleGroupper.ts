import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { indentlikeProcessor } from "../processor/indentlike";

const mappedProcessor: ProcessorType = {
    "Newline>Cite": [ indentlikeProcessor ],
    "Newline>Indent": [ indentlikeProcessor ]
}

const groupper = (mark: NamuMark) => {
}

export default [mappedProcessor, groupper] as GroupperReturnType