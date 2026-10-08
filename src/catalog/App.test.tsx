import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { testSession } from "../test/shell/session";
import { App } from "./App";

// Mounted anywhere by the shell, the module renders its own heading and routes its index to
// the subjects list (HU-CAT-003).
describe("catalog App", () => {
  it("renders the catalog heading and the subjects list on its index route", async () => {
    testSession.signInAs({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT", name: "Laura Gómez" });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Catalog" })).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Subjects" })).toBeInTheDocument();
  });

  it("keeps every link under the shell's mount point when mounted at /catalog/* (admin)", async () => {
    testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" });
    render(
      <MemoryRouter initialEntries={["/catalog"]}>
        <Routes>
          <Route path="/catalog/*" element={<App />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "ISW-604" })).toHaveAttribute("href", "/catalog/ISW-604");
    expect(screen.getByRole("link", { name: "New subject" })).toHaveAttribute("href", "/catalog/admin/subjects/new");
    expect(screen.getByRole("link", { name: "Open a section" })).toHaveAttribute("href", "/catalog/admin/sections/new");
  });

  it("resolves the detail's back and prerequisite links under /catalog as well", async () => {
    testSession.signInAs({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT", name: "Laura Gómez" });
    render(
      <MemoryRouter initialEntries={["/catalog/ISW-604"]}>
        <Routes>
          <Route path="/catalog/*" element={<App />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "RED-501" })).toHaveAttribute("href", "/catalog/RED-501");
    expect(screen.getByRole("link", { name: "Back to subjects" })).toHaveAttribute("href", "/catalog");
  });
});
