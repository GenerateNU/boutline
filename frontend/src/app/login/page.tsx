import { Section } from "@/components/primitives/section";

import { AuthForm } from "./_components/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Account">
        <AuthForm />
      </Section>
    </main>
  );
}
