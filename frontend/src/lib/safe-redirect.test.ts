import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    { name: "a same-site path", next: "/admin/tournament/new?step=2", want: "/admin/tournament/new?step=2" },
    { name: "the site root", next: "/", want: "/" },
    { name: "a missing value", next: undefined, want: "/fallback" },
    { name: "a repeated query param", next: ["/a", "/b"], want: "/fallback" },
    { name: "an absolute URL", next: "https://evil.example/", want: "/fallback" },
    { name: "a protocol-relative URL", next: "//evil.example", want: "/fallback" },
    { name: "a backslash URL browsers treat as protocol-relative", next: "/\\evil.example", want: "/fallback" },
    { name: "a relative path", next: "admin", want: "/fallback" },
  ])("$name → $want", ({ next, want }) => {
    expect(safeRedirectPath(next, "/fallback")).toBe(want);
  });
});
