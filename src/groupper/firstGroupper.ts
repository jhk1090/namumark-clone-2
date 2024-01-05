import { GroupperReturnType, ProcessorType } from ".";
import { NamuMark } from "..";
import { Group, HolderElem } from "../elem";
import { commentProcessor } from "../processor/comment";
import { escapeProcessor } from "../processor/escape";
import { headingCloseProcessor, headingOpenProcessor } from "../processor/heading";
import { mathtagCloseProcessor, mathtagOpenProcessor } from "../processor/mathtag";
import { squareBracketCloseProcessor, squareBracketOpenProcessor } from "../processor/squareBracket";
import { tripleBracketCloseProcessor, tripleBracketOpenProcessor } from "../processor/tripleBracket";
import { Range } from "../utils";

const mappedProcessor: ProcessorType = {
    Comment: [commentProcessor],
    Escape: [escapeProcessor],
    TripleBracketOpen: [tripleBracketOpenProcessor],
    TripleBracketClose: [tripleBracketCloseProcessor],
    SquareBracketOpen: [squareBracketOpenProcessor],
    SquareBracketClose: [squareBracketCloseProcessor],
    HeadingOpen: [headingOpenProcessor],
    HeadingClose: [headingCloseProcessor],
    MathTagOpen: [mathtagOpenProcessor],
    MathTagClose: [mathtagCloseProcessor],
};

