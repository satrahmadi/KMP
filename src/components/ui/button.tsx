import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-accent-contrast hover:bg-[var(--accent-hover)] disabled:bg-ink-faint",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-muted disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-surface-muted disabled:opacity-50",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-all duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
