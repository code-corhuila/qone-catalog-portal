import type { Slot } from "./catalog";

export type { Slot };

export const DAYS: readonly Slot["day"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Two blocks overlap when they share the day and start < other.end and other.start < end; touching blocks do not. */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  return a.day === b.day && minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}

export interface SlotError {
  /** Index of the offending block; -1 when the problem is the whole list. */
  index: number;
  message: string;
}

/** The client-side check of INV-SEC-002 and of the block shape, before the API repeats it. */
export function validateSlots(slots: readonly Slot[]): SlotError[] {
  if (slots.length === 0) return [{ index: -1, message: "Add at least one class block." }];
  const errors: SlotError[] = [];
  slots.forEach((slot, index) => {
    const inRange = (t: string) => TIME.test(t) && minutes(t) >= 6 * 60 && minutes(t) <= 22 * 60;
    if (!inRange(slot.start) || !inRange(slot.end)) {
      errors.push({ index, message: "Times must be HH:MM, from 06:00 to 22:00." });
      return;
    }
    if (minutes(slot.start) >= minutes(slot.end)) {
      errors.push({ index, message: "The block must end after it starts." });
      return;
    }
    const earlier = slots.slice(0, index).findIndex((other) => slotsOverlap(slot, other));
    if (earlier >= 0) errors.push({ index, message: `This block overlaps block ${earlier + 1} (INV-SEC-002).` });
  });
  return errors;
}
