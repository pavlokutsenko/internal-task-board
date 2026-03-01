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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-4 p-4 lg:grid-cols-[260px,minmax(0,1fr)] lg:p-6">
        <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Internal Task Board</h1>
            <p className="mt-1 text-sm text-slate-500">Workspace navigation</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Columns</p>
              <p className="text-lg font-semibold text-slate-900">{sortedColumns.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tasks</p>
              <p className="text-lg font-semibold text-slate-900">{tasks.length}</p>
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
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Session</p>
            <p className="mb-3 text-sm text-slate-600">
              Access token is refreshed automatically while you work.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
