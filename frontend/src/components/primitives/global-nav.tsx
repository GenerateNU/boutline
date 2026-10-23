"use client";

import Link from "next/link";
import { CircleUserRound, Menu, X } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { PrivateTournamentDialog } from "@/features/tournament/components/private-tournament-dialog";

function GlobalNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <header className="flex h-12 items-center gap-3 border border-foreground pr-3 pl-2">
          <Dialog.Trigger asChild>
            <Button ref={menuButton} variant="text" size="icon" aria-label="Open menu">
              <Menu className="size-6!" />
            </Button>
          </Dialog.Trigger>
          <p className="flex-1 pr-10 text-center text-xl">Boutline</p>
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => codeOpen && event.preventDefault()}
            className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col gap-4 rounded-r-xl bg-background p-5"
          >
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="text" size="icon" aria-label="Close menu" className="-m-2">
                <X className="size-6!" />
              </Button>
            </Dialog.Close>
            <nav aria-label="Main" className="flex flex-col gap-4">
              <Dialog.Close asChild>
                <Link href="/login" className="flex items-center gap-2.5 border-b border-foreground pb-4">
                  <CircleUserRound className="size-7.5" strokeWidth={1.5} />
                  Admin Login
                </Link>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setCodeOpen(true);
                }}
                className="cursor-pointer text-left"
              >
                Find Private Tournament
              </button>
              <Dialog.Close asChild>
                <Link href="/">Search Tournaments</Link>
              </Dialog.Close>
              {/* No settings page yet, so clicking will yield nothing. */}
              <span>Settings</span>
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <PrivateTournamentDialog
        open={codeOpen}
        onOpenChange={setCodeOpen}
        returnFocusTo={menuButton}
      />
    </>
  );
}

export { GlobalNav };
