import { AuthScreen } from "@/features/auth/components/auth-screen";
import { safeRedirectPath } from "@/lib/safe-redirect";

import { SignupForm } from "./_components/signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next, "/admin");

  return (
    <AuthScreen title="Create Admin Account">
      <SignupForm
        redirectTo={redirectTo}
        loginHref={next ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login"}
      />
    </AuthScreen>
  );
}
