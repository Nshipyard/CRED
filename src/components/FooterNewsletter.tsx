"use client";

import { useState } from "react";

// Posts from the visitor's browser to Dispatch's public subscribe endpoint,
// which always uses double opt-in. The publication id is public by design
// (it ships in the embed snippet), so it is hardcoded here.
const PUBLICATION_ID = "cmv8ixfin0000rg7e896tea0p";
const SUBSCRIBE_URL = "https://dispatch.nshipyard.com/api/subscribe";

export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationId: PUBLICATION_ID, email }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mb-8 border-b hairline pb-8">
      <p className="font-display text-xl tracking-tight text-[#0a0f1e]">
        Get CRED in your inbox
      </p>
      <p className="mt-1 text-sm text-gray-600">
        New data series, explainers, and platform updates.
      </p>
      {state === "done" ? (
        <p className="mt-4 text-sm font-medium text-[#0a0f1e]">
          You are on the list. Check your inbox to confirm your subscription.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mt-4 flex max-w-md flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="footer-newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="footer-newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full flex-1 rounded-full border hairline bg-white px-5 py-2.5 text-sm text-[#0a0f1e] placeholder:text-gray-400 focus:border-[#d80621] focus:outline-none"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="rounded-full bg-[#d80621] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#b0051b] disabled:opacity-60"
          >
            {state === "sending" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
      {state === "error" && (
        <p className="mt-2 text-sm text-red-700">
          Something went wrong. Try again in a moment.
        </p>
      )}
    </div>
  );
}
