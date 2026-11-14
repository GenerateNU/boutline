import { render } from "@testing-library/react";

import { Background, type BackgroundVersion } from "@/components/primitives/background";

describe("Background", () => {
  it.each<BackgroundVersion>([1, 2, 3, 4, 5, 6, 7, 8])("renders pattern %i", (version) => {
    const { container } = render(<Background version={version} />);

    expect(container.querySelector("img")?.getAttribute("src")).toContain(`bg-${version}.svg`);
  });
});
