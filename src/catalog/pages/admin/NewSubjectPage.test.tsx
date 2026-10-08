import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { testSession } from "../../../test/shell/session";
import { NewSubjectPage } from "./NewSubjectPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/subjects/new"]}>
      <Routes>
        <Route path="/admin/subjects/new" element={<NewSubjectPage />} />
        <Route path="/:code" element={<p>subject detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Code"), "ISW-801");
  await user.type(screen.getByLabelText("Name"), "Trabajo de Grado");
  await user.clear(screen.getByLabelText("Credits"));
  await user.type(screen.getByLabelText("Credits"), "4");
  await user.clear(screen.getByLabelText("Semester"));
  await user.type(screen.getByLabelText("Semester"), "8");
}

beforeEach(() => testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" }));

// HU-CAT-001: an ADMIN creates a subject with prerequisites. Annex H form rules: label per
// field, error beside the field (aria-describedby), button disabled while pending, one
// Idempotency-Key per intention reused on retry. INV-SUB-001: unique code.
describe("NewSubjectPage", () => {
  it("has a labelled field per attribute and lists the existing subjects as prerequisites", async () => {
    renderPage();

    for (const label of ["Code", "Name", "Credits", "Semester", "Prerequisites"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
    const prerequisites = await screen.findByLabelText("Prerequisites");
    expect(within(prerequisites).getAllByRole("option")).toHaveLength(14);
    expect(screen.getByRole("button", { name: "Create subject" })).toBeEnabled();
  });

  it("validates on the client and shows each error beside its field without calling the API", async () => {
    const user = userEvent.setup();
    let called = false;
    server.use(http.post("*/api/v1/catalog/subjects", () => { called = true; return HttpResponse.json({}, { status: 201 }); }));
    renderPage();
    await screen.findByLabelText("Prerequisites");

    await user.type(screen.getByLabelText("Code"), "isw801");
    await user.clear(screen.getByLabelText("Credits"));
    await user.type(screen.getByLabelText("Credits"), "12");
    await user.click(screen.getByRole("button", { name: "Create subject" }));

    const code = screen.getByLabelText("Code");
    const codeError = screen.getByText("Use the form ISW-604: capital letters, digits and hyphens, 3 to 10 characters.");
    expect(code).toHaveAttribute("aria-describedby", codeError.id);
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Credits go from 1 to 10.")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("creates the subject with the chosen prerequisites and the same Idempotency-Key on retry, then opens it", async () => {
    const user = userEvent.setup();
    const keys: Array<string | null> = [];
    let body: unknown;
    server.use(
      http.post("*/api/v1/catalog/subjects", async ({ request }) => {
        keys.push(request.headers.get("idempotency-key"));
        body = await request.json();
        if (keys.length === 1) return HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "t-1" }, { status: 503 });
        return HttpResponse.json({ id: "x", ...(body as object), createdAt: "2026-10-08T00:00:00Z" }, { status: 201 });
      }),
    );
    renderPage();
    await fillValid(user);
    await user.selectOptions(await screen.findByLabelText("Prerequisites"), ["ISW-604", "ISW-703"]);

    await user.click(screen.getByRole("button", { name: "Create subject" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("t-1");
    await user.click(screen.getByRole("button", { name: "Create subject" }));

    expect(await screen.findByText("subject detail")).toBeInTheDocument();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(/^subject-/);
    expect(body).toEqual({ code: "ISW-801", name: "Trabajo de Grado", credits: 4, semester: 8, prerequisites: ["ISW-604", "ISW-703"] });
  });

  it("disables the button while the request is pending", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    server.use(http.post("*/api/v1/catalog/subjects", async () => { await new Promise<void>((r) => { release = r; }); return HttpResponse.json({}, { status: 201 }); }));
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Create subject" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    release();
  });

  it("shows a server validation error beside its field and a business rule as the form error", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/catalog/subjects", () =>
        HttpResponse.json({ error: "VALIDATION_ERROR", message: "the request has invalid fields", details: [{ field: "semester", message: "must be between 1 and 12" }], traceId: "t-2" }, { status: 400 }),
        { once: true },
      ),
      http.post("*/api/v1/catalog/subjects", () => HttpResponse.json({ error: "BUSINESS_RULE_VIOLATION", message: "INV-SUB-001: a subject with code ISW-801 already exists", traceId: "t-3" }, { status: 422 })),
    );
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Create subject" }));
    expect(await screen.findByText("must be between 1 and 12")).toBeInTheDocument();
    expect(screen.getByLabelText("Semester")).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("button", { name: "Create subject" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("INV-SUB-001");
    expect(alert).toHaveTextContent("t-3");
  });
});
