import { NamuMark } from ".";
import util from "node:util"
import { THolderTag } from "./elem";

// const a = new NamuMark("## hello world")

// console.log(util.inspect(a.parse(), false, 100, true))

describe("List & Indent & Cite Testing", () => {
    test(" * > * asdf", () => {
        const text = `
 * > * asdf
`;
        const mark = new NamuMark(text);
        const result = mark.parse().map((v) => v.type);
        const expectedResult: THolderTag[] = [
            "Newline",
            "Newline",
            "Newline>Indent",
            "Indent>UnorderedList",
            "List>Indent",
            "Indent>Cite",
            "Cite>Indent",
            "Indent>UnorderedList",
            "List>Indent",
            "Newline",
            "Newline",
        ];
        expect(result).toEqual(expectedResult);
    });
    test(" > > > asdf", () => {
        const text = `
 > > > asdf
`;

        const mark = new NamuMark(text);
        const result = mark.parse().map((v) => v.type);
        const expectedResult: THolderTag[] = [
            "Newline",
            "Newline",
            "Newline>Indent",
            "Indent>Cite",
            "Cite>Indent",
            "Indent>Cite",
            "Cite>Indent",
            "Indent>Cite",
            "Cite>Indent",
            "Newline",
            "Newline",
        ];
        expect(result).toEqual(expectedResult);
    });
    test(">> > asdf", () => {
        const text = `
>> > asdf
`;

        const mark = new NamuMark(text);
        const result = mark.parse().map((v) => v.type);
        const expectedResult: THolderTag[] = [
            "Newline",
            "Newline",
            "Newline>Cite",
            "Cite>Cite",
            "Cite>Indent",
            "Indent>Cite",
            "Cite>Indent",
            "Newline",
            "Newline",
        ];
        expect(result).toEqual(expectedResult);
    });
});

describe("Heading Overlapping Collision", () => {
    test("{{{\\n== list ==\\n}}}", ()=>{
        const text = `
{{{
== list ==
}}}
`;

        const mark = new NamuMark(text);
        const result = mark.parse().map((v) => v.type);
        console.log(result)
        const expectedResult: THolderTag[] = [
            "Newline",
            "Newline",
            "TripleBracketOpen",
            "Newline",
            "Newline",
            "TripleBracketClose",
            "Newline",
            "Newline",
        ];
        expect(result).toEqual(expectedResult);
    })
})