import { NamuMark } from "..";
import { HolderElem, HolderType } from "../elem";
import { ProcessorProps } from "../processor";

export type ProcessorType = { [k in HolderType]?: ((mark: NamuMark, props: ProcessorProps) => void)[] };

export type GroupperReturnType = [ProcessorType, (mark: NamuMark) => void]