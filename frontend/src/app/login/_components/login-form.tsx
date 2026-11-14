"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { TextField } from "@/components/primitives/text-field";
import { claimAccountStorage } from "@/features/auth/services/account-storage";
import { login } from "@/features/auth/services/auth-actions";

interface LoginFormProps {
  redirectTo: string;
  signupHref: string;
}

function LoginForm({ redirectTo, signupHref }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      claimAccountStorage(result.user.id);
      router.push(redirectTo);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-5">
      <div className="flex w-full flex-col gap-7.5">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-5 min-w-24.5 rounded-lg" disabled={pending}>
        Sign in
      </Button>
      <p className="text-xs text-obsidian">
        Don&apos;t have an account? Register{" "}
        <Link href={signupHref} className="text-mint hover:underline">
          here
        </Link>
      </p>
    </form>
  );
}

export { LoginForm };
