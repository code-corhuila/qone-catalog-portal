import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { App } from "./App";

// First test of the portal (written before App.tsx): mounted anywhere by the shell, it renders
// its own heading and its index route.
describe("catalog App", () => {
  it("renders the catalog heading and its index content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Catalog" })).toBeInTheDocument();
    expect(screen.getByText("Subjects, sections and seats load here.")).toBeInTheDocument();
  });
});
