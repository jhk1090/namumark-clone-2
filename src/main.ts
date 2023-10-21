import { NamuMark } from  "./namumark";
import { writeFileSync } from "node:fs";
import { Range } from "./namumark/utils";

const text = ``;
const mark = new NamuMark(text);
const parsedText = mark.parse();

const range1 = new Range(1, 2);
const range2 = new Range(4, 5);
console.log(range1.compare(range2));

writeFileSync("./view.html", parsedText)