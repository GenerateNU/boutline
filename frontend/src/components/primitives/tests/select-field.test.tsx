import { fireEvent, render, screen } from "@testing-library/react";

import { SelectField } from "@/components/primitives/select-field";

beforeAll(() => {
  // jsdom lacks these; Radix calls them when opening and picking items.
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
});

function renderField(props: Partial<React.ComponentProps<typeof SelectField>> = {}) {
  return render(
    <form data-testid="form">
      <SelectField label="Weapon" name="weapon" options={["Foil", "Sabre"]} {...props} />
    </form>,
  );
}

describe("SelectField", () => {
  it.each([
    { name: "shows the placeholder with no value", props: {}, text: "Select an option" },
    { name: "shows the default value's label", props: { defaultValue: "Sabre" }, text: "Sabre" },
  ])("$name", ({ props, text }) => {
    renderField(props);

    expect(screen.getByRole("combobox", { name: "Weapon" })).toHaveTextContent(text);
  });

  it("shows the chosen option and submits it with the form", () => {
    renderField();
    const trigger = screen.getByRole("combobox", { name: "Weapon" });

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Foil" }));

    expect(trigger).toHaveTextContent("Foil");
    expect(new FormData(screen.getByTestId("form") as HTMLFormElement).get("weapon")).toBe("Foil");
  });

  it("disables the trigger", () => {
    renderField({ disabled: true });

    expect(screen.getByRole("combobox", { name: "Weapon" })).toBeDisabled();
  });
});
