import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { catalogFixtures } from "../../../mocks/fixtures/catalog";
import { testSession } from "../../../test/shell/session";
import { NewSectionPage } from "./NewSectionPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/sections/new"]}>
      <Routes>
        <Route path="/admin/sections/new" element={<NewSectionPage />} />
        <Route path="/:code" element={<p>subject detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText("Subject"), "ISW-702");
  await user.clear(screen.getByLabelText("Group number"));
  await user.type(screen.getByLabelText("Group number"), "1");
  await user.selectOptions(await screen.findByLabelText("Professor"), catalogFixtures.professors.ana.id);
  await user.clear(screen.getByLabelText("Capacity"));
  await user.type(screen.getByLabelText("Capacity"), "25");
  await user.selectOptions(screen.getByLabelText("Day of block 1"), "MON");
  await user.clear(screen.getByLabelText("Start of block 1"));
  await user.type(screen.getByLabelText("Start of block 1"), "14:00");
  await user.clear(screen.getByLabelText("End of block 1"));
  await user.type(screen.getByLabelText("End of block 1"), "16:00");
}

beforeEach(() => testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" }));

// HU-CAT-002: an ADMIN opens a section with professor, capacity and schedule. The professor
// comes from identity (ID-05, through the shell's client) and is sent as a snapshot
// (professorId + professorName); INV-SEC-002 is checked on the client before the API.
describe("NewSectionPage", () => {
  it("offers the subjects and the professors of identity, the current term and one empty block", async () => {
    renderPage();

    expect(within(await screen.findByLabelText("Subject")).getAllByRole("option")).toHaveLength(15);
    const professors = await screen.findByLabelText("Professor");
    expect(within(professors).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose a professor", "Carlos Ramírez", "Ana Torres", "Jorge Medina"]);
    expect(screen.getByText("Term 2026-B")).toBeInTheDocument();
    expect(screen.getByLabelText("Day of block 1")).toBeInTheDocument();
  });

  it("adds and removes schedule blocks and reports an overlap beside the block", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Add block" }));
    await user.selectOptions(screen.getByLabelText("Day of block 2"), "MON");
    await user.clear(screen.getByLabelText("Start of block 2"));
    await user.type(screen.getByLabelText("Start of block 2"), "15:00");
    await user.clear(screen.getByLabelText("End of block 2"));
    await user.type(screen.getByLabelText("End of block 2"), "17:00");
    await user.click(screen.getByRole("button", { name: "Open section" }));

    const error = screen.getByText("This block overlaps block 1 (INV-SEC-002).");
    expect(screen.getByLabelText("Start of block 2")).toHaveAttribute("aria-describedby", error.id);

    await user.click(screen.getByRole("button", { name: "Remove block 2" }));
    expect(screen.queryByLabelText("Day of block 2")).not.toBeInTheDocument();
  });

  it("opens the section with the professor snapshot, the term and the Idempotency-Key, then shows the subject", async () => {
    const user = userEvent.setup();
    let body: unknown;
    let key: string | null = null;
    server.use(
      http.post("*/api/v1/catalog/sections", async ({ request }) => {
        key = request.headers.get("idempotency-key");
        body = await request.json();
        return HttpResponse.json({ ...(body as object), id: "s-new", subjectName: "Computación en la Nube", seatsAvailable: 25, createdAt: "2026-10-08T00:00:00Z" }, { status: 201 });
      }),
    );
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Open section" }));

    expect(await screen.findByText("subject detail")).toBeInTheDocument();
    expect(key).toMatch(/^section-/);
    expect(body).toEqual({
      subjectCode: "ISW-702",
      term: "2026-B",
      groupNumber: 1,
      professorId: catalogFixtures.professors.ana.id,
      professorName: "Ana Torres",
      capacity: 25,
      slots: [{ day: "MON", start: "14:00", end: "16:00" }],
    });
  });

  it("shows the API's business rule as the form error with its traceId", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/v1/catalog/sections", () => HttpResponse.json({ error: "BUSINESS_RULE_VIOLATION", message: "INV-SEC-002: the slots of a section must not overlap", traceId: "t-5" }, { status: 422 })));
    renderPage();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "Open section" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("INV-SEC-002");
    expect(alert).toHaveTextContent("t-5");
  });

  it("keeps the form usable when identity is down: the professor list shows its error with a retry", async () => {
    server.use(http.get("*/api/v1/identity/users", () => HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "t-6" }, { status: 503 }), { once: true }));
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-6");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(within(await screen.findByLabelText("Professor")).getAllByRole("option")).toHaveLength(4);
  });
});
