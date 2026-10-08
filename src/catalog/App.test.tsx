import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
});
