import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../mocks/server";
import { testSession } from "../../test/shell/session";
import { SubjectPage } from "./SubjectPage";

function renderPage(code: string) {
  return render(
    <MemoryRouter initialEntries={[`/${code}`]}>
      <Routes>
        <Route path="/:code" element={<SubjectPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => testSession.signInAs({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT", name: "Laura Gómez" }));

// HU-CAT-003: a subject with its prerequisites and the sections of the term with seats and schedule.
describe("SubjectPage", () => {
  it("shows the subject, its prerequisites and the sections with seats and schedule", async () => {
    renderPage("ISW-604");

    expect(await screen.findByRole("heading", { level: 3, name: "ISW-604 Sistemas Distribuidos" })).toBeInTheDocument();
    expect(screen.getByText("4 credits, semester 6")).toBeInTheDocument();
    expect(screen.getByText("Prerequisites:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RED-501" })).toHaveAttribute("href", "/RED-501");

    const table = await screen.findByRole("table", { name: "Sections of ISW-604" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Group 1");
    expect(rows[0]).toHaveTextContent("Carlos Ramírez");
    expect(rows[0]).toHaveTextContent("MON 08:00-10:00, WED 08:00-10:00");
    expect(within(rows[0]!).getByText("27 seats")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Full")).toBeInTheDocument();
  });

  it("says when a subject has no prerequisites and no sections this term", async () => {
    renderPage("HUM-501");

    expect(await screen.findByText("No prerequisites.")).toBeInTheDocument();
    expect(await screen.findByText("No sections open this term.")).toBeInTheDocument();
  });

  it("shows the not-found error for an unknown code", async () => {
    renderPage("XXX-999");

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not find this subject.");
  });

  it("shows the loading state of each part and the error of the sections independently", async () => {
    server.use(http.get("*/api/v1/catalog/subjects/:code/sections", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "trace-9" }, { status: 500 })));
    renderPage("ISW-604");

    expect(screen.getByRole("status")).toHaveTextContent("Loading subject");
    expect(await screen.findByRole("heading", { level: 3, name: "ISW-604 Sistemas Distribuidos" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("trace-9");
  });
});
