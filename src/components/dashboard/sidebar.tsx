"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  FolderSimple,
  Users,
  ShieldCheck,
  GearSix,
  ShieldStar,
  List,
  X,
  HandHeart,
  CurrencyDollar,
  Bookmarks,
} from "@phosphor-icons/react/dist/ssr";
import { CompanySwitcher, type Membership } from "@/components/dashboard/company-switcher";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" }>;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: SquaresFour },
  { href: "/dashboard/projects", label: "Projects", icon: FolderSimple, permission: "project.view" },
  { href: "/dashboard/donors", label: "Donors", icon: HandHeart, permission: "donor.view" },
  { href: "/dashboard/currencies", label: "Currencies", icon: CurrencyDollar, permission: "currency.view" },
  { href: "/dashboard/programs", label: "Programs", icon: Bookmarks, permission: "program.view" },
  { href: "/dashboard/team", label: "Team", icon: Users, permission: "team_management.view_members" },
  { href: "/dashboard/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "roles.view" },
  { href: "/dashboard/settings", label: "Company Settings", icon: GearSix, permission: "company_settings.view" },
];

type SidebarProps = {
  user: { name: string; email: string; isSuperadmin: boolean };
  activeCompanyId: string;
  memberships: Membership[];
  permissions: string[];
};

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[11px] font-semibold text-accent-contrast">
            KM
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-ink">KMP Console</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-[var(--radius-sm)] p-1.5 text-ink-muted hover:bg-surface hover:text-ink cursor-pointer"
          aria-label="Buka menu"
        >
          <List size={18} />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fade-in relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-surface-muted" style={{ animationDuration: "160ms" }}>
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-[var(--radius-sm)] p-1.5 text-ink-muted hover:bg-surface hover:text-ink cursor-pointer"
                aria-label="Tutup menu"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface-muted lg:flex">
        <div className="flex items-center gap-2 px-5 pt-6 pb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[11px] font-semibold text-accent-contrast">
            KM
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-ink">KMP Console</span>
        </div>
        <SidebarContent {...props} />
      </aside>
    </>
  );
}

function SidebarContent({
  user,
  activeCompanyId,
  memberships,
  permissions,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const permSet = new Set(permissions);

  return (
    <>
      <div className="px-3">
        <CompanySwitcher activeCompanyId={activeCompanyId} memberships={memberships} />
      </div>

      <nav className="stagger mt-2 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.filter((item) => !item.permission || permSet.has(item.permission)).map((item) => {
          const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                active ? "bg-ink text-accent-contrast" : "text-ink-muted hover:bg-surface hover:text-ink"
              )}
            >
              <Icon size={15} weight={active ? "bold" : "regular"} />
              {item.label}
            </Link>
          );
        })}

        {user.isSuperadmin ? (
          <Link
            href="/superadmin"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
          >
            <ShieldStar size={15} />
            Superadmin Console
          </Link>
        ) : null}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="mb-3 px-1">
          <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
          <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
        </div>
        <LogoutButton className="w-full" size="sm" />
      </div>
    </>
  );
}
