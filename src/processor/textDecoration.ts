import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group } from "../elem.js";
import { Range } from "range-admin";

export function textDecorationProcessor(this: NamuMark, props: IProcessorProps) {
    const decoArray = this.parserStore.decoArray;

    const elem = this.holderArray[props.index];
    const elemType = elem.type as "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma";

    const adjDecoration = [elem];

    let lastRange: Range = elem.range;
    let decoCount = 1;
    const decoCountMax = elemType === "Quote" ? 3 : 2;
    for (const subElem of this.holderArray.slice(props.index + 1)) {
        if (decoCount === decoCountMax) {
            break;
        }
        if (subElem.type === elem.type && lastRange.isAdjacent(subElem.range)) {
            decoCount++;
            adjDecoration.push(subElem);
            lastRange = subElem.range;
            continue;
        }
        break;
    }

    if (adjDecoration.length < 2) {
        props.setIndex(props.index + adjDecoration.length - 1);
        return;
    }

    if (elemType !== "Quote") {
        let referencedArray = decoArray[elemType];

        if (referencedArray.length === 0 || !(referencedArray[0].rowRange.isEqual(elem.rowRange)) || !(referencedArray[0].layerRange.isEqual(elem.layerRange))) {
            decoArray[elemType] = [...adjDecoration];
            props.setIndex(props.index + adjDecoration.length - 1);
            return;
        }

        this.pushGroup({ group: new Group(`Deco${elemType}`), elems: [...referencedArray, ...adjDecoration] });
        decoArray[elemType] = [];

        props.setIndex(props.index + adjDecoration.length - 1);
    } else {
        let referencedArray = decoArray[elemType];

        if (referencedArray.length === 0 || !(referencedArray[0].rowRange.isEqual(elem.rowRange)) || !(referencedArray[0].layerRange.isEqual(elem.layerRange))) {
            decoArray[elemType] = [...adjDecoration];
            props.setIndex(props.index + adjDecoration.length - 1);
            return;
        }

        let correspondedGroup = new Group(
            referencedArray.length === 3 && adjDecoration.length === 3 ? "DecoTripleQuote" : "DecoDoubleQuote"
        );

        if (referencedArray.length > adjDecoration.length) {
            // ''' asdf ''
            this.pushGroup({
                group: correspondedGroup,
                elems: [...referencedArray.slice(Number(`-${adjDecoration.length}`)), ...adjDecoration],
            });
            decoArray[elemType] = [];

            props.setIndex(props.index + adjDecoration.length - 1);
        } else {
            // '' asdf '' || '' asdf '''
            this.pushGroup({ group: correspondedGroup, elems: [...referencedArray, ...adjDecoration.slice(0, referencedArray.length)] });
            decoArray[elemType] = [];

            props.setIndex(props.index + referencedArray.length - 1);
        }
    }
};