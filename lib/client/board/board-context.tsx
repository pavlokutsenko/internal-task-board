"use client";

import { createContext, useContext } from "react";
import { useBoard } from "@/lib/client/board/use-board";

type BoardContextValue = ReturnType<typeof useBoard>;

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const board = useBoard();

  return <BoardContext.Provider value={board}>{children}</BoardContext.Provider>;
}

export function useBoardContext() {
  const context = useContext(BoardContext);

  if (!context) {
    throw new Error("useBoardContext must be used inside BoardProvider");
  }

  return context;
}
