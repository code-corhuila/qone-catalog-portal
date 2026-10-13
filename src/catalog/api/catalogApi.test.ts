import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { catalogFixtures } from "../../mocks/fixtures/catalog";
import { testSession } from "../../test/shell/session";
import { catalogApi } from "./catalogApi";

// Core level: typed calls over shell/apiClient (stubbed in tests). Paths, query parameters and
// the Idempotency-Key are the contract (qone-catalog-api.yaml); nothing here knows the gateway.
beforeEach(() => testSession.signInAs({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT", name: "Laura Gómez" }));

describe("catalogApi", () => {
  it("lists subjects as a page with data and meta (CA-02)", async () => {
    const page = await catalogApi.listSubjects({ page: 1, limit: 5 });

    expect(page.data).toHaveLength(5);
    expect(page.meta).toEqual({ page: 1, limit: 5, total: 14, totalPages: 3 });
    expect(page.data[0]?.code).toBe("ISW-501");
  });

  it("passes the semester filter and omits undefined parameters", async () => {
    let seen = "";
    server.use(http.get("*/api/v1/catalog/subjects", ({ request }) => { seen = new URL(request.url).search; return HttpResponse.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }); }));

    await catalogApi.listSubjects({ semester: 6 });

    expect(seen).toBe("?semester=6");
  });

  it("reads one subject by code and its sections for the term (CA-04, CA-05)", async () => {
    const subject = await catalogApi.getSubject("ISW-604");
    const sections = await catalogApi.listSections("ISW-604", { term: "2026-B" });

    expect(subject.name).toBe("Sistemas Distribuidos");
    expect(subject.prerequisites).toEqual(["RED-501"]);
    expect(sections.data.map((s) => s.groupNumber)).toEqual([1, 2, 3]);
    expect(sections.data[2]?.seatsAvailable).toBe(0);
  });

  it("reads one section by id (CA-08) and surfaces the envelope of an unknown one", async () => {
    const first = catalogFixtures.sections[0]!;
    await expect(catalogApi.getSection(first.id)).resolves.toMatchObject({ id: first.id, subjectName: "Bases de Datos II" });
    await expect(catalogApi.getSection("55555555-5555-4555-8555-555555555599")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("creates a subject with the Idempotency-Key it was given (CA-03, norm 5.4.2)", async () => {
    let key: string | null = null;
    let body: unknown;
    server.use(http.post("*/api/v1/catalog/subjects", async ({ request }) => { key = request.headers.get("idempotency-key"); body = await request.json(); return HttpResponse.json({ ...catalogFixtures.subjects[0] }, { status: 201 }); }));

    await catalogApi.createSubject({ code: "ISW-801", name: "Tesis", credits: 4, semester: 8, prerequisites: [] }, "subj-ISW-801-0001");

    expect(key).toBe("subj-ISW-801-0001");
    expect(body).toEqual({ code: "ISW-801", name: "Tesis", credits: 4, semester: 8, prerequisites: [] });
  });

  it("lists the professor's own sections (CA-07)", async () => {
    testSession.signInAs({ id: catalogFixtures.professors.carlos.id, role: "PROFESSOR", name: "Carlos Ramírez" });

    const mine = await catalogApi.mySections({ term: "2026-B" });

    expect(mine.data.map((s) => `${s.subjectCode} g${s.groupNumber}`)).toEqual(["ISW-604 g1", "ISW-501 g2", "RED-501 g1"]);
  });
});
