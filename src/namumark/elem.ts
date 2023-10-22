import { Range } from "./utils";
import { v4 as uuidv4 } from "uuid";

export abstract class Elem {
    range: Range = new Range(0, 1);
    parentUUID: string | null = null;
    constructor(range: Range) {
        this.range = range;
    }
    flushArr(array: Elem[]): Elem[] { return array }
    setParent(uuid: string) { this.parentUUID = uuid }
}

export abstract class UnableChild extends Elem {}

export abstract class AbleChild extends Elem {
    uuid: string = uuidv4();
}

export class RedirectElem extends UnableChild {
    constructor(range: Range) {
        super(range)
    }
}

export class CommentElem extends UnableChild {
    constructor(range: Range) {
        super(range)
    }
}

export class HeadingElem extends AbleChild {
    value: string = "";
    availableRange: Range = new Range(0, 1);
    headingLevel: number = 0;
    isHeadingHidden: boolean = false;
    haedingLevelAt: number[] = [];
    constructor(value: string, range: Range, availableRange: Range, headingLevel: number, isHeadingHidden: boolean, headingLevelAt: number[]) {
        super(range)
        this.value = value;
        this.range = range;
        this.availableRange = availableRange;
        this.headingLevel = headingLevel;
        this.isHeadingHidden = isHeadingHidden;
        this.haedingLevelAt = headingLevelAt;
    }
}

export class MacroElem extends UnableChild {
    value: string | null = null;
    name: string = "";
    constructor(value: string | null, name: string, range: Range) {
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

            if (elem instanceof CommentElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // ## [macro()]
                    case "CONTAIN":
                        flag.isError = true;
                        break;
                    /*
                    [macro(
                    ## asdf
                    )]
                    */
                    case "REVERSE_CONTAIN":
                        flag.isSkippable = true;
                        break;

                    /*
                    ## asdf [macro(
                    )]
                    [macro(
                    ## )]
                    */
                    case "OVERLAP":
                        if (this.range.start < elem.range.start) {
                            flag.isSkippable = true;
                        } else {
                            flag.isError = true;
                        }
                        break;

                    default:
                        break;
                }
            }

            if (elem instanceof HeadingElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // == [macro()] ==
                    case "CONTAIN":
                        const {status: substatus, common: subcommon} = elem.availableRange.compare(common as Range);
                        if (substatus === "CONTAIN" || substatus === "SAME") {
                            this.setParent(elem.uuid);
                        } else {
                            flag.isError = true;
                        }
                        break;
                    /* 
                    [macro(
                    == heading ==
                    )] */
                    case "REVERSE_CONTAIN":
                        flag.isSkippable = true;
                        break;
                    /* 
                    [macro(hello
                    == )] ==
                    == [macro(hello ==
                    )]
                    */
                    case "OVERLAP":
                        if (this.range.start < elem.range.start) {
                            flag.isSkippable = true;
                        } else {
                            flag.isError = true;
                        }
                        break;
                    default:
                        break;
                }
            }

            if (!flag.isSkippable) {
                temp.push(elem);
            }
        }

        if (!flag.isError) temp.push(this);
        array = temp;
        return array;
    }
}

export class LinkElem extends AbleChild {
    linkTo: string = "";
    displayAs: string = "";
    availableRange: Range = new Range(0, 1);
    constructor(linkTo: string, displayAs: string, range: Range, availableRange: Range) {
        super(range);
        this.linkTo = linkTo;
        this.displayAs = displayAs;
        this.availableRange = availableRange;
    }
    override flushArr(array: Elem[]): Elem[] {
        const flag = {
            isBroken: false,
            isError: false,
            isSkippable: false
        }
        const temp = [];
        for (const [idx, elem] of array.entries()) {
            flag.isSkippable = false;

            if (elem.range.start > this.range.end) {
                temp.push(...array.slice(idx))
                break;
            }

            if (elem instanceof CommentElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // ## [[ asdf ]]
                    case "CONTAIN":
                        flag.isError = true;
                        break;
                    default:
                        break;
                }
            }

            if (elem instanceof HeadingElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // == [[]] ==
                    case "CONTAIN": {
                        const { status: substatus, common: subcommon } = elem.availableRange.compare(common as Range);
                        if (substatus === "CONTAIN" || substatus === "SAME") {
                            this.setParent(elem.uuid);;
                        } else {
                            flag.isError = true;
                        }
                        break;
                    }
                    default:
                        break;
                }
            }

            if (elem instanceof MacroElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // [macro([[]])]
                    case "CONTAIN":
                        flag.isError = true;
                        break;
                    // [[ [macro()] ]]
                    // [[ text | [macro()] ]]
                    // [[ text [macro( | )] ]]
                    case "REVERSE_CONTAIN":
                        const {status: substatus, common: subcommon} = this.availableRange.compare(common as Range);
                        if (substatus === "CONTAIN" || substatus === "SAME") {
                            elem.setParent(this.uuid)
                        }
                        flag.isSkippable = true;
                        break;

                    // [[ [macro( ]] )]
                    // [macro( [[ )] ]]
                    case "OVERLAP":
                        if (this.range.start < elem.range.start) {
                            flag.isSkippable = true;
                        } else {
                            flag.isError = true;
                        }
                    default:
                        break;
                }
            }

            if (!flag.isSkippable) {
                temp.push(elem);
            }
        }

        if (!flag.isError) temp.push(this);
        array = temp;
        return array;
    }
}

export class ULinkElem extends UnableChild {
    linkTo: string = "";
    constructor(linkTo: string, range: Range) {
        super(range);
        this.linkTo = linkTo;
    }

    override flushArr(array: Elem[]): Elem[] {
        const flag = {
            isBroken: false,
            isError: false,
            isSkippable: false
        }
        const temp = [];
        for (const [idx, elem] of array.entries()) {
            flag.isSkippable = false;

            if (elem.range.start > this.range.end) {
                temp.push(...array.slice(idx));
                break;
            }

            if (elem instanceof CommentElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // ## [[ asdf ]]
                    case "CONTAIN":
                        flag.isError = true;
                        break;
                    default:
                        break;
                }
            }

            if (elem instanceof HeadingElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // == [[]] ==
                    case "CONTAIN": {
                        const { status: substatus, common: subcommon } = elem.availableRange.compare(common as Range);
                        if (substatus === "CONTAIN" || substatus === "SAME") {
                            this.setParent(elem.uuid);;
                        } else {
                            flag.isError = true;
                        }
                        break;
                    }
                    default:
                        break;
                }
            }

            if (elem instanceof MacroElem) {
                const {status, common} = elem.range.compare(this.range);
                switch (status) {
                    // [macro([[]])]
                    case "CONTAIN":
                        flag.isError = true;
                        break;
                    // [[ [macro()] ]]
                    case "REVERSE_CONTAIN":
                        flag.isSkippable = true;
                        break;

                    // [[ [macro( ]] )]
                    // [macro( [[ )] ]]
                    case "OVERLAP":
                        if (this.range.start < elem.range.start) {
                            flag.isSkippable = true;
                        } else {
                            flag.isError = true;
                        }
                    default:
                        break;
                }
            }

            if (!flag.isSkippable) {
                temp.push(elem);
            }
        }

        if (!flag.isError) temp.push(this);
        array = temp;
        return array;
    }
}