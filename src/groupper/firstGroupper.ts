import { squareBracketCloseProcessor, squareBracketOpenProcessor } from "../processor/squareBracket.js";
import { Group, HolderElem } from "../elem.js";
import { NamuMark } from "../index.js";
import { commentProcessor } from "../processor/comment.js";
import { escapeProcessor } from "../processor/escape.js";
import { tripleBracketCloseProcessor, tripleBracketOpenProcessor } from "../processor/tripleBracket.js";
import { Range } from "range-admin";
import { headingCloseProcessor, headingOpenProcessor } from "../processor/heading.js";
import { mathtagCloseProcessor, mathtagOpenProcessor } from "../processor/mathtag.js";
import { TGroupperTuple, TProcessorMap } from "./index.js";

const mappedProcessor: TProcessorMap = {
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

function groupper(this: NamuMark) {
    const flag = { isImmutable: true };
    const mainGroupping = (elem: HolderElem, index: number) => {
        const commentGroup = elem.group.find(v => v.type === "Comment")
        if (commentGroup !== undefined) {
            commentGroup.elems.forEach(v => v.ignore = true);
            this.removeGroup({ group: commentGroup });
            flag.isImmutable = false;
            return;
        }
        
        const doubleSquareGroup = elem.group.find((v) => v.type === "DoubleSquareBracket");
        if (doubleSquareGroup !== undefined) {
            const foundGroup = elem.group.find((v) => v.type === "SingleSquareBracket");
            if (foundGroup !== undefined) {
                this.removeGroup({ group: foundGroup });
            }
            if (doubleSquareGroup.elems.length !== 4 && doubleSquareGroup.elems.length !== 5) {
                this.removeGroup({ group: doubleSquareGroup });
                flag.isImmutable = false;
                return;
            }
            const start = this.holderArray.findIndex((v) => v.uuid === doubleSquareGroup.elems[1].uuid);
            const end = this.holderArray.findIndex(
                (v) => v.uuid === doubleSquareGroup.elems[doubleSquareGroup.elems.length === 4 /* pipe 제외 시 */ ? 2 : 3].uuid
            );
            const sliced = this.holderArray
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
                    sliced.slice(pipeIndex + 1).forEach(v => v.layerRange = new Range(pipeHolder.range.end, this.holderArray[end].range.start))
                } else {
                    flag.isImmutable = false;
                }
            } else {
                sliced.filter(v => v.type !== "Newline").forEach(v => v.ignore = true);
            }

            return;
        }

        const singleSquareGroup = elem.group.find((v) => v.type === "SingleSquareBracket");
        if (singleSquareGroup !== undefined) {
            if (singleSquareGroup.elems.length !== 2 && singleSquareGroup.elems.length !== 4) {
                this.removeGroup({ group: singleSquareGroup });
                flag.isImmutable = false;
                return;
            }
            const start = this.holderArray.findIndex((v) => v.uuid === singleSquareGroup.elems[0].uuid);
            const end = this.holderArray.findIndex((v) => v.uuid === singleSquareGroup.elems[singleSquareGroup.elems.length - 1].uuid);
            const sliced = this.holderArray
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
                flag.isImmutable = false;
            }
            return;
        }

        const tripleBracketGroup = elem.group.find(v => v.type === "TripleBracket") as Group<"TripleBracket">
        if (tripleBracketGroup !== undefined) {
            if (tripleBracketGroup.elems.length !== 2) {
                this.removeGroup({ group: tripleBracketGroup });
                flag.isImmutable = false;
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

            const content = this.wikiText.substring(tripleBracketGroup.elems[0].range.end)
            let match: RegExpExecArray | null;
            let ignoredRange = new Range(0, 1);
            const doMatchIgnoring = () => {
                if (ignoredRange.end === tripleBracketGroup.elems[1].range.start) {
                    this.holderArray.filter(v => v.type !== "Newline").forEach(v => {
                        if (v.type !== "TripleBracketOpen" && v.range.isOverlap(ignoredRange)) {
                            v.ignore = true;
                        }
                    })
                } else {
                    const availableRange = new Range(ignoredRange.end, tripleBracketGroup.elems[1].range.start);
                    this.holderArray.forEach(v => {
                        if (v.type !== "TripleBracketOpen" && v.type !== "Newline" && v.range.isOverlap(ignoredRange)) {
                            v.ignore = true;
                        }
                        if (v.range.isContainedIn(availableRange)) {
                            v.layerRange = availableRange;
                        }
                    })
                }
            }
            const doWholeIgnoring = () => {
                const start = this.holderArray.findIndex((v) => v.uuid === tripleBracketGroup.elems[0].uuid);
                const end = this.holderArray.findIndex((v) => v.uuid === tripleBracketGroup.elems[1].uuid);
                const sliced = this.holderArray
                    .slice(start, end + 1)
                    .toSpliced(0, 1)
                    .toSpliced(-1, 1);
                sliced.filter(v => v.type !== "Newline").forEach((v) => (v.ignore = true));
            }

            const start = this.holderArray.findIndex(v => v.uuid === tripleBracketGroup.elems[0].uuid);
            const end = this.holderArray.findIndex(v => v.uuid === tripleBracketGroup.elems[1].uuid);
            const sliced = this.holderArray.slice(start, end + 1).toSpliced(0, 1).toSpliced(-1, 1);
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
                    ignoredRange = new Range(tripleBracketGroup.elems[0].range.end, tripleBracketGroup.elems[0].range.end + sizingRegex.lastIndex)
                    doMatchIgnoring();
                    tripleBracketGroup.property = {type: "Sizing"}
                } else {
                    flag.isImmutable = false;
                }
                return;
            }
            if ((match = wikiRegex.exec(content)) !== null) {
                if (filteredSliced.length === 0) {
                    ignoredRange = new Range(tripleBracketGroup.elems[0].range.end, elem.rowRange.end - 1)
                    doMatchIgnoring();
                    tripleBracketGroup.property = {type: "Wiki"}
                } else {
                    flag.isImmutable = false;
                }
                return;
            }
            if ((match = htmlRegex.exec(content)) !== null) {
                doWholeIgnoring();
                tripleBracketGroup.property = {type: "Html"}
                return;
            }
            if ((match = textColorRegex.exec(content)) !== null) {
                if (filteredSliced.length === 0) {
                    ignoredRange = new Range(tripleBracketGroup.elems[0].range.end, tripleBracketGroup.elems[0].range.end + textColorRegex.lastIndex)
                    doMatchIgnoring();
                    tripleBracketGroup.property = {type: "TextColor"}
                } else {
                    flag.isImmutable = false;
                }
                return;
            }
            if ((match = syntaxRegex.exec(content)) !== null) {
                doWholeIgnoring();
                tripleBracketGroup.property = {type: "Syntax"}
                return;
            }
            
            doWholeIgnoring();
            tripleBracketGroup.property = {type: "Raw"}
        }

        const headingGroup = elem.group.find((v) => v.type === "Heading");
        if (headingGroup !== undefined) {
            if (headingGroup.elems.length !== 2) {
                this.removeGroup({ group: headingGroup });
                flag.isImmutable = false;
                return;
            }

            const start = this.holderArray.findIndex((v) => v.uuid === headingGroup.elems[0].uuid);
            const end = this.holderArray.findIndex((v) => v.uuid === headingGroup.elems[1].uuid);

            this.holderArray.slice(0, start).filter(v => v.type !== "Newline").forEach(v => {
                if (v.immutable === false && v.group.length > 0) {
                    v.ignore = true;
                }
            })

            const sliced = this.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            // console.log('heading')
            sliced.forEach(v => v.layerRange = new Range(this.holderArray[start].range.end, this.holderArray[end].range.start))

            return;
        }

        const mathtagGroup = elem.group.find((v) => v.type === "MathTag");
        if (mathtagGroup !== undefined) {
            if (mathtagGroup.elems.length !== 2) {
                this.removeGroup({ group: mathtagGroup });
                flag.isImmutable = false;
                return;
            }
            const ranges = mathtagGroup.elems.map((v) => v.range);
            ranges.forEach((range) => {
                const filtered =this.holderArray.filter(v => v.type === "TableArgumentOpen" || v.type === "TableArgumentClose")
                filtered.filter(v => v.range.isContainedIn(range)).forEach(v => v.ignore = true);
            })
            const start = this.holderArray.findIndex((v) => v.uuid === mathtagGroup.elems[0].uuid);
            const end = this.holderArray.findIndex((v) => v.uuid === mathtagGroup.elems[1].uuid);
            const sliced = this.holderArray
                .slice(start, end + 1)
                .toSpliced(0, 1)
                .toSpliced(-1, 1);
            sliced.filter(v => v.type !== "Newline").forEach((v) => (v.ignore = true));
            return;
        }

        const tripleContentGroup = elem.group.find((v) => v.type === "TripleBracketContent");
        if (tripleContentGroup !== undefined) {
            tripleContentGroup.elems.forEach((v) => (v.ignore = true));
            this.removeGroup({ group: tripleContentGroup });
            flag.isImmutable = false;
            return;
        }

        const contentGroup = elem.group.find((v) => v.type === "Content");
        if (contentGroup !== undefined) {
            contentGroup.elems.forEach((v) => (v.ignore = true));
            this.removeGroup({ group: contentGroup });
            flag.isImmutable = false;
            return;
        }
    }

    for (let index = 0; index < this.holderArray.length; index++) {
        flag.isImmutable = true;

        const elem = this.holderArray[index];
        if (elem.immutable) {
            continue;
        }

        mainGroupping(elem, index);

        if (flag.isImmutable) {
            for (const group of elem.group) {
                group.elems.forEach(v => v.immutable = true)
            }
        }

        this.holderArray = this.holderArray.filter(v => {
            if (v.ignore) {
                v.group.forEach(group => this.removeGroup({ group }));
                return false;
            }
            return true;
        })
    }
}

export default [mappedProcessor, groupper] as TGroupperTuple