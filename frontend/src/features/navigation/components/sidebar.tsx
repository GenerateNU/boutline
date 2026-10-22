"use client";

import Image from "next/image";
import Link from "next/link";
import { Dialog } from "radix-ui";

function Sidebar() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" aria-label="Open menu" className="shrink-0 cursor-pointer">
          <Image src="/menu.svg" alt="" width={24} height={24} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/40" />
        <Dialog.Content className="fixed inset-y-0 left-0 flex w-56 flex-col items-start gap-4 rounded-r-xl bg-background p-5 font-satoshi font-medium">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <Dialog.Close asChild>
            <button type="button" aria-label="Close menu" className="cursor-pointer">
              <Image src="/close.svg" alt="" width={24} height={24} />
            </button>
          </Dialog.Close>
          <Link href="/login" className="flex items-center gap-2.5">
            <Image
              src="/account-circle.svg"
              alt=""
              width={30}
              height={30}
            />
            Admin Login
          </Link>
          <Image src="/divider.svg" alt="" width={173} height={1} />
          <button type="button" className="cursor-pointer text-left">
            Find Private Tournament
          </button>
          <Dialog.Close asChild>
            <Link href="/tournaments">Search Tournaments</Link>
          </Dialog.Close>
          <p>Settings</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Sidebar };
