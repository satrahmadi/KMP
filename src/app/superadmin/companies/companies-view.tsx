"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Prohibit, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiPatch, ApiError } from "@/lib/fetch-json";

type Company = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  memberCount: number;
  createdByName: string;
  createdAt: string;
};

export function CompaniesView({ companies }: { companies: Company[] }) {
  const router = useRouter();

  async function toggle(c: Company) {
    const nextStatus = c.status === "active" ? "suspended" : "active";
    try {
      await apiPatch(`/api/superadmin/companies/${c.id}/status`, { status: nextStatus });
      toast.success(nextStatus === "suspended" ? `${c.name} dinonaktifkan` : `${c.name} diaktifkan kembali`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    }
  }

  return (
    <div className="fade-in">
      <h1 className="text-[20px] font-semibold tracking-tight text-ink">Companies</h1>
      <p className="mt-1 text-[13px] text-ink-muted">{companies.length} company terdaftar di platform.</p>

      <Card className="mt-6">
        <div className="divide-y divide-border">
          {companies.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{c.name}</p>
                <p className="truncate text-[12px] text-ink-muted">
                  /{c.slug} &middot; {c.memberCount} anggota &middot; dibuat oleh {c.createdByName}
                </p>
              </div>
              <Badge tone={c.status === "active" ? "success" : "danger"}>
                {c.status === "active" ? "Aktif" : "Nonaktif"}
              </Badge>
              <Button variant="secondary" size="sm" onClick={() => toggle(c)}>
                {c.status === "active" ? (
                  <>
                    <Prohibit size={13} /> Suspend
                  </>
                ) : (
                  <>
                    <CheckCircle size={13} /> Aktifkan
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
