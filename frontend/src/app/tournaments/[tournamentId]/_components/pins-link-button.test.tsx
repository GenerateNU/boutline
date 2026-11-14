import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";

import { PinsLinkButton } from "@/app/tournaments/[tournamentId]/_components/pins-link-button";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

describe("PinsLinkButton", () => {
  it.each([
    { name: "overview", pathname: "/tournaments/t1", linked: true },
    { name: "event fencers", pathname: "/tournaments/t1/events/e1/fencers", linked: true },
    { name: "referee screen", pathname: "/tournaments/t1/events/e1/bout/b1/referee", linked: false },
  ])("$name", ({ pathname, linked }) => {
    jest.mocked(usePathname).mockReturnValue(pathname);
    render(<PinsLinkButton tournamentId="t1" />);

    const link = screen.queryByRole("link", { name: "View pins" });
    if (linked) {
      expect(link).toHaveAttribute("href", "/pinned?tournamentId=t1");
    } else {
      expect(link).toBeNull();
    }
  });
});
