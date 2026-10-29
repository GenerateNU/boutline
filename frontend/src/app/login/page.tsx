import { Section } from "@/components/primitives/section";
import { safeRedirectPath } from "@/lib/safe-redirect";

import { AuthForm } from "./_components/auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Account">
        <AuthForm redirectTo={safeRedirectPath(next, "/admin")} />
      </Section>
    </main>
  );
}
