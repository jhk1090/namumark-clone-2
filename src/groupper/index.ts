import { THolderTag } from "../elem"
import { IProcessorProps } from "../processor/index"

export type TProcessorMap = { [k in THolderTag]?: ((props: IProcessorProps) => void)[] };

export type TGroupperTuple = [TProcessorMap, () => void]