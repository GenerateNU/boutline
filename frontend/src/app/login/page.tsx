import { redirect } from "next/navigation";

import { AuthScreen } from "@/features/auth/components/auth-screen";
import { getSessionToken } from "@/features/auth/services/session";
import { safeRedirectPath } from "@/lib/safe-redirect";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next, "/admin/tournaments");

  if (await getSessionToken()) {
    redirect(redirectTo);
  }

  return (
    <AuthScreen title="Admin Login" background={7}>
      <LoginForm
        redirectTo={redirectTo}
        signupHref={next ? `/signup?next=${encodeURIComponent(redirectTo)}` : "/signup"}
      />
    </AuthScreen>
  );
}
