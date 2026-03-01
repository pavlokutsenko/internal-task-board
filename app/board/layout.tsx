import { BoardShell } from "@/components/board/board-shell";
import { BoardProvider } from "@/lib/client/board/board-context";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BoardProvider>
      <BoardShell>{children}</BoardShell>
    </BoardProvider>
  );
}
