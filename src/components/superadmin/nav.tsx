"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/superadmin/companies", label: "Companies" },
  { href: "/superadmin/users", label: "Users" },
];

export function SuperadminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
            pathname.startsWith(item.href) ? "bg-surface-muted text-ink" : "text-ink-muted hover:text-ink"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
