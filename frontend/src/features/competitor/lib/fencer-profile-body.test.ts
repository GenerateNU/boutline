import { fencerProfileBody } from "@/features/competitor/lib/fencer-profile-body";

describe("fencerProfileBody", () => {
  it("trims values and sends the club as team and primaryClub", () => {
    expect(
      fencerProfileBody({ firstName: " Ada ", lastName: "Lovelace ", club: " Northeastern " }),
    ).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      team: "Northeastern",
      primaryClub: "Northeastern",
    });
  });
});
