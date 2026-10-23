import { act, fireEvent, render, screen } from "@testing-library/react";

import { SearchForm } from "@/features/tournament/components/search-form";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => new URLSearchParams(),
}));

describe("SearchForm", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function renderForm(defaultValue: string) {
    return render(
      <SearchForm action="/tournaments" label="Search tournaments" defaultValue={defaultValue} />,
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
      <SearchForm action="/tournaments" label="Search tournaments" defaultValue="summer" />,
    );

    expect(input).toHaveValue(typedSince);
  });

  it("follows a search changed from outside the field", () => {
    const { rerender } = renderForm("summer");

    rerender(<SearchForm action="/tournaments" label="Search tournaments" defaultValue="fall" />);

    expect(screen.getByRole("searchbox")).toHaveValue("fall");
  });
});
