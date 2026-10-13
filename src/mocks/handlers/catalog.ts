import { http, HttpResponse } from "msw";
import { catalogFixtures, paginate } from "../fixtures/catalog";

// MSW handlers of qone-catalog-api, read operations CA-01, CA-02, CA-04, CA-05, CA-06, CA-08
// (writes and reservations arrive with their screens). Relative paths: they match whatever
// gateway origin the shell is configured with. Errors use the common envelope.
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

export const catalogHandlers = [
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
