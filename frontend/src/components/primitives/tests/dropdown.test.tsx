import { render, screen, within } from "@testing-library/react";

import {
  Dropdown,
  DropdownItem,
  DropdownSection,
} from "@/components/primitives/dropdown";

describe("Dropdown", () => {
  const sections = [
    { title: "Fencers", rows: ["Eric Kitagawa", "Ana Diaz"] },
    { title: "Tournaments", rows: ["Boston Championship"] },
  ];

  it("groups each section's rows under a region named by its title", () => {
    render(
      <Dropdown>
        {sections.map(({ title, rows }) => (
          <DropdownSection key={title} title={title}>
            {rows.map((row) => (
              <DropdownItem key={row}>{row}</DropdownItem>
            ))}
          </DropdownSection>
        ))}
      </Dropdown>,
    );

    for (const { title, rows } of sections) {
      const region = screen.getByRole("region", { name: title });
      const items = within(region).getAllByRole("listitem");
      expect(items.map((item) => item.textContent)).toEqual(rows);
    }
  });
});
