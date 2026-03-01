"use client";

import { FormEvent, useState } from "react";
import { setAccessToken } from "@/lib/client/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Login failed");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { accessToken: string };

      setAccessToken(payload.accessToken);
      window.location.assign("/board");
      return;
    } catch {
      setError("Unexpected error. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <section className="w-full rounded-3xl border border-[#cfe0ef] bg-white/90 p-7 shadow-[0_28px_80px_-40px_rgba(15,30,70,0.55)] backdrop-blur">
      <p className="inline-flex rounded-full border border-[#b8d8e7] bg-[#e9f9f8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0a7574]">
        Team access
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-[#132238]">Internal Task Board</h1>
      <p className="mt-1 text-sm text-[#5f6f85]">Sign in to continue.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-[#24374f]">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-[#ccdaea] bg-[#fbfdff] px-3 py-2.5 text-[#132238] outline-none ring-[#0f8f8d] focus:ring-2"
            type="email"
            autoComplete="email"
            placeholder="you@company.local"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-[#24374f]">
          Password
          <input
            className="mt-1 w-full rounded-xl border border-[#ccdaea] bg-[#fbfdff] px-3 py-2.5 text-[#132238] outline-none ring-[#0f8f8d] focus:ring-2"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-[#0f8f8d] to-[#2666ab] px-3 py-2.5 font-medium text-white shadow-[0_12px_28px_-16px_rgba(15,143,141,0.85)] hover:translate-y-[-1px]"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
