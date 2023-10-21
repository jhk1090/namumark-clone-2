type RangeStatusType = "CONTAIN" | "OVERLAP" | "REVERSE_CONTAIN" | "NONE" | "UNDEFINED" | "SAME";

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
