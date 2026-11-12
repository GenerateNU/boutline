import { render, screen } from "@testing-library/react";

import { Loading } from "@/components/primitives/loading";

describe("Loading", () => {
  it("announces loading without exposing a progress value", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
