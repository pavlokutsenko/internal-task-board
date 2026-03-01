import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr),420px] lg:px-8">
      <section className="hidden rounded-3xl border border-[#cfdeed] bg-white/65 p-10 shadow-[0_28px_90px_-40px_rgba(7,45,75,0.55)] backdrop-blur lg:block">
        <p className="inline-flex rounded-full border border-[#b8d8e7] bg-[#e9f9f8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0a7574]">
          Internal workspace
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#132238]">
          Plan tasks, move faster, keep one clear flow.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4f637a]">
          Modern board for focused execution: quick triage, clean task ownership, and visible progress across
          teams.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#d8e7f4] bg-[#f7fbff] px-4 py-3">
            <p className="text-2xl font-semibold text-[#0a7574]">JWT</p>
            <p className="text-sm text-[#5f6f85]">Short-lived access with refresh cookie</p>
          </div>
          <div className="rounded-2xl border border-[#d8e7f4] bg-[#f7fbff] px-4 py-3">
            <p className="text-2xl font-semibold text-[#2666ab]">dnd-kit</p>
            <p className="text-sm text-[#5f6f85]">Fast drag and drop for columns and tasks</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
