import Image from "next/image";
import Link from "next/link";

import { Background } from "@/components/primitives/background";
import { Button } from "@/components/primitives/button";

// Covers both unmatched URLs and notFound() calls, since the app has one root layout.
export default function NotFound() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-mobile flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-5 py-10 font-manrope">
      <Background version={1} />
      <Image src="/brand/logo.svg" alt="Boutline logo" width={127} height={148} />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold text-obsidian">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild className="rounded-full">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
