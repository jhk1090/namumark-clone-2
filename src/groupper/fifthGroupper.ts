import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { indentNewlineProcessor } from "../processor/indent";

const mappedProcessor: ProcessorType = {
    Newline: [ indentNewlineProcessor ]
}

const groupper = (mark: NamuMark) => {
}

export default [mappedProcessor, groupper] as GroupperReturnType