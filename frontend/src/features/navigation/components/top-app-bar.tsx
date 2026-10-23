import Image from "next/image";
import Link from "next/link";

import { Sidebar } from "@/features/navigation/components/sidebar";

function TopAppBar({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="flex items-center gap-3 border-b border-brand py-3 pr-3 pl-4 font-satoshi">
      <Sidebar />
      <p className="flex-1 text-center text-xl leading-6 font-medium text-brand">
        Boutline
      </p>
      {signedIn ? (
        <Link
          href="/admin"
          aria-label="Admin"
          className="shrink-0 rounded-2xl border border-brand p-1"
        >
          <Image src="/person.svg" alt="" width={24} height={24} />
        </Link>
      ) : (
        <span className="size-6 shrink-0" />
      )}
    </header>
  );
}

export { TopAppBar };
