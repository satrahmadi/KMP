"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:pt-[12vh]">
      <div
        className="fixed inset-0 bg-black/30 fade-in"
        style={{ animationDuration: "150ms" }}
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative z-10 w-full rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.08)] fade-in",
          widthClassName ?? "max-w-md"
        )}
        style={{ animationDuration: "180ms" }}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="dialog-title" className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-[var(--radius-sm)] p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
            aria-label="Tutup"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
