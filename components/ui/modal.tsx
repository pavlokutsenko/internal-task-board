"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071428]/50 p-4 backdrop-blur-[3px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#d4e1ee] bg-white/95 p-6 shadow-[0_30px_90px_-36px_rgba(10,34,64,0.85)] backdrop-blur"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3 className="text-lg font-semibold text-[#132238]">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[#5f6f85]">{description}</p> : null}
        </header>

        <div className="mt-4">{children}</div>

        {footer ? <footer className="mt-4 flex flex-wrap justify-end gap-2">{footer}</footer> : null}
      </div>
    </div>
  );
}