const groupper = (mark: NamuMark) => {
    const flag = { skipFixing: false };
    const mainGrouping = (elem: HolderElem, idx: number) => {
        const comment = elem.group.find((v) => v.type === "Comment");
        if (comment !== undefined) {
            comment.elems.forEach((v) => (v.ignore = true));
            mark.removeGroup({ group: comment });
            flag.skipFixing = true;
            return;
        }

        const doubleSquare = elem.group.find((v) => v.type === "DoubleSquareBracket");
        if (doubleSquare !== undefined) {
            const foundGroup = elem.group.find((v) => v.type === "SingleSquareBracket");
            if (foundGroup !== undefined) {
                mark.removeGroup({ group: foundGroup });
            }
            if (doubleSquare.elems.length !== 4 && doubleSquare.elems.length !== 5) {
                mark.removeGroup({ group: doubleSquare });
                flag.skipFixing = true;
                return;
            }
            const start = mark.holderArray.findIndex((v) => v.uuid === doubleSquare.elems[1].uuid);
            const end = mark.holderArray.findIndex(
                (v) => v.uuid === doubleSquare.elems[doubleSquare.elems.length === 4 /* pipe 제외 시 */ ? 2 : 3].uuid
            );
            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            const pipeIndex = sliced.findIndex((v) => v.type === "Pipe");
            
            if (pipeIndex !== -1) {
                const filteredSliced = sliced.filter(v => {
                    const heading = v.group.find(v => v.type === "Heading")
                    if (heading === undefined) {
                        return false
                    } else {
                        if (heading.elems.length !== 2) {
                            return false
                        }
                        return true
                    }
                })
                if (filteredSliced.length === 0) {
                    sliced.slice(0, pipeIndex).filter(v => v.type !== "Newline").forEach(v => v.ignore = true);
                    const pipeHolder = sliced[pipeIndex];
                    // console.log("double")
                    sliced.slice(pipeIndex + 1).forEach(v => v.availableRange = new Range(pipeHolder.range.end, mark.holderArray[end].range.start))
                } else {
                    flag.skipFixing = true;
                }
            } else {
                sliced.filter(v => v.type !== "Newline").forEach(v => v.ignore = true);
            }

            return;
        }

        const singleSquare = elem.group.find((v) => v.type === "SingleSquareBracket");
        if (singleSquare !== undefined) {
            if (singleSquare.elems.length !== 2 && singleSquare.elems.length !== 4) {
                mark.removeGroup({ group: singleSquare });
                flag.skipFixing = true;
                return;
            }
            const start = mark.holderArray.findIndex((v) => v.uuid === singleSquare.elems[0].uuid);
            const end = mark.holderArray.findIndex((v) => v.uuid === singleSquare.elems[singleSquare.elems.length - 1].uuid);
            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            const filteredSliced = sliced.filter(v => {
                const heading = v.group.find(v => v.type === "Heading")
                if (heading === undefined) {
                    return false
                } else {
                    if (heading.elems.length !== 2) {
                        return false
                    }
                    return true
                }
            })

            if (filteredSliced.length === 0) {
                sliced.filter(v => v.type !== "Newline").forEach((v) => {
                    if (v.type !== "ParenthesisOpen" && v.type !== "ParenthesisClose") v.ignore = true;
                });
            } else {
                flag.skipFixing = true;
            }
            return;
        }

        const triple = elem.group.find((v) => v.type === "TripleBracket") as Group<"TripleBracket">;
        if (triple !== undefined) {
            if (triple.elems.length !== 2) {
                mark.removeGroup({ group: triple });
                flag.skipFixing = true;
                return;
            }

            const sizingRegex = /^(\+|-)([1-5])( |\n)/g;
            const wikiRegex = /^#!wiki([^\}]+)?\n/g;
            const htmlRegex = /^#!html/g;
            const cssColor =
                "black|gray|grey|silver|white|red|maroon|yellow|olive|lime|green|aqua|cyan|teal|blue|navy|magenta|fuchsia|purple|dimgray|dimgrey|darkgray|darkgrey|lightgray|lightgrey|gainsboro|whitesmoke|brown|darkred|firebrick|indianred|lightcoral|rosybrown|snow|mistyrose|salmon|tomato|darksalmon|coral|orangered|lightsalmon|sienna|seashell|chocolate|saddlebrown|sandybrown|peachpuff|peru|linen|bisque|darkorange|burlywood|anaatiquewhite|tan|navajowhite|blanchedalmond|papayawhip|moccasin|orange|wheat|oldlace|floralwhite|darkgoldenrod|goldenrod|cornsilk|gold|khaki|lemonchiffon|palegoldenrod|darkkhaki|beige|ivory|lightgoldenrodyellow|lightyellow|olivedrab|yellowgreen|darkolivegreen|greenyellow|chartreuse|lawngreen|darkgreen|darkseagreen|forestgreen|honeydew|lightgreen|limegreen|palegreen|seagreen|mediumseagreen|springgreen|mintcream|mediumspringgreen|mediumaquamarine|aquamarine|turquoise|lightseagreen|mediumturquoise|azure|darkcyan|darkslategray|darkslategrey|lightcyan|paleturquoise|darkturquoise|cadetblue|powderblue|lightblue|deepskyblue|skyblue|lightskyblue|steelblue|aliceblue|dodgerblue|lightslategray|lightslategrey|slategray|slategrey|lightsteelblue|comflowerblue|royalblue|darkblue|ghostwhite|lavender|mediumblue|midnightblue|slateblue|darkslateblue|mediumslateblue|mediumpurple|rebeccapurple|blueviolet|indigo|darkorchid|darkviolet|mediumorchid|darkmagenta|plum|thistle|violet|orchid|mediumvioletred|deeppink|hotpink|lavenderblush|palevioletred|crimson|pink|lightpink";
            const hexCode = "(?:[0-9a-fA-F]{3}){1,2}";
            const textColorRegex = new RegExp(`^#(${cssColor}|${hexCode})(?:\,#(${cssColor}|${hexCode}))?( |\n)`, "g");
            const syntaxRegex = /^#!syntax (basic|cpp|csharp|css|erlang|go|java(?:script)?|html|json|kotlin|lisp|lua|markdown|objectivec|perl|php|powershell|python|ruby|rust|sh|sql|swift|typescript|xml)/g;

            const content = mark.wikiText.substring(triple.elems[0].range.end)
            let match: RegExpExecArray | null;
            let ignoredRange = new Range(0, 1);
            const doMatchIgnoring = () => {
                if (ignoredRange.end === triple.elems[1].range.start) {
                    mark.holderArray.filter(v => v.type !== "Newline").forEach(v => {
                        if (v.type !== "TripleBracketOpen" && v.range.isOverlap(ignoredRange)) {
                            v.ignore = true;
                        }
                    })
                } else {
                    const availableRange = new Range(ignoredRange.end, triple.elems[1].range.start);
                    mark.holderArray.filter(v => v.type !== "Newline").forEach(v => {
                        if (v.type !== "TripleBracketOpen" && v.range.isOverlap(ignoredRange)) {
                            v.ignore = true;
                        }
                        if (v.range.isContainedIn(availableRange)) {
                            v.availableRange = availableRange;
                        }
                    })
                }
            }
            const doWholeIgnoring = () => {
                const start = mark.holderArray.findIndex((v) => v.uuid === triple.elems[0].uuid);
                const end = mark.holderArray.findIndex((v) => v.uuid === triple.elems[1].uuid);
                const sliced = mark.holderArray
                    .slice(start, end + 1)
                    .toSpliced(0, 1)
                    .toSpliced(-1, 1);
                sliced.filter(v => v.type !== "Newline").forEach((v) => (v.ignore = true));
            }

            const start = mark.holderArray.findIndex(v => v.uuid === triple.elems[0].uuid);
            const end = mark.holderArray.findIndex(v => v.uuid === triple.elems[1].uuid);
            const sliced = mark.holderArray.slice(start, end + 1).toSpliced(0, 1).toSpliced(-1, 1);
            const filteredSliced = sliced.filter(v => {
                const heading = v.group.find(v => v.type === "Heading")
                if (heading === undefined) {
                    return false
                } else {
                    if (heading.elems.length !== 2) {
                        return false
                    }
                    return true
                }
            })
            if ((match = sizingRegex.exec(content)) !== null) {
                if (filteredSliced.length === 0) {
                    ignoredRange = new Range(triple.elems[0].range.end, triple.elems[0].range.end + sizingRegex.lastIndex)
                    doMatchIgnoring();
                    triple.property = {type: "Sizing"}
                } else {
                    flag.skipFixing = true;
                }
                return;
            }
            if ((match = wikiRegex.exec(content)) !== null) {
                if (filteredSliced.length === 0) {
                    ignoredRange = new Range(triple.elems[0].range.end, elem.eolRange.end)
                    doMatchIgnoring();
                    triple.property = {type: "Wiki"}
                } else {
                    flag.skipFixing = true;
                }
                return;
            }
            if ((match = htmlRegex.exec(content)) !== null) {
                doWholeIgnoring();
                triple.property = {type: "Html"}
                return;
            }
            if ((match = textColorRegex.exec(content)) !== null) {
                if (filteredSliced.length === 0) {
                    ignoredRange = new Range(triple.elems[0].range.end, triple.elems[0].range.end + textColorRegex.lastIndex)
                    doMatchIgnoring();
                    triple.property = {type: "TextColor"}
                } else {
                    flag.skipFixing = true;
                }
                return;
            }
            if ((match = syntaxRegex.exec(content)) !== null) {
                doWholeIgnoring();
                triple.property = {type: "Syntax"}
                return;
            }
            
            doWholeIgnoring();
            triple.property = {type: "Raw"}
        }

        const heading = elem.group.find((v) => v.type === "Heading");
        if (heading !== undefined) {
            if (heading.elems.length !== 2) {
                mark.removeGroup({ group: heading });
                flag.skipFixing = true;
                return;
            }

            const start = mark.holderArray.findIndex((v) => v.uuid === heading.elems[0].uuid);
            const end = mark.holderArray.findIndex((v) => v.uuid === heading.elems[1].uuid);

            mark.holderArray.slice(0, start).filter(v => v.type !== "Newline").forEach(v => {
                if (v.fixed === false && v.group.length > 0) {
                    v.ignore = true;
                }
            })

            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log('heading')
            sliced.forEach(v => v.availableRange = new Range(mark.holderArray[start].range.end, mark.holderArray[end].range.start))

            return;
        }

        const mathtag = elem.group.find((v) => v.type === "MathTag");
        if (mathtag !== undefined) {
            if (mathtag.elems.length !== 2) {
                mark.removeGroup({ group: mathtag });
                flag.skipFixing = true;
                return;
            }
            const ranges = mathtag.elems.map((v) => v.range);
            ranges.forEach((range) => {
                const filtered =mark.holderArray.filter(v => v.type === "TableArgumentOpen" || v.type === "TableArgumentClose")
                filtered.filter(v => v.range.isContainedIn(range)).forEach(v => v.ignore = true);
            })
            const start = mark.holderArray.findIndex((v) => v.uuid === mathtag.elems[0].uuid);
            const end = mark.holderArray.findIndex((v) => v.uuid === mathtag.elems[1].uuid);
            const sliced = mark.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            sliced.filter(v => v.type !== "Newline").forEach((v) => (v.ignore = true));
            return;
        }

        const tripleContent = elem.group.find((v) => v.type === "TripleBracketContent");
        if (tripleContent !== undefined) {
            tripleContent.elems.forEach((v) => (v.ignore = true));
            mark.removeGroup({ group: tripleContent });
            flag.skipFixing = true;
            return;
        }

        const content = elem.group.find((v) => v.type === "Content");
        if (content !== undefined) {
            content.elems.forEach((v) => (v.ignore = true));
            mark.removeGroup({ group: content });
            flag.skipFixing = true;
            return;
        }
    }
    for (let idx = 0; idx < mark.holderArray.length; idx++) {
        flag.skipFixing = false;
        
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
        
        mainGrouping(elem, idx);

        if (!flag.skipFixing) {
            for (const group of elem.group) {
                group.elems.forEach((v) => (v.fixed = true));
            }
        }
    }
};

export default [mappedProcessor, groupper] as GroupperReturnType