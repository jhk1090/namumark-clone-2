import { NamuMark } from  "./namumark";
import { writeFileSync } from "node:fs";

const text = `#redirect 1`;
const mark = new NamuMark(text);
const parsedText = mark.parse();

writeFileSync("./view.html", parsedText)