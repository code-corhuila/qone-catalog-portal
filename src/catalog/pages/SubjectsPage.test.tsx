import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../mocks/server";
import { testSession } from "../../test/shell/session";
import { SubjectsPage } from "./SubjectsPage";

function renderPage(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<SubjectsPage />} />
        <Route path="/:code" element={<p>subject detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => testSession.signInAs({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT", name: "Laura Gómez" }));

// HU-CAT-003: browse the catalog. Annex H: the four states, a newer request replaces the older.
describe("SubjectsPage", () => {
  it("shows the loading state, then the subjects of the first page with code, credits and semester", async () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading subjects");

    const table = await screen.findByRole("table", { name: "Subjects" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent("ISW-501");
    expect(rows[0]).toHaveTextContent("Bases de Datos I");
    expect(rows[0]).toHaveTextContent("3");
    expect(screen.getByText("14 subjects, page 1 of 2")).toBeInTheDocument();
  });

  it("paginates with the contract's page and limit", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("table", { name: "Subjects" });

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(await screen.findByText("14 subjects, page 2 of 2")).toBeInTheDocument();
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("filters by semester and replaces the previous request", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("table", { name: "Subjects" });

    await user.selectOptions(screen.getByLabelText("Semester"), "7");

    expect(await screen.findByText("4 subjects, page 1 of 1")).toBeInTheDocument();
    expect(screen.getAllByRole("row").slice(1).every((r) => /ISW-70/.test(r.textContent ?? ""))).toBe(true);
  });

  it("shows the empty state when nothing matches", async () => {
    server.use(http.get("*/api/v1/catalog/subjects", async () => { await delay(10); return HttpResponse.json({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }); }));
    renderPage();

    expect(await screen.findByText("No subjects match this filter.")).toBeInTheDocument();
  });

  it("shows the error with the traceId and retries", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/v1/catalog/subjects", () => HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "trace-7" }, { status: 503 }), { once: true }));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("trace-7");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table", { name: "Subjects" })).toBeInTheDocument();
  });

  it("links each subject to its detail", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("link", { name: "ISW-604" }));
    expect(screen.getByText("subject detail")).toBeInTheDocument();
  });
});
