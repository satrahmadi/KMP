import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5 border-b border-border", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[15px] font-semibold text-ink tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[13px] text-ink-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}
