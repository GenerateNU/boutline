import { act, fireEvent, render, screen } from "@testing-library/react";

import { SearchForm, type SearchFormProps } from "@/features/tournament/components/search-form";
import { apiRequest } from "@/services/api-request";

const replace = jest.fn();
const push = jest.fn();
const CURRENT_PARAMS = new URLSearchParams("q=summer");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/tournaments",
  useSearchParams: () => CURRENT_PARAMS,
}));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const SUGGEST: SearchFormProps["suggest"] = {
  tournamentId: "t1",
  sources: [
    { kind: "fencers", href: "/tournaments/t1/fencers" },
    { kind: "clubs", href: "/tournaments/t1/clubs" },
  ],
};

const PROPS = {
  action: "/tournaments",
  label: "Search tournaments",
  placeholder: "e.g. Fall Open 2026",
};

describe("SearchForm", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    push.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderForm(defaultValue: string) {
    return render(
      <SearchForm {...PROPS} defaultValue={defaultValue} />,
    );
  }

  it.each([
    { name: "a trailing space", typedSince: "summer " },
    { name: "more characters", typedSince: "summer in" },
  ])("keeps $name typed while the URL catches up to the sent search", ({ typedSince }) => {
    const { rerender } = renderForm("");
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "summer" } });
    act(() => jest.advanceTimersByTime(300));
    expect(replace).toHaveBeenLastCalledWith("/tournaments?q=summer", { scroll: false });

    fireEvent.change(input, { target: { value: typedSince } });
    rerender(
      <SearchForm {...PROPS} defaultValue="summer" />,
    );

    expect(input).toHaveValue(typedSince);
  });

  it("shows the sample placeholder", () => {
    render(<SearchForm {...PROPS} />);

    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "e.g. Fall Open 2026");
  });

  it("follows a search changed from outside the field", () => {
    const { rerender } = renderForm("summer");

    rerender(<SearchForm {...PROPS} defaultValue="fall" />);

    expect(screen.getByRole("searchbox")).toHaveValue("fall");
  });

  it.each([
    { defaultValue: "", clearVisible: false },
    { defaultValue: "summer", clearVisible: true },
  ])("clear button visible=$clearVisible for '$defaultValue'", ({ defaultValue, clearVisible }) => {
    renderForm(defaultValue);

    expect(screen.queryByRole("button", { name: "Clear search" }) !== null).toBe(clearVisible);
  });

  it("clears the box and removes q from the URL", () => {
    renderForm("summer");

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(replace).toHaveBeenLastCalledWith("/tournaments", { scroll: false });
  });

  describe("suggestions", () => {
    beforeEach(() => {
      jest.mocked(apiRequest).mockImplementation(async (path: string) =>
        path.startsWith("/competitors")
          ? { data: [{ firstName: "Eric", lastName: "Kitagawa" }] }
          : { data: [{ name: "Salle Nord" }] },
      );
    });

    async function typeInto(suggest?: SearchFormProps["suggest"]) {
      render(<SearchForm {...PROPS} suggest={suggest} />);
      const input = screen.getByRole("searchbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "er" } });
      await act(() => jest.advanceTimersByTimeAsync(300));
    }

    it("shows no dropdown without suggest", async () => {
      await typeInto();

      expect(screen.queryByText("Fencers")).not.toBeInTheDocument();
      expect(apiRequest).not.toHaveBeenCalled();
    });

    it("lists a section per source with names from the API", async () => {
      await typeInto(SUGGEST);

      expect(screen.getByText("Fencers")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Eric Kitagawa" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Salle Nord" })).toBeInTheDocument();
      expect(apiRequest).toHaveBeenCalledWith("/competitors?limit=5&q=er&tournament_id=t1");
      expect(apiRequest).toHaveBeenCalledWith("/tournaments/t1/teams?limit=5&q=er");
    });

    it.each([
      { name: "Eric Kitagawa", href: "/tournaments/t1/fencers?q=Eric%20Kitagawa" },
      { name: "Salle Nord", href: "/tournaments/t1/clubs?q=Salle%20Nord" },
    ])("picking $name pushes $href and closes the dropdown", async ({ name, href }) => {
      await typeInto(SUGGEST);

      fireEvent.click(screen.getByRole("button", { name }));

      expect(push).toHaveBeenCalledWith(href);
      expect(screen.queryByText("Fencers")).not.toBeInTheDocument();
    });

    it("closes on Escape", async () => {
      await typeInto(SUGGEST);

      fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });

      expect(screen.queryByText("Fencers")).not.toBeInTheDocument();
    });
  });
});
