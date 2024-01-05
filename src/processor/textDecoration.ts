import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group } from "../elem";
import { Range } from "../utils";

export const textDecorationProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const decoArray = mark.parserStore.decoArray;

    const elem = mark.holderArray[props.idx];
    const elemType = elem.type as "Quote" | "Underbar" | "Hyphen" | "Tilde" | "Carot" | "Comma";

    const adjDecoration = [elem];

    let lastRange: Range = elem.range;
    let decoCount = 1;
    const decoCountMax = elemType === "Quote" ? 3 : 2;
    for (const subElem of mark.holderArray.slice(props.idx + 1)) {
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
        props.setIdx(props.idx + adjDecoration.length - 1);
        return;
    }

    if (elemType !== "Quote") {
        let referencedArray = decoArray[elemType];

        if (referencedArray.length === 0 || !(referencedArray[0].eolRange.isSame(elem.eolRange)) || !(referencedArray[0].availableRange.isSame(elem.availableRange))) {
            decoArray[elemType] = [...adjDecoration];
            props.setIdx(props.idx + adjDecoration.length - 1);
            return;
        }

        mark.pushGroup({ group: new Group(`Deco${elemType}`), elems: [...referencedArray, ...adjDecoration] });
        decoArray[elemType] = [];

        props.setIdx(props.idx + adjDecoration.length - 1);
    } else {
        let referencedArray = decoArray[elemType];

        if (referencedArray.length === 0 || !(referencedArray[0].eolRange.isSame(elem.eolRange)) || !(referencedArray[0].availableRange.isSame(elem.availableRange))) {
            decoArray[elemType] = [...adjDecoration];
            props.setIdx(props.idx + adjDecoration.length - 1);
            return;
        }

        let correspondedGroup = new Group(
            referencedArray.length === 3 && adjDecoration.length === 3 ? "DecoTripleQuote" : "DecoDoubleQuote"
        );

        if (referencedArray.length > adjDecoration.length) {
            // ''' asdf ''
            mark.pushGroup({
                group: correspondedGroup,
                elems: [...referencedArray.slice(Number(`-${adjDecoration.length}`)), ...adjDecoration],
            });
            decoArray[elemType] = [];

            props.setIdx(props.idx + adjDecoration.length - 1);
        } else {
            // '' asdf '' || '' asdf '''
            mark.pushGroup({ group: correspondedGroup, elems: [...referencedArray, ...adjDecoration.slice(0, referencedArray.length)] });
            decoArray[elemType] = [];

            props.setIdx(props.idx + referencedArray.length - 1);
        }
    }
};