import { Range } from "./utils";

export abstract class Elem {
    range: Range = new Range(0, 1);
    constructor(range: Range) {
        this.range = range;
    }
    flushArr(array: Elem[]): Elem[] { return array }
}

export abstract class UnableChild extends Elem {}

export abstract class AbleChild extends Elem {
    children: Elem[] = [];
    pushChildren(children: Elem | Elem[]) {
        if (children instanceof Elem) {
            this.children.push(children)
        } else {
            this.children.push(...children)
        }
    }
}

export class RedirectElem extends UnableChild {
    constructor(range: Range) {
        super(range)
    }
}

export class HeadingElem extends AbleChild {
    value: string = "";
    availableRange: Range = new Range(0, 1);
    headingLevel: number = 0;
    haedingLevelAt: number[] = [];
    constructor(value: string, range: Range, availableRange: Range, headingLevel: number, headingLevelAt: number[]) {
        super(range)
        this.value = value;
        this.range = range;
        this.availableRange = availableRange;
        this.headingLevel = headingLevel;
        this.haedingLevelAt = headingLevelAt;
    }
}

export class MacroElem extends UnableChild {
    value: string = "";
    name: string = "";
    constructor(value: string, name: string, range: Range) {
        super(range);
        this.value = value;
        this.name = name;
    }
    override flushArr(array: Elem[]): Elem[] {
        const flag = {
            isBroken: false,
            isError: false,
            isSkippable: false
        };
        const temp = [];
        for (const [idx, elem] of array.entries()) {
            flag.isSkippable = false;

            if (elem.range.start > this.range.end) {
                temp.push(...array.slice(idx))
                break;
            }

            if (elem instanceof HeadingElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    case "CONTAIN":
                        const {status: substatus, common: subcommon} = elem.availableRange.compare(common as Range);
                        if (substatus === "CONTAIN" || substatus === "SAME") {
                            elem.pushChildren(this)
                        } else {
                            flag.isError = true;
                        }
                        flag.isBroken = true;
                        break;
                    case "REVERSE_CONTAIN":
                    case "OVERLAP":
                        flag.isSkippable = true;
                        break;
                    case "SAME":
                        flag.isError = false;
                        flag.isBroken = true;
                        break;
                    case "NONE":
                    default:
                        break;
                }
            }

            if (elem instanceof MacroElem) {
                continue;
            }

            if (!flag.isSkippable && !flag.isBroken) temp.push(elem);
            if (flag.isBroken) {
                temp.push(...array.slice(idx))
                break
            };
        }

        if (!flag.isError) temp.push(this);
        array = temp;
        return array;
    }
}