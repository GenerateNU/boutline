import { AuthScreen } from "@/features/auth/components/auth-screen";
import { safeRedirectPath } from "@/lib/safe-redirect";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next, "/admin");

  return (
    <AuthScreen title="Admin Account Login">
      <LoginForm
        redirectTo={redirectTo}
        signupHref={next ? `/signup?next=${encodeURIComponent(redirectTo)}` : "/signup"}
      />
    </AuthScreen>
  );
}
