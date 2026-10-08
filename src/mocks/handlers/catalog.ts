import type { Msw } from "../msw";
import { catalogFixtures, paginate } from "../fixtures/catalog";

// MSW handlers of qone-catalog-api, read operations CA-01, CA-02, CA-04, CA-05, CA-06, CA-08
// (writes and reservations arrive with their screens). Relative paths: they match whatever
// gateway origin the shell is configured with. Errors use the common envelope.
export function catalogHandlers({ http, HttpResponse }: Msw) {
const envelope = (status: number, error: string, message: string, details?: Array<{ field: string; message: string }>) =>
  HttpResponse.json({ error, message, ...(details ? { details } : {}), traceId: crypto.randomUUID() }, { status });

function pageParams(url: URL): { page: number; limit: number } | ReturnType<typeof envelope> {
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  if (!Number.isInteger(page) || page < 1) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "page", message: "must be 1 or more" }]);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "limit", message: "must be between 1 and 100" }]);
  return { page, limit };
}

const requireToken = (request: Request) => (request.headers.get("authorization")?.startsWith("Bearer ") ? undefined : envelope(401, "UNAUTHORIZED", "missing or invalid token"));

return [
  http.get("*/api/v1/catalog/health", () => HttpResponse.json({ status: "ok", service: "qone-catalog-api", version: "2.0.0" })),

  http.get("*/api/v1/catalog/subjects", ({ request }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    const url = new URL(request.url);
    const params = pageParams(url);
    if (params instanceof Response) return params;
    const semester = url.searchParams.get("semester");
    const rows = catalogFixtures.subjects.filter((s) => (semester ? s.semester === Number(semester) : true));
    return HttpResponse.json(paginate(rows, params.page, params.limit));
  }),

  http.post("*/api/v1/catalog/subjects", async ({ request }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    const role = (request.headers.get("authorization") ?? "").slice(7).split(".")[1];
    if (role !== "ADMIN") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
    const key = request.headers.get("idempotency-key") ?? "";
    if (key.length < 8 || key.length > 128) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "Idempotency-Key", message: "header required, 8 to 128 characters" }]);
    const body = (await request.json().catch(() => null)) as { code?: string; name?: string; credits?: number; semester?: number; prerequisites?: string[] } | null;
    const details: Array<{ field: string; message: string }> = [];
    if (!body || typeof body.code !== "string" || !/^[A-Z0-9-]{3,10}$/.test(body.code)) details.push({ field: "code", message: "must match ^[A-Z0-9-]{3,10}$" });
    if (!body || typeof body.name !== "string" || body.name.length < 2) details.push({ field: "name", message: "must have 2 to 120 characters" });
    if (!body || !Number.isInteger(body.credits) || (body.credits ?? 0) < 1 || (body.credits ?? 0) > 10) details.push({ field: "credits", message: "must be between 1 and 10" });
    if (!body || !Number.isInteger(body.semester) || (body.semester ?? 0) < 1 || (body.semester ?? 0) > 12) details.push({ field: "semester", message: "must be between 1 and 12" });
    if (details.length || !body) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", details);
    if (catalogFixtures.subjects.some((s) => s.code === body.code)) return envelope(422, "BUSINESS_RULE_VIOLATION", `INV-SUB-001: a subject with code ${body.code} already exists`);
    const unknown = (body.prerequisites ?? []).find((p) => !catalogFixtures.subjects.some((s) => s.code === p));
    if (unknown) return envelope(422, "BUSINESS_RULE_VIOLATION", `INV-SUB-002: prerequisite ${unknown} does not exist`);
    const created = { id: crypto.randomUUID(), code: body.code as string, name: body.name as string, credits: body.credits as number, semester: body.semester as number, prerequisites: body.prerequisites ?? [], createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") };
    catalogFixtures.subjects.push(created);
    return HttpResponse.json(created, { status: 201, headers: { Location: `/api/v1/catalog/subjects/${created.code}` } });
  }),

  http.get("*/api/v1/catalog/subjects/:code", ({ request, params }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    const subject = catalogFixtures.subjects.find((s) => s.code === params["code"]);
    return subject ? HttpResponse.json(subject) : envelope(404, "NOT_FOUND", "resource not found");
  }),

  http.get("*/api/v1/catalog/subjects/:code/sections", ({ request, params }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    if (!catalogFixtures.subjects.some((s) => s.code === params["code"])) return envelope(404, "NOT_FOUND", "resource not found");
    const url = new URL(request.url);
    const p = pageParams(url);
    if (p instanceof Response) return p;
    const term = url.searchParams.get("term");
    const rows = catalogFixtures.sections.filter((s) => s.subjectCode === params["code"] && (term ? s.term === term : true));
    return HttpResponse.json(paginate(rows, p.page, p.limit));
  }),

  http.post("*/api/v1/catalog/sections", async ({ request }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    const role = (request.headers.get("authorization") ?? "").slice(7).split(".")[1];
    if (role !== "ADMIN") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
    const key = request.headers.get("idempotency-key") ?? "";
    if (key.length < 8 || key.length > 128) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "Idempotency-Key", message: "header required, 8 to 128 characters" }]);
    const body = (await request.json().catch(() => null)) as { subjectCode?: string; term?: string; groupNumber?: number; professorId?: string; professorName?: string; capacity?: number; slots?: Array<{ day: string; start: string; end: string }> } | null;
    if (!body) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "body", message: "JSON object required" }]);
    const subject = catalogFixtures.subjects.find((s) => s.code === body.subjectCode);
    if (!subject) return envelope(404, "NOT_FOUND", "resource not found");
    const details: Array<{ field: string; message: string }> = [];
    if (!Number.isInteger(body.groupNumber) || (body.groupNumber ?? 0) < 1 || (body.groupNumber ?? 0) > 99) details.push({ field: "groupNumber", message: "must be between 1 and 99" });
    if (!Number.isInteger(body.capacity) || (body.capacity ?? 0) < 1 || (body.capacity ?? 0) > 500) details.push({ field: "capacity", message: "must be between 1 and 500" });
    if (!body.professorId || !body.professorName) details.push({ field: "professorId", message: "required" });
    if (!Array.isArray(body.slots) || body.slots.length === 0) details.push({ field: "slots", message: "at least one slot" });
    if (details.length) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", details);
    if (catalogFixtures.sections.some((s) => s.subjectCode === body.subjectCode && s.term === body.term && s.groupNumber === body.groupNumber)) return envelope(422, "BUSINESS_RULE_VIOLATION", `group ${body.groupNumber} of ${body.subjectCode} already exists for ${body.term}`);
    const slots = body.slots as Array<{ day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"; start: string; end: string }>;
    const created = { id: crypto.randomUUID(), subjectCode: subject.code, subjectName: subject.name, term: body.term as string, groupNumber: body.groupNumber as number, professorId: body.professorId as string, professorName: body.professorName as string, capacity: body.capacity as number, seatsAvailable: body.capacity as number, slots, createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") };
    catalogFixtures.sections.push(created);
    return HttpResponse.json(created, { status: 201, headers: { Location: `/api/v1/catalog/sections/${created.id}` } });
  }),

  http.get("*/api/v1/catalog/sections/mine", ({ request }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    // The stub token is "test-token.<ROLE>.<userId>"; a real token carries sub in its claims.
    const [, role, userId] = (request.headers.get("authorization") ?? "").slice(7).split(".");
    if (role !== "PROFESSOR") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
    const p = pageParams(new URL(request.url));
    if (p instanceof Response) return p;
    return HttpResponse.json(paginate(catalogFixtures.sections.filter((s) => s.professorId === userId), p.page, p.limit));
  }),

  http.get("*/api/v1/catalog/sections/:id", ({ request, params }) => {
    const unauthorized = requireToken(request);
    if (unauthorized) return unauthorized;
    const section = catalogFixtures.sections.find((s) => s.id === params["id"]);
    return section ? HttpResponse.json(section) : envelope(404, "NOT_FOUND", "resource not found");
  }),
];
}
