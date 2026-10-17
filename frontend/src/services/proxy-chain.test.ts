/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server";
import { getRedirectUrl } from "next/experimental/testing/server";

import { chainProxySteps, type ProxyStep } from "@/services/proxy-chain";

const request = () => new NextRequest("http://localhost:3000/somewhere");

const setHeader =
  (name: string, value: string): ProxyStep =>
  ({ requestHeaders }) => {
    requestHeaders.set(name, value);
    return undefined;
  };

const redirectTo =
  (path: string): ProxyStep =>
  ({ request }) =>
    NextResponse.redirect(new URL(path, request.url));

describe("chainProxySteps", () => {
  it("forwards the headers every step added", async () => {
    const response = await chainProxySteps(setHeader("x-one", "1"), setHeader("x-two", "2"))(request());

    expect(response.headers.get("x-middleware-request-x-one")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-two")).toBe("2");
  });

  it("stops at the first step that returns a response", async () => {
    const response = await chainProxySteps(
      setHeader("x-before", "1"),
      redirectTo("/first"),
      redirectTo("/second"),
    )(request());

    expect(getRedirectUrl(response)).toBe("http://localhost:3000/first");
  });

  it("waits for an async step before running the next", async () => {
    const asyncStep: ProxyStep = async ({ requestHeaders }) => {
      await Promise.resolve();
      requestHeaders.set("x-async", "done");
      return undefined;
    };
    const readsAsyncHeader: ProxyStep = ({ requestHeaders, request }) =>
      requestHeaders.get("x-async") === "done" ? undefined : NextResponse.redirect(new URL("/too-early", request.url));

    const response = await chainProxySteps(asyncStep, readsAsyncHeader)(request());

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get("x-middleware-request-x-async")).toBe("done");
  });

  it("passes the request through untouched with no steps", async () => {
    const response = await chainProxySteps()(request());

    expect(getRedirectUrl(response)).toBeNull();
  });
});
