"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { TextField } from "@/components/primitives/text-field";
import { claimAccountStorage } from "@/features/auth/services/account-storage";
import { signup } from "@/features/auth/services/auth-actions";

const MAX_PASSWORD_BYTES = 72;

interface SignupFormProps {
  redirectTo: string;
  loginHref: string;
}

function SignupForm({ redirectTo, loginHref }: SignupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    const password = String(form.get("password"));
    if (password !== form.get("confirmPassword")) {
      setError("Passwords don't match.");
      return;
    }
    // The backend hashes with bcrypt, which caps the password at bytes, not characters.
    if (new Blob([password]).size > MAX_PASSWORD_BYTES) {
      setError(`Password must be at most ${MAX_PASSWORD_BYTES} bytes.`);
      return;
    }

    startTransition(async () => {
      const result = await signup(form);
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
      <div className="flex w-full flex-col gap-5">
        <TextField
          label="First Name"
          name="firstName"
          autoComplete="given-name"
          placeholder="Enter first name"
          required
        />
        <TextField
          label="Last Name"
          name="lastName"
          autoComplete="family-name"
          placeholder="Enter last name"
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter new email"
          required
        />
        <TextField
          label="New Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter new password"
          required
        />
        <TextField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Enter confirmed password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-2.5 min-w-24.5 rounded-lg" disabled={pending}>
        Register
      </Button>
      <p className="text-xs text-obsidian">
        Have an account? Log in{" "}
        <Link href={loginHref} className="text-mint hover:underline">
          here
        </Link>
      </p>
    </form>
  );
}

export { SignupForm };
