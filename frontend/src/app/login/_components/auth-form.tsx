"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { login, logout, signup } from "@/features/auth/services/auth-actions";

type Mode = "login" | "signup";

type AuthFormProps = {
  redirectTo: string;
};

function AuthForm({ redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = mode === "login" ? await login(form) : await signup(form);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(redirectTo);
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SegmentedButton
        type="single"
        value={mode}
        // Radix reports "" when the active item is clicked again; keep the current mode.
        onValueChange={(value) => {
          if (value) {
            setMode(value as Mode);
            setError(null);
          }
        }}
        aria-label="Log in or sign up"
        className="flex"
      >
        <SegmentedButtonItem value="login">Log in</SegmentedButtonItem>
        <SegmentedButtonItem value="signup">Sign up</SegmentedButtonItem>
      </SegmentedButton>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <>
            <label className="flex flex-col gap-2 text-sm">
              First name
              <Input name="firstName" autoComplete="given-name" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Last name
              <Input name="lastName" autoComplete="family-name" required />
            </label>
          </>
        )}
        <label className="flex flex-col gap-2 text-sm">
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Password
          <Input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-2 rounded-full" disabled={pending}>
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      <Button type="button" variant="text" onClick={handleLogout} disabled={pending}>
        Log out
      </Button>
    </div>
  );
}

export { AuthForm };
