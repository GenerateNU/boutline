"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { TextField } from "@/components/primitives/text-field";
import { signup } from "@/features/auth/services/auth-actions";

const MAX_PASSWORD_BYTES = 72;
const passwordRequirements = [
  "At least 1 character",
  `At most ${MAX_PASSWORD_BYTES} bytes (accented and non-Latin characters take 2 to 4)`,
];

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
      router.push(redirectTo);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <TextField label="First name" name="firstName" autoComplete="given-name" required />
        <TextField label="Last name" name="lastName" autoComplete="family-name" required />
        <TextField
          label="New Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <TextField
          label="New Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <div className="flex flex-col gap-2">
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <div className="px-3 text-sm">
            <p>Password Requirements:</p>
            <ul className="list-disc pl-6">
              {passwordRequirements.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="mx-auto rounded-none px-8" disabled={pending}>
          Register Account
        </Button>
      </form>
      <p className="text-center">
        Have an account?{" "}
        <Link href={loginHref} className="underline">
          Login here
        </Link>
      </p>
    </>
  );
}

export { SignupForm };
