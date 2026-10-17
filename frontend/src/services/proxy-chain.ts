import { NextResponse, type NextRequest } from "next/server";

// requestHeaders is shared by every step, so one step's additions (an auth
// header, a trace ID) are all forwarded together once the chain finishes.
export type ProxyContext = {
  request: NextRequest;
  requestHeaders: Headers;
};

// A step returns a response to end the chain (a redirect, a rewrite, an
// error) or nothing to hand the request to the next step.
export type ProxyStep = (
  context: ProxyContext,
) => NextResponse | undefined | Promise<NextResponse | undefined>;

export function chainProxySteps(...steps: ProxyStep[]) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context: ProxyContext = { request, requestHeaders: new Headers(request.headers) };

    for (const step of steps) {
      const response = await step(context);
      if (response) {
        return response;
      }
    }

    return NextResponse.next({ request: { headers: context.requestHeaders } });
  };
}
