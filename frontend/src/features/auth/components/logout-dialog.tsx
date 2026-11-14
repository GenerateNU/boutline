"use client";

import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { ModalClose } from "@/components/primitives/modal";
import { logout } from "@/features/auth/services/auth-actions";

function LogoutDialog() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    setError(null);
    startTransition(async () => {
      try {
        await logout();
      } catch {
        setError("Couldn't log out. Try again in a moment.");
        return;
      }
      router.push("/login");
    });
  }

  return (
    <Dialog.Root onOpenChange={() => setError(null)}>
      <Dialog.Trigger asChild>
        <Button
          variant="text"
          size="icon"
          aria-label="Account"
          className="relative mr-2 ml-auto text-white hover:bg-background/10 [&_svg]:size-6"
        >
          <AccountCircleOutlined />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40" />
        <Dialog.Content className="fixed inset-x-2 top-1/2 z-50 mx-auto flex max-w-87.5 -translate-y-1/2 flex-col gap-4 rounded-[20px] bg-background p-5 font-manrope shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-obsidian">Log out?</Dialog.Title>
            <ModalClose />
          </div>
          <Dialog.Description className="text-sm text-neutral-secondary">
            You will need to sign in again to manage your tournaments.
          </Dialog.Description>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2.5">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1 rounded-lg">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleLogout}
              disabled={pending}
              className="flex-1 rounded-lg bg-red hover:bg-red-dark"
            >
              Yes, log out
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { LogoutDialog };
