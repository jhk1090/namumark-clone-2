import { NamuMark } from "../index.js";
import { IProcessorProps } from "./index.js";
import { Group, HolderElem, TGroupPropertySingleSquareBracketName } from "../elem.js";
import { Range } from "range-admin";

export function squareBracketOpenProcessor(this: NamuMark, props: IProcessorProps) {
    const squareBracketArray = this.parserStore.squareBracketArray;

    const elem = this.holderArray[props.index];

    const adjacentBrackets = [elem];
    let lastRange: Range = elem.range;
    let bracketStack = 1; // 3 이상 부터는 모두 무쓸모
    for (const subElem of this.holderArray.slice(props.index + 1)) {
        if (subElem.type === "SquareBracketOpen" && lastRange.isAdjacent(subElem.range)) {
            bracketStack++;
            adjacentBrackets.push(subElem);
            lastRange = subElem.range;
            continue;
        }
        break;
    }

    squareBracketArray.push({ value: adjacentBrackets, max: 0 });
    // 인접한 bracket은 pass해도 됨
    props.setIndex(props.index + adjacentBrackets.length - 1);
};

export function squareBracketCloseProcessor(this: NamuMark, props: IProcessorProps) {
    const squareBracketArray = this.parserStore.squareBracketArray;

    const elem = this.holderArray[props.index];

    const adjacentBrackets = [elem];

    let lastRange: Range = elem.range;
    let bracketStack = 1; // 3 이상 부터는 모두 무쓸모
    for (const subElem of this.holderArray.slice(props.index + 1)) {
        if (subElem.type === "SquareBracketClose" && lastRange.isAdjacent(subElem.range)) {
            bracketStack++;
            adjacentBrackets.push(subElem);
            lastRange = subElem.range;
            continue;
        }
        break;
    }
    
    const firstOpenItem = squareBracketArray[0];
    if (firstOpenItem === undefined) {
        props.setIndex(props.index + adjacentBrackets.length - 1);
        return;
    }

    for (const bracket of squareBracketArray) {
        const parseParenthesis = (group: Group<"SingleSquareBracket">) => {
            let parenthesisPair: [HolderElem?, HolderElem?] = [undefined, undefined];
            const startOrigin = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
            const endOrigin = this.holderArray.findIndex((v) => v.uuid === adjacentBrackets[0].uuid);
            for (const subElem of this.holderArray.slice(startOrigin, endOrigin)) {
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
                if (!pEnd.range.isAdjacent(adjacentBrackets[0].range)) {
                    return false;
                }
            }

            const result = validMacroRegex.exec(
                this.wikiText.substring(
                    (bracket.value.at(-1)?.range.start as number) + 1,
                    pEnd === undefined ? adjacentBrackets[0].range.start : pStart?.range.start
                )
            );

            if (result === null) {
                return false;
            }
            
            const elems =
                pStart === undefined
                    ? [adjacentBrackets[0], bracket.value[0]]
                    : [adjacentBrackets[0], pStart as HolderElem, pEnd as HolderElem, bracket.value[0]];
            group.property = { name: result[0] as TGroupPropertySingleSquareBracketName }
            this.pushGroup({ group, elems });
            return true;
        };

        const prevMax = bracket.max;
        if (adjacentBrackets.length > prevMax) {
            bracket.max = adjacentBrackets.length;
        } else {
            continue;
        }

        // 같은 개행 줄에 있는지 여부
        if (bracket.value[0].rowRange.isEqual(adjacentBrackets[0].rowRange)) {
            const isLink = bracket.value.length >= 2 && bracket.max >= 2
            const group = new Group(isLink ? "DoubleSquareBracket" : "SingleSquareBracket");
            if (isLink) {
                // 링크 문법
                const originIndex = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                const elementIndex = this.holderArray.findIndex((v) => v.uuid === adjacentBrackets[0].uuid);
                const firstPipeIndex = this.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;
                const elems =
                    firstPipeIndex - originIndex === -1
                        ? [adjacentBrackets[0], adjacentBrackets[1], bracket.value[0], bracket.value[1]]
                        : [adjacentBrackets[0], adjacentBrackets[1], this.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]];
                this.pushGroup({ group, elems });
            } else {
                // 매크로 문법
                const isSucceed = parseParenthesis(group);
                if (!isSucceed) {
                    bracket.max = prevMax;
                    continue;
                }
            }
        } else {
            const isLink = bracket.value.length >= 2 && bracket.max >= 2
            if (isLink) {
                // 링크
                const originIndex = this.holderArray.findIndex((v) => v.uuid === bracket.value[0].uuid);
                const elementIndex = this.holderArray.findIndex((v) => v.uuid === adjacentBrackets[0].uuid);
                const firstPipeIndex = this.holderArray.slice(originIndex, elementIndex).findIndex((v) => v.type === "Pipe") + originIndex;

                /* [[

                ]] 개행 중 파이프 없음 */
                if (firstPipeIndex - originIndex === -1) {
                    bracket.max = prevMax;
                    continue;
                }

                const fromPipeToElemArray = this.holderArray.slice(firstPipeIndex, elementIndex);
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
                this.pushGroup({
                    group,
                    elems: [adjacentBrackets[0], adjacentBrackets[1], this.holderArray[firstPipeIndex], bracket.value[0], bracket.value[1]],
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
            this.parserStore["squareBracketArray"] = squareBracketArray.filter((v) => v.value[0].range.start > adjacentBrackets[0].range.start);
            break;
        }
    }

    // 인접한 bracket은 pass해도 됨
    props.setIndex(props.index + adjacentBrackets.length - 1);
};