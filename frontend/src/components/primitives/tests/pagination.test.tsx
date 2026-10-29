import { render, screen } from "@testing-library/react";

import { Pagination } from "@/components/primitives/pagination";

describe("Pagination", () => {
  const cases = [
    {
      name: "the first page",
      offset: 0,
      range: "1–20 of 50",
      previous: null,
      next: "/tournaments?offset=20",
    },
    {
      name: "the last page",
      offset: 40,
      range: "41–50 of 50",
      previous: "/tournaments?offset=20",
      next: null,
    },
    {
      name: "an offset that is not a multiple of limit",
      offset: 25,
      range: "26–45 of 50",
      previous: "/tournaments?offset=5",
      next: "/tournaments?offset=45",
    },
    {
      name: "an offset past the end",
      offset: 100,
      range: "41–50 of 50",
      previous: "/tournaments?offset=20",
      next: null,
    },
  ];

  it.each(cases)("shows $name", ({ offset, range, previous, next }) => {
    render(
      <Pagination
        total={50}
        limit={20}
        offset={offset}
        basePath="/tournaments"
      />,
    );

    expect(screen.getByText(range)).toBeInTheDocument();

    for (const [label, href] of [
      ["Previous", previous],
      ["Next", next],
    ] as const) {
      if (href === null) {
        expect(screen.getByRole("button", { name: label })).toBeDisabled();
      } else {
        expect(screen.getByRole("link", { name: label })).toHaveAttribute(
          "href",
          href,
        );
      }
    }
  });

  it("keeps the filters on both links and drops empty ones", () => {
    render(
      <Pagination
        total={50}
        limit={20}
        offset={20}
        basePath="/tournaments"
        params={{ q: "epee", status: "active", date: undefined }}
      />,
    );

    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/tournaments?q=epee&status=active",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/tournaments?q=epee&status=active&offset=40",
    );
  });

  it("renders nothing without results", () => {
    const { container } = render(
      <Pagination total={0} limit={20} offset={0} basePath="/tournaments" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
