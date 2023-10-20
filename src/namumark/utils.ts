type RangeStatusType = "INCLUDE" | "COLLAPSE" | "REVERSE_INCLUDE" | "NONE" | "UNCALCULATED"

export class Range {
    start: number = 0;
    end: number = 0;
    range: Array<number> = [];

    constructor(start: number, end: number) {
        if (start >= end) {
            throw new Error(`The value of 'start' should be smaller than the value of 'end' (${start} < ${end})`)
        }
        this.start = start;
        this.end = end;
        this.range = Array.from({ length: this.end - this.start + 1 }, (_, i) => i + this.start)
    }

    private checkStatus(target: Range): RangeStatusType {
        // INCLUDE
        // this.start <-----------------------> end
        // -------------target.start<--->end
        if (this.start < target.start && this.end > target.end) {
            return "INCLUDE";
        }

        // COLLAPSE
        // this.start <----------------> end
        // ----------------------------target.start <----------------> end
        // -------------target.start<-------------------------------->end
        // target.start<--------------------------------------------->end
        if (this.start <= target.start && this.end >= target.start  && this.end < target.end) {
            return "COLLAPSE";
        }

        // --------------------this.start <-----------------> end
        // target.start <-----------------------------------> end
        // target.start <-------------------------> end
        // target.start <------> end
        if (this.start > target.start && this.start <= target.end && this.end >= target.end) {
            return "COLLAPSE";      
        }

        // -------------this.start<--->end
        // target.start <-----------------------> end
        if (this.start > target.start && this.end < target.end) {
            return "REVERSE_INCLUDE";
        }

        // -------------------------this.start <---> end
        // target.start <---> end
        // this.start <---> end
        // -------------------------target.start <---> end
        if (target.end < this.start || this.end < target.start) {
            return "NONE";
        }

        return "UNCALCULATED"
    }

    public reportRelationship(target: Range): { status: RangeStatusType, common: number[] } {
        const status = this.checkStatus(target)
        const common = this.range.filter(value => target.range.includes(value));
        return { status, common }
    }
}