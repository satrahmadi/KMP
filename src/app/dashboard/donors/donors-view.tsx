"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, HandHeart, Archive } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { apiPost, ApiError } from "@/lib/fetch-json";

type DonorCategory = "multilateral" | "bilateral" | "foundation" | "corporate" | "government" | "other";

const CATEGORY_OPTIONS: Array<{ value: DonorCategory; label: string }> = [
  { value: "multilateral", label: "Multilateral" },
  { value: "bilateral", label: "Bilateral" },
  { value: "foundation", label: "Yayasan" },
  { value: "corporate", label: "Korporat" },
  { value: "government", label: "Pemerintah" },
  { value: "other", label: "Lainnya" },
];
export const CATEGORY_LABELS: Record<DonorCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
) as Record<DonorCategory, string>;

type Donor = {
  id: string;
  name: string;
  category: DonorCategory;
  notes: string | null;
  status: "active" | "archived";
  contactCount: number;
  agreementCount: number;
  createdAt: string;
};

export function DonorsView({
  companyId,
  canCreate,
  donors,
}: {
  companyId: string;
  canCreate: boolean;
  donors: Donor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DonorCategory>("other");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createDonor() {
    setError(null);
    if (!name.trim()) return setError("Nama donor wajib diisi.");
    setLoading(true);
    try {
      await apiPost(`/api/companies/${companyId}/donors`, { name, category, notes });
      toast.success("Donor ditambahkan");
      setOpen(false);
      setName("");
      setCategory("other");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Donors</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Lembaga/donor pemberi dana beserta kontak dan agreement-nya.</p>
        </div>
        {canCreate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} weight="bold" />
            Tambah Donor
          </Button>
        ) : null}
      </div>

      {donors.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
              <HandHeart size={20} />
            </div>
            <p className="text-[14px] font-medium text-ink">Belum ada Donor</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {canCreate
                ? "Tambahkan donor seperti USAID, UNICEF, atau ADB untuk mulai mencatat pendanaan."
                : "Admin belum menambahkan Donor apa pun di company ini."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {donors.map((d) => (
            <Link key={d.id} href={`/dashboard/donors/${d.id}`} className="block h-full">
              <Card className="h-full p-4 transition-colors duration-150 hover:border-border-strong hover:bg-surface-muted">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-ink-muted">
                    <HandHeart size={16} />
                  </div>
                  {d.status === "archived" ? (
                    <Badge tone="outline">
                      <Archive size={11} className="mr-1" />
                      Arsip
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] font-medium tracking-wide text-ink-faint">
                  {CATEGORY_LABELS[d.category]}
                </p>
                <p className="truncate text-[14px] font-medium text-ink">{d.name}</p>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {d.contactCount} kontak &middot; {d.agreementCount} agreement
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Tambah Donor" description="Daftarkan lembaga/donor baru di company ini.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="donor-name">Nama Donor</Label>
            <Input id="donor-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="mis. USAID" />
          </div>
          <div>
            <Label htmlFor="donor-category">Kategori</Label>
            <Select id="donor-category" value={category} onChange={(e) => setCategory(e.target.value as DonorCategory)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="donor-notes">Catatan (opsional)</Label>
            <Textarea id="donor-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={loading} onClick={createDonor}>
              Tambah Donor
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
