"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function ProjectTabs({ projectId, showFinance }: { projectId: string; showFinance: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/dashboard/projects/${projectId}`, label: "Detail" },
    ...(showFinance ? [{ href: `/dashboard/projects/${projectId}/finance`, label: "Source of Fund" }] : []),
  ];

  if (tabs.length <= 1) return null;

  return (
    <div className="mt-4 flex gap-4 border-b border-border">
      {tabs.map((t) => {
        const active = t.href === pathname;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-0.5 py-2 text-[13px] font-medium transition-colors duration-150",
              active ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
