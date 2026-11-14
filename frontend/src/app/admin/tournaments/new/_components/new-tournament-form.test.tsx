import { render, screen } from "@testing-library/react";

import { NewTournamentForm } from "./new-tournament-form";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe("NewTournamentForm", () => {
  afterEach(() => sessionStorage.clear());

  it.each([
    { name: "shows the placeholder without a saved draft", draft: null, text: "Select an option" },
    { name: "restores the saved authority", draft: { authority: "FIE" }, text: "FIE" },
  ])("$name", ({ draft, text }) => {
    if (draft) {
      sessionStorage.setItem("tournament-draft", JSON.stringify(draft));
    }
    render(<NewTournamentForm />);

    expect(screen.getByRole("combobox", { name: "Authority" })).toHaveTextContent(text);
  });
});
