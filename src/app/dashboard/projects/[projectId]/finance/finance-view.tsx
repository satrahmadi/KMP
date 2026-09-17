"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Wallet,
  PencilSimple,
  Trash,
  LinkSimple,
  FileText,
  HandCoins,
  NotePencil,
  Receipt,
  DotsThreeOutline,
  CaretLeft,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";
import { cn } from "@/lib/cn";
import { ProjectTabs } from "../project-tabs";

type RecordType = "proposal" | "grant" | "funding_note" | "invoice" | "other";

type FinanceRecord = {
  id: string;
  type: RecordType;
  title: string;
  donorId: string | null;
  donorName: string | null;
  amount: number | null;
  currency: string;
  recordDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  description: string | null;
  referenceUrl: string | null;
  status: "active" | "archived";
  createdAt: string;
};

type Donor = { id: string; name: string };

const TYPE_META: Record<RecordType, { label: string; icon: typeof FileText; blurb: string }> = {
  proposal: { label: "Pengajuan", icon: FileText, blurb: "Dokumen pengajuan pendanaan ke donor/lembaga" },
  grant: { label: "Hibah", icon: HandCoins, blurb: "Dana hibah yang diterima dari donor" },
  funding_note: { label: "Catatan Pendanaan", icon: NotePencil, blurb: "Catatan pendanaan umum lainnya" },
  invoice: { label: "Invoice", icon: Receipt, blurb: "Invoice masuk maupun keluar terkait Project" },
  other: { label: "Lainnya", icon: DotsThreeOutline, blurb: "Catatan finansial di luar kategori lain" },
};
const TYPE_ORDER: RecordType[] = ["proposal", "grant", "funding_note", "invoice", "other"];

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return null;
  const formatted = new Intl.NumberFormat("id-ID").format(amount);
  return currency === "IDR" ? `Rp ${formatted}` : `${currency} ${formatted}`;
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("id-ID") : null;
}

type FormState = {
  title: string;
  donorId: string;
  amount: string;
  currency: string;
  recordDate: string;
  periodStart: string;
  periodEnd: string;
  invoiceNumber: string;
  dueDate: string;
  description: string;
  referenceUrl: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  donorId: "",
  amount: "",
  currency: "IDR",
  recordDate: "",
  periodStart: "",
  periodEnd: "",
  invoiceNumber: "",
  dueDate: "",
  description: "",
  referenceUrl: "",
};

