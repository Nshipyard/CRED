"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// phc_ is a write-only client key: safe in client bundles.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "phc_qmd8mJUvrWiV4n6VE86v6mny5ze2GsoxGPJ3wcVPF3Lj";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __nshipyard_ph?: boolean };
    if (w.__nshipyard_ph) return;
    w.__nshipyard_ph = true;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: "history_change",
      autocapture: true,
      disable_session_recording: false,
      person_profiles: "always",
    });
  }, []);
  return <>{children}</>;
}
