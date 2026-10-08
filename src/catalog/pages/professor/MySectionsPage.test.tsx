import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { catalogFixtures } from "../../../mocks/fixtures/catalog";
import { testSession } from "../../../test/shell/session";
import { MySectionsPage } from "./MySectionsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/professor/sections"]}>
      <Routes>
        <Route path="/professor/sections" element={<MySectionsPage />} />
        <Route path="/:code" element={<p>subject detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

// HU-WEB-002: a professor sees the sections assigned to them this term with occupancy and
// schedule (CA-07). Only PROFESSOR; the roster lives in the enrollment portal (EN-10) and is
// linked from here.
describe("MySectionsPage", () => {
  it("lists the professor's sections with subject, group, schedule and occupancy", async () => {
    testSession.signInAs({ id: catalogFixtures.professors.carlos.id, role: "PROFESSOR", name: "Carlos Ramírez" });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your sections");

    const table = await screen.findByRole("table", { name: "My sections" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("ISW-604");
    expect(rows[0]).toHaveTextContent("Sistemas Distribuidos");
    expect(rows[0]).toHaveTextContent("Group 1");
    expect(rows[0]).toHaveTextContent("MON 08:00-10:00, WED 08:00-10:00");
    expect(rows[0]).toHaveTextContent("3 of 30 seats taken");
    expect(rows[1]).toHaveTextContent("30 of 30 seats taken");
    expect(within(rows[0]!).getByRole("link", { name: "Roster" })).toHaveAttribute("href", `/enrollment/sections/${catalogFixtures.sections[4]!.id}/roster`);
  });

  it("shows the empty state for a professor without sections this term", async () => {
    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222229", role: "PROFESSOR", name: "Nueva Docente" });
    renderPage();

    expect(await screen.findByText("You have no sections assigned this term.")).toBeInTheDocument();
  });

  it("shows the permission notice to a student", () => {
    testSession.signInAs({ id: "s-1", role: "STUDENT", name: "Laura Gómez" });
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
  });

  it("shows the error with the traceId and retries", async () => {
    testSession.signInAs({ id: catalogFixtures.professors.ana.id, role: "PROFESSOR", name: "Ana Torres" });
    server.use(http.get("*/api/v1/catalog/sections/mine", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-8" }, { status: 500 }), { once: true }));
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-8");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(within(await screen.findByRole("table", { name: "My sections" })).getAllByRole("row").slice(1)).toHaveLength(4);
  });
});
