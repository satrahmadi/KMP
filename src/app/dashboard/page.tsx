import { redirect } from "next/navigation";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const active = await db.companyMember.findFirst({
    where: { userId: session.user.id, status: "active", companyId: session.companyId ?? undefined },
    include: { company: true, role: true },
  });

  return (
    <div className="fade-in">
      <h1 className="text-[20px] font-semibold tracking-tight text-ink">{active?.company.name}</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        Anda masuk sebagai <span className="font-medium text-ink">{active?.role.name}</span>.
      </p>

      <Card className="mt-8">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
            <BookOpen size={20} />
          </div>
          <p className="text-[14px] font-medium text-ink">Belum ada konten Knowledge Base</p>
          <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
            Modul Knowledge Base akan tersedia pada fase berikutnya. Gunakan menu Team dan Roles &amp; Permissions di
            sisi kiri untuk menyiapkan tim Anda terlebih dahulu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
