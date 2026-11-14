import { claimAccountStorage, clearAccountStorage } from "@/features/auth/services/account-storage";

const DRAFT = "account:tournament-creation-draft";

describe("account storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("pinned-fencers", "[]");
  });

  it.each([
    { name: "keeps the drafts when the same account signs back in", owner: "u1", signingIn: "u1", kept: true },
    { name: "clears them when a different account signs in", owner: "u1", signingIn: "u2", kept: false },
    { name: "clears them when the owner is unknown", owner: null, signingIn: "u1", kept: false },
  ])("$name", ({ owner, signingIn, kept }) => {
    if (owner) {
      sessionStorage.setItem("account-owner", owner);
    }
    sessionStorage.setItem(DRAFT, "{}");

    claimAccountStorage(signingIn);

    expect(sessionStorage.getItem(DRAFT) !== null).toBe(kept);
    expect(sessionStorage.getItem("account-owner")).toBe(signingIn);
    expect(sessionStorage.getItem("pinned-fencers")).toBe("[]");
  });

  it("clears the drafts and their owner on sign-out, and nothing else", () => {
    sessionStorage.setItem("account-owner", "u1");
    sessionStorage.setItem(DRAFT, "{}");

    clearAccountStorage();

    expect([sessionStorage.getItem(DRAFT), sessionStorage.getItem("account-owner")]).toEqual([null, null]);
    expect(sessionStorage.getItem("pinned-fencers")).toBe("[]");
  });
});
