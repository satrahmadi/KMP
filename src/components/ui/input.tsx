import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[var(--radius-md)] border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
        "disabled:bg-surface-muted disabled:text-ink-faint",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[13px] font-medium text-ink mb-1.5 block", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[13px] text-danger">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[13px] text-ink-muted">{children}</p>;
}
