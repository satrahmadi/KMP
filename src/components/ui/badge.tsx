import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-ink text-accent-contrast",
  success: "bg-[var(--success-surface)] text-[var(--success-ink)]",
  warning: "bg-surface-muted text-ink border border-border-strong",
  danger: "bg-[var(--danger-surface)] text-danger",
  outline: "bg-transparent text-ink-muted border border-border-strong",
};

export function Badge({
  className,
  tone = "outline",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
