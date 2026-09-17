import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";
import { SuperadminNav } from "@/components/superadmin/nav";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isSuperadmin) redirect("/dashboard");

  const hasCompany = (await db.companyMember.count({ where: { userId: session.user.id, status: "active" } })) > 0;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[11px] font-semibold text-accent-contrast">
                KM
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-ink">Superadmin Console</span>
            </div>
            <SuperadminNav />
          </div>
          <div className="flex items-center gap-2">
            {hasCompany ? (
              <Link href="/dashboard" className="text-[13px] font-medium text-ink-muted hover:text-ink">
                Ke Company Dashboard
              </Link>
            ) : null}
            <LogoutButton size="sm" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}
