import { apiRequest } from "@/services/api-request";

import { createPool } from "./create-pool";

jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

describe("createPool", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ id: "new-stage" });
  });

  const cases = [
    {
      name: "creates the stage first when there is none",
      poolStageId: null,
      strip: "3",
      calls: [
        ["/pool-stages", { event_id: "e1", max_competitor_per_pool: 10 }],
        ["/pools", { pools: [{ pool_stage_id: "new-stage", number: 2, strip: "Strip 3", fencers: ["a", "b"] }] }],
      ],
    },
    {
      name: "reuses an existing stage and drops a blank strip",
      poolStageId: "s1",
      strip: " ",
      calls: [["/pools", { pools: [{ pool_stage_id: "s1", number: 2, fencers: ["a", "b"] }] }]],
    },
  ];

  it.each(cases)("$name", async ({ poolStageId, strip, calls }) => {
    await createPool({ eventId: "e1", poolStageId, number: 2, strip, fencerIds: ["a", "b"] });

    expect(apiRequestMock.mock.calls.map(([path, init]) => [path, JSON.parse(String(init?.body))])).toEqual(calls);
  });
});