export function FinanceView({
  companyId,
  project,
  canCreate,
  canEdit,
  canDelete,
  donors,
  records,
}: {
  companyId: string;
  project: { id: string; code: string; name: string; status: "active" | "archived" };
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  donors: Donor[];
  records: FinanceRecord[];
}) {
  const router = useRouter();
  const base = `/api/companies/${companyId}/projects/${project.id}/finance-records`;

  const [filter, setFilter] = useState<RecordType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "form">("form");
  const [activeType, setActiveType] = useState<RecordType | null>(null);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceRecord | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? records : records.filter((r) => r.type === filter)),
    [records, filter]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    if (filter === "all") {
      setStep("choose");
      setActiveType(null);
    } else {
      setStep("form");
      setActiveType(filter);
    }
    setDialogOpen(true);
  }

  function pickType(type: RecordType) {
    setActiveType(type);
    setForm(type === "invoice" ? { ...EMPTY_FORM, currency: "IDR" } : EMPTY_FORM);
    setStep("form");
  }

  function openEdit(record: FinanceRecord) {
    setEditing(record);
    setActiveType(record.type);
    setForm({
      title: record.title,
      donorId: record.donorId ?? "",
      amount: record.amount !== null ? String(record.amount) : "",
      currency: record.currency,
      recordDate: record.recordDate ? record.recordDate.slice(0, 10) : "",
      periodStart: record.periodStart ? record.periodStart.slice(0, 10) : "",
      periodEnd: record.periodEnd ? record.periodEnd.slice(0, 10) : "",
      invoiceNumber: record.invoiceNumber ?? "",
      dueDate: record.dueDate ? record.dueDate.slice(0, 10) : "",
      description: record.description ?? "",
      referenceUrl: record.referenceUrl ?? "",
    });
    setError(null);
    setStep("form");
    setDialogOpen(true);
  }

  async function submit() {
    if (!activeType) return;
    setError(null);
    if (!form.title.trim()) return setError("Judul wajib diisi.");
    if (form.amount.trim() && Number.isNaN(Number(form.amount))) return setError("Nominal harus berupa angka.");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        amount: form.amount.trim() ? Number(form.amount) : null,
        currency: form.currency,
        description: form.description,
        referenceUrl: form.referenceUrl,
      };
      if (activeType === "proposal") {
        payload.donorId = form.donorId;
        payload.recordDate = form.recordDate;
      } else if (activeType === "grant") {
        payload.donorId = form.donorId;
        payload.recordDate = form.recordDate;
        payload.periodStart = form.periodStart;
        payload.periodEnd = form.periodEnd;
      } else if (activeType === "invoice") {
        payload.invoiceNumber = form.invoiceNumber;
        payload.recordDate = form.recordDate;
        payload.dueDate = form.dueDate;
      } else {
        payload.recordDate = form.recordDate;
      }

      if (editing) {
        await apiPatch(`${base}/${editing.id}`, payload);
        toast.success("Catatan diperbarui");
      } else {
        await apiPost(base, { ...payload, type: activeType });
        toast.success("Catatan ditambahkan");
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!deleteTarget) return;
    try {
      await apiDelete(`${base}/${deleteTarget.id}`);
      toast.success("Catatan dihapus");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus catatan.");
    }
  }

  const addLabel = filter !== "all" ? `Tambah ${TYPE_META[filter].label}` : "Tambah Catatan";

  return (
    <div className="fade-in">
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Kembali ke {project.name}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-faint">{project.code}</p>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Source of Fund</h1>
        </div>
        {canCreate ? (
          <Button
            size="sm"
            onClick={openCreate}
            disabled={project.status === "archived"}
            title={project.status === "archived" ? "Project sudah diarsipkan" : undefined}
          >
            <Plus size={14} weight="bold" />
            {addLabel}
          </Button>
        ) : null}
      </div>

      <ProjectTabs projectId={project.id} showFinance />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["all", ...TYPE_ORDER] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 cursor-pointer",
              filter === value ? "bg-ink text-accent-contrast" : "bg-surface-muted text-ink-muted hover:text-ink"
            )}
          >
            {value === "all" ? "Semua" : TYPE_META[value].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
              <Wallet size={20} />
            </div>
            <p className="text-[14px] font-medium text-ink">Belum ada catatan</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {canCreate
                ? "Catat pengajuan, hibah, invoice, atau catatan pendanaan lain untuk Project ini."
                : "Belum ada catatan Source of Fund untuk Project ini."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mt-4">
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-start gap-4 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{TYPE_META[r.type].label}</Badge>
                    {r.type === "invoice" && r.invoiceNumber ? (
                      <span className="text-[12px] text-ink-faint">No. {r.invoiceNumber}</span>
                    ) : null}
                    {(r.type === "proposal" || r.type === "grant") && r.donorName ? (
                      <span className="text-[12px] text-ink-faint">{r.donorName}</span>
                    ) : null}
                    {fmtDate(r.recordDate) ? <span className="text-[12px] text-ink-faint">{fmtDate(r.recordDate)}</span> : null}
                    {r.type === "grant" && (r.periodStart || r.periodEnd) ? (
                      <span className="text-[12px] text-ink-faint">
                        Periode {fmtDate(r.periodStart) ?? "?"} – {fmtDate(r.periodEnd) ?? "berlangsung"}
                      </span>
                    ) : null}
                    {r.type === "invoice" && fmtDate(r.dueDate) ? (
                      <span className="text-[12px] text-ink-faint">Jatuh tempo {fmtDate(r.dueDate)}</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-ink">{r.title}</p>
                  {r.description ? <p className="mt-0.5 text-[13px] text-ink-muted">{r.description}</p> : null}
                  {r.referenceUrl ? (
                    <a
                      href={r.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink"
                    >
                      <LinkSimple size={12} /> {r.referenceUrl}
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {formatAmount(r.amount, r.currency) ? (
                    <span className="text-[13px] font-medium text-ink">{formatAmount(r.amount, r.currency)}</span>
                  ) : null}
                  {canEdit ? (
                    <button
                      onClick={() => openEdit(r)}
                      title="Edit"
                      className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
                    >
                      <PencilSimple size={14} />
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      onClick={() => setDeleteTarget(r)}
                      title="Hapus"
                      className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer"
                    >
                      <Trash size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          step === "choose"
            ? "Tambah Catatan"
            : `${editing ? "Edit" : "Tambah"} ${activeType ? TYPE_META[activeType].label : ""}`
        }
        description={step === "choose" ? "Pilih jenis catatan yang mau ditambahkan." : undefined}
        widthClassName="max-w-lg"
      >
        {step === "choose" ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TYPE_ORDER.map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  onClick={() => pickType(t)}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border-strong p-3 text-left transition-colors duration-150 hover:border-ink hover:bg-surface-muted cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-ink-muted">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{TYPE_META[t].label}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{TYPE_META[t].blurb}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {!editing && filter === "all" ? (
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-ink cursor-pointer"
              >
                <CaretLeft size={11} /> Ganti tipe
              </button>
            ) : null}

            <div>
              <Label htmlFor="fin-title">
                {activeType === "invoice" ? "Judul / Keterangan Invoice" : activeType === "grant" ? "Nama Hibah" : "Judul"}
              </Label>
              <Input id="fin-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
            </div>

            {(activeType === "proposal" || activeType === "grant") && (
              <div>
                <Label htmlFor="fin-donor">{activeType === "proposal" ? "Diajukan ke Donor (opsional)" : "Donor Pemberi (opsional)"}</Label>
                <Select id="fin-donor" value={form.donorId} onChange={(e) => setForm((f) => ({ ...f, donorId: e.target.value }))}>
                  <option value="">— Tidak dikaitkan —</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {activeType === "invoice" && (
              <div>
                <Label htmlFor="fin-invoice-number">Nomor Invoice (opsional)</Label>
                <Input
                  id="fin-invoice-number"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fin-date">
                  {activeType === "proposal"
                    ? "Tanggal Pengajuan"
                    : activeType === "grant"
                      ? "Tanggal Cair"
                      : activeType === "invoice"
                        ? "Tanggal Invoice"
                        : "Tanggal"}{" "}
                  (opsional)
                </Label>
                <Input id="fin-date" type="date" value={form.recordDate} onChange={(e) => setForm((f) => ({ ...f, recordDate: e.target.value }))} />
              </div>
              {activeType === "invoice" ? (
                <div>
                  <Label htmlFor="fin-due-date">Jatuh Tempo (opsional)</Label>
                  <Input id="fin-due-date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              ) : (
                <div>
                  <Label htmlFor="fin-currency">Mata Uang</Label>
                  <Input
                    id="fin-currency"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  />
                </div>
              )}
            </div>

            {activeType === "grant" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fin-period-start">Periode Mulai (opsional)</Label>
                  <Input
                    id="fin-period-start"
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fin-period-end">Periode Berakhir (opsional)</Label>
                  <Input
                    id="fin-period-end"
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="fin-amount">
                  {activeType === "proposal" ? "Nominal Diajukan" : activeType === "invoice" ? "Nominal Invoice" : "Nominal"} (opsional)
                </Label>
                <Input
                  id="fin-amount"
                  type="number"
                  min="0"
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              {activeType === "invoice" ? (
                <div>
                  <Label htmlFor="fin-currency-2">Mata Uang</Label>
                  <Input
                    id="fin-currency-2"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <Label htmlFor="fin-reference">Link Referensi (opsional)</Label>
              <Input
                id="fin-reference"
                placeholder="https://..."
                value={form.referenceUrl}
                onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="fin-description">Deskripsi (opsional)</Label>
              <Textarea
                id="fin-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <FieldError>{error ?? undefined}</FieldError>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button size="sm" loading={saving} onClick={submit}>
                {editing ? "Simpan perubahan" : "Tambah Catatan"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Hapus "${deleteTarget?.title}"?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        onConfirm={deleteRecord}
      />
    </div>
  );
}
