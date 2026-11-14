import Link from "next/link";

import { Background } from "@/components/primitives/background";
import { Button } from "@/components/primitives/button";

import { OngoingEventsCard } from "./ongoing-events-card";

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden bg-blue-dark text-white">
      <Background version={3} />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-accent-green uppercase">Live fencing results</p>
          <h1 className="font-wordmark text-4xl leading-10">
            <span className="block">Every bout.</span>
            <span className="block">Every score.</span>
            <span className="block">Live.</span>
          </h1>
          <p className="text-sm">
            Follow pools, brackets, and results from anywhere in the venue. Scores update bout by
            bout, right on your phone.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="border border-blue-light">
            <Link href="/tournaments">Find a tournament</Link>
          </Button>
          <Button asChild variant="tonal">
            <Link href="/admin">Run your tournament</Link>
          </Button>
        </div>
        <OngoingEventsCard />
      </div>
    </section>
  );
}
