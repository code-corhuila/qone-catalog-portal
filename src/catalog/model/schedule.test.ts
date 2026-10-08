import { slotsOverlap, validateSlots, type Slot } from "./schedule";

// INV-SEC-002 as the portal checks it before asking the API: two slots overlap when they share
// the day and start < other.end and other.start < end; a class that ends when another starts
// does not overlap (06-data/data-dictionary.md).
const s = (day: Slot["day"], start: string, end: string): Slot => ({ day, start, end });

describe("slotsOverlap", () => {
  it("detects an overlap on the same day", () => {
    expect(slotsOverlap(s("MON", "08:00", "10:00"), s("MON", "09:00", "11:00"))).toBe(true);
    expect(slotsOverlap(s("MON", "08:00", "10:00"), s("MON", "08:00", "10:00"))).toBe(true);
  });

  it("ignores different days and touching slots", () => {
    expect(slotsOverlap(s("MON", "08:00", "10:00"), s("TUE", "08:00", "10:00"))).toBe(false);
    expect(slotsOverlap(s("MON", "08:00", "10:00"), s("MON", "10:00", "12:00"))).toBe(false);
  });
});

describe("validateSlots", () => {
  it("accepts well-formed, non-overlapping slots", () => {
    expect(validateSlots([s("MON", "08:00", "10:00"), s("WED", "08:00", "10:00")])).toEqual([]);
  });

  it("requires at least one slot, HH:MM times and start before end", () => {
    expect(validateSlots([])).toEqual([{ index: -1, message: "Add at least one class block." }]);
    expect(validateSlots([s("MON", "8:00", "10:00")])).toEqual([{ index: 0, message: "Times must be HH:MM, from 06:00 to 22:00." }]);
    expect(validateSlots([s("MON", "10:00", "10:00")])).toEqual([{ index: 0, message: "The block must end after it starts." }]);
  });

  it("reports the second of two overlapping blocks (INV-SEC-002)", () => {
    expect(validateSlots([s("FRI", "08:00", "12:00"), s("FRI", "11:00", "13:00")])).toEqual([{ index: 1, message: "This block overlaps block 1 (INV-SEC-002)." }]);
  });
});
