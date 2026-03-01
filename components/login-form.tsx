"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/client/auth";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("alex@company.local");
  const [password, setPassword] = useState("Password123!");
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
      router.push("/board");
      router.refresh();
    } catch {
      setError("Unexpected error. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Internal Task Board</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in with one of the seeded users.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-brand-500 transition focus:ring-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-brand-500 transition focus:ring-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          className="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white transition hover:bg-brand-700"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-md bg-slate-100 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Seeded accounts</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>alex@company.local / Password123!</li>
          <li>maria@company.local / Password123!</li>
          <li>jordan@company.local / Password123!</li>
        </ul>
      </div>
    </section>
  );
}
