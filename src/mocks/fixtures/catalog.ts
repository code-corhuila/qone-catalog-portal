import { CURRENT_TERM, type Page, type Section, type Slot, type Subject } from "../../catalog/model/catalog";

// Synthetic data of the catalog domain (ADR-009): the fourteen subjects and eleven sections of
// the prototype seed (quorum-one/backend/app/seed.py), which is also the seed of
// qone-catalog-db (06-data). Shapes follow qone-catalog-api.yaml and are validated against it.
// Professors are the identity seed (ids as in qone-front/src/mocks/fixtures/identity.ts).

const createdAt = "2026-08-01T12:00:00Z";
export const TERM = CURRENT_TERM;

const PROFESSORS = {
  carlos: { id: "22222222-2222-4222-8222-222222222221", name: "Carlos Ramírez" },
  ana: { id: "22222222-2222-4222-8222-222222222222", name: "Ana Torres" },
  jorge: { id: "22222222-2222-4222-8222-222222222223", name: "Jorge Medina" },
} as const;

function subject(n: number, code: string, name: string, credits: number, semester: number, prerequisites: string[] = []): Subject {
  return { id: `44444444-4444-4444-8444-4444444444${String(n).padStart(2, "0")}`, code, name, credits, semester, prerequisites, createdAt };
}

const subjects: Subject[] = [
  subject(1, "ISW-501", "Bases de Datos I", 3, 5),
  subject(2, "ISW-502", "Sistemas Operativos", 3, 5),
  subject(3, "RED-501", "Redes de Datos", 3, 5),
  subject(4, "HUM-501", "Ética Profesional", 2, 5),
  subject(5, "MAT-501", "Estadística II", 3, 5),
  subject(6, "ISW-601", "Bases de Datos II", 3, 6, ["ISW-501"]),
  subject(7, "ISW-602", "Teoría de la Computación", 3, 6),
  subject(8, "ISW-603", "Ingeniería de Requisitos", 3, 6),
  subject(9, "ISW-604", "Sistemas Distribuidos", 4, 6, ["RED-501"]),
  subject(10, "ISW-605", "Arquitectura de Software", 3, 6),
  subject(11, "ISW-701", "Seguridad Informática", 3, 7, ["ISW-604"]),
  subject(12, "ISW-702", "Computación en la Nube", 3, 7, ["ISW-604"]),
  subject(13, "ISW-703", "Gestión de Proyectos", 3, 7),
  subject(14, "ISW-704", "Analítica de Datos", 3, 7, ["MAT-501"]),
];

const slot = (day: Slot["day"], start: string, end: string): Slot => ({ day, start, end });

function section(n: number, subjectCode: string, groupNumber: number, professor: keyof typeof PROFESSORS, capacity: number, seatsAvailable: number, slots: Slot[]): Section {
  const s = subjects.find((x) => x.code === subjectCode);
  if (!s) throw new Error(`fixture: unknown subject ${subjectCode}`);
  return {
    id: `55555555-5555-4555-8555-5555555555${String(n).padStart(2, "0")}`,
    subjectCode,
    subjectName: s.name,
    term: TERM,
    groupNumber,
    professorId: PROFESSORS[professor].id,
    professorName: PROFESSORS[professor].name,
    capacity,
    seatsAvailable,
    slots,
    createdAt,
  };
}

// seatsAvailable reflects the prototype's demo: Laura holds 4 seats, three students hold ISW-604 g1,
// and two sections are seeded full to demonstrate NO_SEATS.
const sections: Section[] = [
  section(1, "ISW-601", 1, "ana", 30, 29, [slot("TUE", "08:00", "10:00"), slot("THU", "08:00", "10:00")]),
  section(2, "ISW-603", 1, "jorge", 30, 29, [slot("MON", "10:00", "12:00"), slot("WED", "10:00", "12:00")]),
  section(3, "ISW-605", 1, "ana", 30, 29, [slot("TUE", "14:00", "16:00"), slot("THU", "14:00", "16:00")]),
  section(4, "MAT-501", 1, "jorge", 30, 29, [slot("FRI", "14:00", "17:00")]),
  section(5, "ISW-604", 1, "carlos", 30, 27, [slot("MON", "08:00", "10:00"), slot("WED", "08:00", "10:00")]),
  section(6, "ISW-604", 2, "ana", 30, 30, [slot("TUE", "08:00", "10:00"), slot("THU", "08:00", "10:00")]),
  section(7, "ISW-604", 3, "jorge", 3, 0, [slot("FRI", "08:00", "12:00")]),
  section(8, "ISW-501", 2, "carlos", 30, 0, [slot("TUE", "10:00", "12:00"), slot("THU", "10:00", "12:00")]),
  section(9, "RED-501", 1, "carlos", 30, 30, [slot("FRI", "08:00", "11:00")]),
  section(10, "ISW-602", 1, "ana", 30, 30, [slot("TUE", "16:00", "18:00"), slot("THU", "16:00", "18:00")]),
  section(11, "ISW-703", 1, "jorge", 30, 30, [slot("WED", "16:00", "19:00")]),
];

/** Newest first, as the contract orders every list; the seed has one timestamp, so by code. */
export function paginate<T>(rows: readonly T[], page: number, limit: number): Page<T> {
  const total = rows.length;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export const catalogFixtures = { subjects, sections, professors: PROFESSORS };
