import { apiRequest } from "@/services/api-request";

import { importFencers } from "./import-fencers";

jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

// jsdom's Blob lacks text(), which every browser has.
Blob.prototype.text ??= function (this: Blob) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(this);
  });
};

const CSV = `First Name,Last Name,Club,Division,Birth Date,Gender,Rating
Maria,Alvarez,Boston Fencing Club,New England,2011-03-14,F,C24
Lily,Chen,,New England,2012-07-02,F,
Kate,Obrien,Cambridge,,2011-03-22,F,D`;

function csvFile() {
  return new File([CSV], "fencers.csv", { type: "text/csv" });
}

describe("importFencers", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("posts each complete row to the event and counts the rest as skipped", async () => {
    apiRequestMock.mockResolvedValue({});

    await expect(importFencers(csvFile(), "e1")).resolves.toEqual({ added: 2, skipped: 1 });
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(apiRequestMock.mock.calls[0][1]!.body as string)).toEqual({
      eventId: "e1",
      firstName: "Maria",
      lastName: "Alvarez",
      gender: "F",
      birthdate: "2011-03-14",
      division: "New England",
      rating: "C",
      ratingYear: 24,
      team: "Boston Fencing Club",
      primaryClub: "Boston Fencing Club",
      memberNumber: "",
    });
  });

  it("stops at a failed request and says how many were added", async () => {
    apiRequestMock.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("division is invalid"));

    await expect(importFencers(csvFile(), "e1")).rejects.toThrow("Added 1 of 2 fencers, then: division is invalid");
  });
});
