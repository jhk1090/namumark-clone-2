type RangeStatusType = "CONTAIN" | "OVERLAP" | "REVERSE_CONTAIN" | "NONE" | "UNDEFINED" | "SAME";

// export class Range {
//     start: number = 0;
//     end: number = 0;

//     constructor(start: number, end: number) {
//         if (start >= end) {
//             throw new Error(`The value of 'start' should be smaller than the value of 'end' (${start} < ${end})`)
//         }
//         this.start = start;
//         this.end = end;
//     }

//     private isSame(target: Range) {
//         return this.start === target.start && this.end === target.end;
//     }

//     private isOverlap(target: Range) {
//         return this.start <= target.end && this.end >= target.start;
//     }

//     private isContainedIn(target: Range) {
//         return this.start >= target.start && this.end <= target.end;
//     }

//     private isDisjoint(target: Range) {
//         return this.end < target.start || this.start > target.end;
//     }

//     private getCommonRange(target: Range) {
//         if (this.isOverlap(target)) {
//             return new Range(Math.max(this.start, target.start), Math.min(this.end, target.end));
//         }

//         if (this.isContainedIn(target)) {
//             return new Range(this.start, this.end);
//         } else if (target.isContainedIn(this)) {
//             return new Range(target.start, target.end);
//         }

//         if (this.isSame(target)) {
//             return new Range(this.start, this.end);
//         }

//         return null;
//     }

//     public compare(target: Range): { status: RangeStatusType, common: Range | null } {
//         let status: RangeStatusType = "UNDEFINED";
//         let common = this.getCommonRange(target);
//         if (this.isSame(target)) {
//             console.log(`${this.toString()} is the same as ${target.toString()}`);
//             status = "SAME"
//         } else if (this.isContainedIn(target)) {
//             console.log(`${this.toString()} is contained in ${target.toString()}`)
//             status = "REVERSE_CONTAIN"
//         } else if (target.isContainedIn(this)) {
//             console.log(`${this.toString()} contains ${target.toString()}`);
//             status = "CONTAIN"
//         } else if (this.isOverlap(target)) {
//             console.log(`${this.toString()} overlaps with ${target.toString()}`);
//             status = "OVERLAP"
//         } else if (this.isDisjoint(target)) {
//             console.log(`${this.toString()} and ${target.toString()} have no relationship`);
//             status = "NONE"
//         } else {
//             // This case is not expected to happen in a well-defined range comparison.
//             console.log("Undefined relationship");
//         }
//         return { status, common };
//     }

//     toString() {
//         return `[${this.start}, ${this.end}]`;
//     }
// }

export class Range {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        if (start >= end) {
            throw new Error("Invalid range: start should be smaller than end");
        }

        this.start = start;
        this.end = end;
    }

    private isSame(otherRange: Range) {
        return this.start === otherRange.start && this.end === otherRange.end;
    }

    private isDisjoint(otherRange: Range) {
        return this.start >= otherRange.end || this.end <= otherRange.start
    }

    private isContainedIn(otherRange: Range) {
        return this.start >= otherRange.start && this.end <= otherRange.end
    }

    private isOverlap(otherRange: Range) {
        return this.start < otherRange.end && this.end > otherRange.start
    }

    compare(otherRange: Range): { status: RangeStatusType; common: Range | null } {
        if (this.isSame(otherRange)) {
            return { status: "SAME", common: this };
        }

        if (this.isDisjoint(otherRange)) {
            return { status: "NONE", common: null };
        }

        if (this.isContainedIn(otherRange)) {
            return { status: "REVERSE_CONTAIN", common: this };
        }

        if (otherRange.isContainedIn(this)) {
            return { status: "CONTAIN", common: otherRange };
        }

        if (this.isOverlap(otherRange)) {
            const commonStart = Math.max(this.start, otherRange.start);
            const commonEnd = Math.min(this.end, otherRange.end);
            const commonRange = new Range(commonStart, commonEnd);
            return { status: "OVERLAP", common: commonRange };
        }

        return { status: "UNDEFINED", common: null };
    }
}
