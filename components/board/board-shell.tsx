"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBoardContext } from "@/lib/client/board/board-context";

const navItems = [
  { href: "/board", label: "Board", description: "Kanban and drag/drop" },
  { href: "/board/tasks", label: "Tasks", description: "Create and manage tasks" },
  { href: "/board/columns", label: "Columns", description: "Create and reorder columns" },
  { href: "/board/history", label: "History", description: "Task change history" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/board") {
    return pathname === "/board";
  }

  return pathname.startsWith(href);
}

export function BoardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, sortedColumns, tasks } = useBoardContext();

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1450px] gap-4 p-4 lg:grid-cols-[280px,minmax(0,1fr)] lg:p-6">
        <aside className="flex h-full flex-col rounded-3xl border border-[#2e4864] bg-gradient-to-b from-[#132238] to-[#0d1b2d] p-5 text-slate-100 shadow-[0_26px_80px_-45px_rgba(8,25,51,0.92)] lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
          <div>
            <p className="inline-flex rounded-full border border-[#3f5f82] bg-[#1a324f] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8bc7de]">
              Workspace
            </p>
            <h1 className="mt-3 text-xl font-semibold text-white">Internal Task Board</h1>
            <p className="mt-1 text-sm text-[#9fb4ce]">Workspace navigation</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#375679] bg-[#1a324f] px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-[#8fb0cc]">Columns</p>
              <p className="text-xl font-semibold text-white">{sortedColumns.length}</p>
            </div>
            <div className="rounded-xl border border-[#375679] bg-[#1a324f] px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-[#8fb0cc]">Tasks</p>
              <p className="text-xl font-semibold text-white">{tasks.length}</p>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl border px-3 py-3 transition ${
                    active
                      ? "border-[#59bcc0] bg-gradient-to-r from-[#0f8f8d] to-[#1f6ba6] text-white shadow-[0_12px_28px_-14px_rgba(15,143,141,0.75)]"
                      : "border-[#355475] text-[#d6e5f5] hover:border-[#4a6b8f] hover:bg-[#182d47]"
                  }`}
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={`text-xs ${active ? "text-[#d8efff]" : "text-[#8fb0cc]"}`}>{item.description}</p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#375679] pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-[#8fb0cc]">Session</p>
            <p className="mb-3 text-sm text-[#bad0e5]">
              Access token is refreshed automatically while you work.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-[#4a6b8f] bg-[#152a42] px-3 py-2.5 text-sm font-medium text-[#e2eefb] hover:bg-[#1c3653]"
          >
            Logout
          </button>
        </aside>

        <section className="min-w-0 rounded-3xl border border-[#d4e1ee] bg-white/88 p-4 shadow-[0_26px_80px_-48px_rgba(12,43,79,0.72)] backdrop-blur lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
