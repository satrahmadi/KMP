import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-[var(--radius-md)] border border-border-strong bg-surface pl-3 pr-8 text-sm text-ink transition-colors duration-150",
          "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
          "disabled:bg-surface-muted disabled:text-ink-faint",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
    </div>
  )
);
Select.displayName = "Select";
