"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { expireSession } from "@/features/auth/services/session-expiry";
import { AuthUser } from "@/features/auth/types/auth";
import { apiRequest, onUnauthorized } from "@/services/api-request";

// Signs the user out when their session dies, whether mid-request or while the tab sat idle.
export function SessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const unregister = onUnauthorized(() => {
      void expireSession((href) => router.replace(href));
    });

    // Focus and visibilitychange often fire together; one check is enough.
    let checking = false;
    async function checkSession() {
      if (checking) {
        return;
      }
      checking = true;
      try {
        await apiRequest<AuthUser>("/auth/me");
      } catch {
        // A 401 already reached the handler inside apiRequest; any other failure is not a logout.
      } finally {
        checking = false;
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }

    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      unregister();
    };
  }, [router]);

  return null;
}
