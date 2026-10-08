// Types copied from 07-api/contracts/openapi/qone-catalog-api.yaml and _shared.yaml (Annex H:
// "los tipos del portal reflejan el contrato del API con los mismos nombres de campo").
// The contract test validates the fixtures against the YAML; these types keep the compiler
// honest about field names.

/** The academic term the portal shows; qone-infra declares it as CURRENT_TERM for every piece. */
export const CURRENT_TERM = "2026-B";

export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface Slot {
  day: Day;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  createdAt: string;
}

export interface SubjectRequest {
  code: string;
  name: string;
  credits: number;
  semester: number;
  prerequisites: string[];
}

export interface Section {
  id: string;
  subjectCode: string;
  subjectName: string;
  term: string;
  groupNumber: number;
  professorId: string;
  professorName: string;
  capacity: number;
  seatsAvailable: number;
  slots: Slot[];
  createdAt: string;
}

export interface SectionRequest {
  subjectCode: string;
  term: string;
  groupNumber: number;
  professorId: string;
  professorName: string;
  capacity: number;
  slots: Slot[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

/** The seats chip of the design system: 0 is full, 3 or fewer is "few", otherwise available. */
export function seatsLevel(section: Pick<Section, "seatsAvailable">): "full" | "few" | "available" {
  if (section.seatsAvailable <= 0) return "full";
  if (section.seatsAvailable <= 3) return "few";
  return "available";
}

/** "MON 08:00-10:00, WED 08:00-10:00" */
export function formatSlots(slots: readonly Slot[]): string {
  return slots.map((s) => `${s.day} ${s.start}-${s.end}`).join(", ");
}
