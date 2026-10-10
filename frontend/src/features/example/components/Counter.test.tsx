import { fireEvent, render, screen } from "@testing-library/react";
import { Counter } from "@/features/example/components/Counter";

const config = { initial: 1, min: 0, max: 2 };

function setup() {
  render(<Counter config={config} />);
  return {
    count: screen.getByRole("status"),
    increment: screen.getByRole("button", { name: "Increment" }),
    decrement: screen.getByRole("button", { name: "Decrement" }),
    reset: screen.getByRole("button", { name: "Reset" }),
  };
}

describe("Counter", () => {
  it.each([
    ["increments", "Increment", "2"],
    ["decrements", "Decrement", "0"],
  ] as const)("%s by one", (_, button, expected) => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(screen.getByRole("status")).toHaveTextContent(expected);
  });

  it("disables the buttons at the bounds", () => {
    const { count, increment, decrement } = setup();

    fireEvent.click(increment);
    expect(count).toHaveTextContent("2");
    expect(increment).toBeDisabled();

    fireEvent.click(decrement);
    fireEvent.click(decrement);
    expect(count).toHaveTextContent("0");
    expect(decrement).toBeDisabled();
  });

  it("resets to the initial value", () => {
    const { count, increment, reset } = setup();

    fireEvent.click(increment);
    fireEvent.click(reset);
    expect(count).toHaveTextContent("1");
  });
});
