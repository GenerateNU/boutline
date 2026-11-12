"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { CircleUserRound, KeyRound, Menu, Search, Settings } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { PrivateTournamentDialog } from "@/features/tournament/components/private-tournament-dialog";

function sidebarItemClassName(selected = false) {
  return cn(
    "relative ml-2.25 flex h-11 cursor-pointer items-center gap-6 rounded-[10px] p-2 text-left text-sm font-semibold text-obsidian [&_svg]:size-6",
    "before:absolute before:-left-2.25 before:h-8 before:w-0.75 before:rounded-full",
    selected ? "bg-blue-lighter text-blue before:bg-accent-green" : "hover:bg-blue-lighter/60",
  );
}

function GlobalNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const onTournaments = pathname.startsWith("/tournaments");

  return (
    <>
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <header className="relative flex h-10 items-center overflow-hidden bg-obsidian">
          <Image
            src="/brand/nav-plate.svg"
            alt=""
            width={297}
            height={57}
            className="absolute top-1/2 left-0 -translate-y-1/2"
          />
          <Image
            src="/brand/nav-blade.svg"
            alt=""
            width={28}
            height={55}
            className="absolute top-1/2 left-69.75 -translate-y-1/2"
          />
          {/* Stays above the open drawer (and the body's modal pointer-events: none) so it also closes it. */}
          <Dialog.Trigger asChild>
            <Button
              ref={menuButton}
              variant="text"
              size="icon"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="pointer-events-auto relative z-60 ml-2.5 text-white hover:bg-background/10 [&_svg]:size-6"
            >
              <Menu />
            </Button>
          </Dialog.Trigger>
          <Link href="/" className="relative ml-2.5 flex items-center gap-2.5">
            <Image src="/brand/logo-mark.svg" alt="" width={21} height={24} />
            <span className="font-wordmark text-[17px] tracking-[1.02px] text-white">
              BOUTLINE
            </span>
          </Link>
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40 motion-safe:data-open:animate-fade-in motion-safe:data-closed:animate-fade-out" />
          {/* Radix keeps the drawer mounted until its closing animation ends, so it slides back out too. */}
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => codeOpen && event.preventDefault()}
            // Otherwise pressing the hamburger dismisses the drawer as an outside click and its click reopens it.
            onPointerDownOutside={(event) => {
              if (menuButton.current?.contains(event.target as Node)) {
                event.preventDefault();
              }
            }}
            className="fixed inset-y-0 left-0 z-50 flex w-73 flex-col justify-between bg-fencing-white pb-10 font-manrope shadow-lg motion-safe:data-open:animate-drawer-in motion-safe:data-closed:animate-drawer-out"
          >
            <div className="flex flex-col gap-6">
              {/* The pinned hamburger covers the first 50px of the drawer's first 40px row. */}
              <div className="h-18.5 bg-obsidian pl-15">
                <div className="flex h-10 items-center gap-3">
                  <Image src="/brand/logo-mark-sidebar.svg" alt="" width={27} height={31} />
                  <Dialog.Title className="font-wordmark text-2xl tracking-[1.44px] text-white">
                    BOUTLINE
                  </Dialog.Title>
                </div>
              </div>
              <nav aria-label="Main" className="flex flex-col gap-3 px-6">
                <Dialog.Close asChild>
                  <Link
                    href="/login"
                    aria-current={pathname === "/login" ? "page" : undefined}
                    className={sidebarItemClassName(pathname === "/login")}
                  >
                    <CircleUserRound aria-hidden />
                    Admin Login
                  </Link>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <Link
                    href="/tournaments"
                    aria-current={pathname === "/tournaments" ? "page" : undefined}
                    className={sidebarItemClassName(onTournaments)}
                  >
                    <Search aria-hidden />
                    Search Tournaments
                  </Link>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setCodeOpen(true);
                  }}
                  className={sidebarItemClassName()}
                >
                  <KeyRound aria-hidden />
                  Find Private Tournament
                </button>
              </nav>
            </div>
            <p className="flex h-11 items-center gap-6 px-6 text-sm font-medium text-obsidian">
              <Settings aria-hidden className="size-6" />
              Settings
            </p>
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
