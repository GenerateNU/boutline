import { render, screen } from "@testing-library/react";

import { Slider } from "../slider";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

describe("Slider", () => {
  it.each([
    { name: "unit labels", props: { unit: "MI" }, present: ["0 MI", "100 MI"], absent: ["50"] },
    { name: "value bubble", props: { showValue: true, defaultValue: [50] }, present: ["50"], absent: ["0 MI", "100 MI"] },
    { name: "plain", props: { defaultValue: [50] }, present: [], absent: ["50", "0 MI", "100 MI"] },
  ])("$name", ({ props, present, absent }) => {
    render(<Slider {...props} />);
    for (const text of present) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of absent) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });
});
