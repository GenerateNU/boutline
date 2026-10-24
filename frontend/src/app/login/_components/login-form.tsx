"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { TextField } from "@/components/primitives/text-field";
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
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(redirectTo);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <div className="flex flex-col gap-2">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {/* TODO: Change this to an actual link once password reset is implemented. */}
          <span className="px-3 text-sm">Forgot Password?</span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mx-auto w-40 rounded-none" disabled={pending}>
          Sign in
        </Button>
      </form>
      <p className="text-center">
        New admin?{" "}
        <Link href={signupHref} className="underline">
          Sign up here
        </Link>
      </p>
    </>
  );
}

export { LoginForm };
