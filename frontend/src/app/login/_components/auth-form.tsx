"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";

type Mode = "login" | "signup";

function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // No auth backend yet: any submission goes straight in.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin");
  }

  return (
    <div className="flex flex-col gap-6">
      <SegmentedButton
        type="single"
        value={mode}
        // Radix reports "" when the active item is clicked again; keep the current mode.
        onValueChange={(value) => value && setMode(value as Mode)}
        aria-label="Log in or sign up"
        className="flex"
      >
        <SegmentedButtonItem value="login">Log in</SegmentedButtonItem>
        <SegmentedButtonItem value="signup">Sign up</SegmentedButtonItem>
      </SegmentedButton>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-2 text-sm">
            Name
            <Input name="name" autoComplete="name" />
          </label>
        )}
        <label className="flex flex-col gap-2 text-sm">
          Email
          <Input name="email" type="email" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Password
          <Input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        <Button type="submit" className="mt-2 rounded-full">
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}

export { AuthForm };
