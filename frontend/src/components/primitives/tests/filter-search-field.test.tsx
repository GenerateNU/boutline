import { fireEvent, render, screen } from "@testing-library/react";

import { FilterSearchField } from "@/components/primitives/filter-search-field";

const suggestions = [{ value: "nord", label: "Salle Nord" }];

function renderField(props: Partial<React.ComponentProps<typeof FilterSearchField>> = {}) {
  const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
  const onPick = jest.fn();
  const onCommitText = jest.fn();
  render(
    <form onSubmit={onSubmit}>
      <FilterSearchField
        label="Club"
        noun="clubs"
        selected=""
        suggestions={null}
        failed={false}
        onPick={onPick}
        onCommitText={onCommitText}
        {...props}
      />
    </form>,
  );
  return { onSubmit, onPick, onCommitText };
}

function pressEnter(value: string, isComposing = false) {
  const box = screen.getByRole("searchbox", { name: "Club" });
  fireEvent.change(box, { target: { value } });
  fireEvent.keyDown(box, { key: "Enter", isComposing });
}

describe("FilterSearchField", () => {
  it.each([
    { name: "trims and commits typed text", text: "  bos  ", isComposing: false, wantCommit: "bos" },
    { name: "commits nothing for whitespace only", text: "   ", isComposing: false, wantCommit: null },
    { name: "commits nothing mid IME composition", text: "bos", isComposing: true, wantCommit: null },
  ])("$name on Enter, without submitting the form", ({ text, isComposing, wantCommit }) => {
    const { onSubmit, onCommitText } = renderField();

    pressEnter(text, isComposing);

    if (wantCommit) {
      expect(onCommitText).toHaveBeenCalledWith(wantCommit);
    } else {
      expect(onCommitText).not.toHaveBeenCalled();
    }
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls neither onCommitText nor onSubmit on Enter when onCommitText is omitted", () => {
    const { onSubmit, onCommitText } = renderField({ onCommitText: undefined });

    pressEnter("bos");

    expect(onCommitText).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("picking a suggestion calls onPick and not onSubmit", () => {
    const { onSubmit, onPick } = renderField({ suggestions });

    fireEvent.click(screen.getByRole("button", { name: "Salle Nord" }));

    expect(onPick).toHaveBeenCalledWith("nord");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders suggestion options", () => {
    renderField({ suggestions });

    expect(screen.getByRole("button", { name: "Salle Nord" })).toBeInTheDocument();
  });

  it.each([
    { name: "no matches", suggestions: [], failed: false, want: "No clubs match." },
    { name: "a failed request", suggestions: null, failed: true, want: "Couldn’t load clubs." },
  ])("shows a message for $name", ({ suggestions, failed, want }) => {
    renderField({ suggestions, failed });

    expect(screen.getByText(want)).toBeInTheDocument();
  });

  // jsdom doesn't move focus on a label click, so check what the browser relies on: the box labels the input.
  it("makes its whole box the input's label, so a click anywhere in it focuses the input", () => {
    renderField();
    const input = screen.getByRole("searchbox", { name: "Club" });

    expect(input.closest("label")?.control).toBe(input);
  });
});
