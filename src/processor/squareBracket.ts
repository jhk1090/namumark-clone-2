import { NamuMark } from "..";
import { ProcessorProps } from ".";
import { Group, GroupPropertySingleSquareBracketNameType, HolderElem } from "../elem";
import { Range } from "../utils";

export const squareBracketOpenProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const squareBracketArray = mark.parserStore.squareBracketArray;

    const elem = mark.holderArray[props.idx];

    const adjBrackets = [elem];
    let lastRange: Range = elem.range;
    let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
    for (const subElem of mark.holderArray.slice(props.idx + 1)) {
        if (subElem.type === "SquareBracketOpen" && lastRange.isAdjacent(subElem.range)) {
            bracketCount++;
            if (bracketCount > 2) {
                // subElem.ignore = true;
            }
            adjBrackets.push(subElem);
            lastRange = subElem.range;
            continue;
        }
        break;
    }

    squareBracketArray.push({ value: adjBrackets, max: 0 });
    // 인접한 bracket은 pass해도 됨
    props.setIdx(props.idx + adjBrackets.length - 1);
};

export const squareBracketCloseProcessor = (mark: NamuMark, props: ProcessorProps) => {
    const squareBracketArray = mark.parserStore.squareBracketArray;

    const elem = mark.holderArray[props.idx];

    const adjBrackets = [elem];

    let lastRange: Range = elem.range;
    let bracketCount = 1; // 3 이상 부터는 모두 무쓸모
    for (const subElem of mark.holderArray.slice(props.idx + 1)) {
        if (subElem.type === "SquareBracketClose" && lastRange.isAdjacent(subElem.range)) {
            bracketCount++;
            if (bracketCount > 2) {
                // subElem.ignore = true;
            }
            adjBrackets.push(subElem);
            lastRange = subElem.range;
            continue;
        }
        break;
    }
    const firstItem = squareBracketArray[0];
    if (firstItem === undefined) {
        // adjBrackets.forEach((v) => (v.ignore = true));
        // 인접한 bracket은 pass해도 됨
        props.setIdx(props.idx + adjBrackets.length - 1);
        return;
    }

    for (const bracket of squareBracketArray) {
        const parseParenthesis = (group: Group<"SingleSquareBracket">) => {
            let parenthesisPair: [HolderElem?, HolderElem?] = [undefined, undefined];
            const startOrigin = mark.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
            const endOrigin = mark.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
            for (const subElem of mark.holderArray.slice(startOrigin, endOrigin)) {
                if (subElem.type === "ParenthesisOpen" && parenthesisPair[0] === undefined) {
                    parenthesisPair[0] = subElem;
                    continue;
                }

                if (subElem.type === "ParenthesisClose" && parenthesisPair[0] !== undefined) {
                    parenthesisPair[1] = subElem;
                    continue;
                }
            }
            const validMacroRegex =
                /^(clearfix|date|datetime|목차|tableofcontents|각주|footnote|br|pagecount|anchor|age|dday|youtube|kakaotv|nicovideo|vimeo|navertv|pagecount|math|include)$/g;
            const [pStart, pEnd] = parenthesisPair;
            if (!((pStart === undefined && pEnd === undefined) || (pStart !== undefined && pEnd !== undefined))) {
                return false;
            }
            if (pEnd !== undefined) {
                if (!pEnd.range.isAdjacent(adjBrackets[0].range)) {
                    return false;
                }
            }

            const result = validMacroRegex.exec(
                mark.wikiText.substring(
                    (bracket.value.at(-1)?.range.start as number) + 1,
                    pEnd === undefined ? adjBrackets[0].range.start : pStart?.range.start
                )
            );

            if (result === null) {
                return false;
            }
            
            const elems =
                pStart === undefined
                    ? [adjBrackets[0], bracket.value[0]]
                    : [adjBrackets[0], pStart as HolderElem, pEnd as HolderElem, bracket.value[0]];
            group.property = { name: result[0] as GroupPropertySingleSquareBracketNameType }
            mark.pushGroup({ group, elems });
            return true;
        };

        const prevMax = bracket.max;
        if (adjBrackets.length > bracket.max) {
            bracket.max = adjBrackets.length;
        } else {
            continue;
        }

        // 같은 개행 줄에 있는지 여부
        if (bracket.value[0].eolRange === adjBrackets[0].eolRange) {
            const group = new Group(bracket.value.length >= 2 && bracket.max >= 2 ? "DoubleSquareBracket" : "SingleSquareBracket");
            if (bracket.value.length >= 2 && bracket.max >= 2) {
                // 링크 문법
                const originIndex = mark.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                const elementIndex = mark.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                const firstPipeIndex = mark.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                const elems =
                    firstPipeIndex - originIndex === -1
                        ? [adjBrackets[0], adjBrackets[1], bracket.value[0], bracket.value[1]]
                        : [adjBrackets[0], adjBrackets[1], mark.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]];
                mark.pushGroup({ group, elems });
            } else {
                // 매크로 문법
                const isSucceed = parseParenthesis(group);
                if (!isSucceed) {
                    bracket.max = prevMax;
                    // adjBrackets.forEach((v) => (v.ignore = true));
                    continue;
                }
            }
        } else {
            if (bracket.value.length >= 2 && bracket.max >= 2) {
                // 링크
                const originIndex = mark.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                const elementIndex = mark.holderArray.findIndex((v) => v.uuid === adjBrackets[0].uuid);
                const firstPipeIndex = mark.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                if (firstPipeIndex - originIndex === -1) {
                    bracket.max = prevMax;
                    // adjBrackets.forEach((v) => (v.ignore = true));
                    continue;
                }

                const fromPipeToElemArray = mark.holderArray.slice(firstPipeIndex, elementIndex);
                let lock = false;
                const filteredArray = [];
                for (const element of fromPipeToElemArray) {
                    if (element.group.find((v) => v.type === "TripleBracket")) {
                        lock = !lock;
                        continue;
                    } else {
                        if (!lock) {
                            filteredArray.push(element);
                        }
                    }
                }

                // 개행문자가 들어가있는 경우
                if (filteredArray.filter((v) => v.type === "Newline").length !== 0) {
                    bracket.max = prevMax;
                    // adjBrackets.forEach((v) => (v.ignore = true));
                    continue;
                }

                const group = new Group("DoubleSquareBracket");
                mark.pushGroup({
                    group,
                    elems: [adjBrackets[0], adjBrackets[1], mark.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]],
                });
            } else {
                // 매크로
                const group = new Group("SingleSquareBracket");
                const isSucceed = parseParenthesis(group);
                if (!isSucceed) {
                    bracket.max = prevMax;
                    // adjBrackets.forEach((v) => (v.ignore = true));
                    continue;
                }
            }
        }

        if ((bracket.value.length >= 2 && bracket.max >= 2) || (bracket.value.length === 1 && bracket.max >= 1)) {
            mark.parserStore["squareBracketArray"] = squareBracketArray.filter((v) => v.value[0].range.start > adjBrackets[0].range.start);
            break;
        }
    }

    // 인접한 bracket은 pass해도 됨
    props.setIdx(props.idx + adjBrackets.length - 1);
};