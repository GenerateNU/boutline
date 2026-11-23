import { fireEvent, render, screen } from "@testing-library/react";

import { FadingScrollArea } from "./fading-scroll-area";

describe("FadingScrollArea", () => {
  it.each([
    { scrollTop: 0, visible: false },
    { scrollTop: 40, visible: true },
  ])("shows the fade only once scrolled ($scrollTop px)", ({ scrollTop, visible }) => {
    render(
      <FadingScrollArea>
        <p>Adams</p>
      </FadingScrollArea>,
    );
    const scroller = screen.getByText("Adams").parentElement!;

    scroller.scrollTop = scrollTop;
    fireEvent.scroll(scroller);

    expect(screen.getByTestId("scroll-fade")).toHaveClass(visible ? "opacity-100" : "opacity-0");
  });
});
