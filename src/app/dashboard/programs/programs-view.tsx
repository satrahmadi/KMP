"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Bookmarks, PencilSimple, Trash, Archive, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";
import { cn } from "@/lib/cn";

type ProgramCategory = "education" | "health" | "economic_development" | "governance" | "environment" | "humanitarian" | "other";

const CATEGORY_OPTIONS: Array<{ value: ProgramCategory; label: string }> = [
  { value: "education", label: "Pendidikan" },
  { value: "health", label: "Kesehatan" },
  { value: "economic_development", label: "Pengembangan Ekonomi" },
  { value: "governance", label: "Tata Kelola" },
  { value: "environment", label: "Lingkungan" },
  { value: "humanitarian", label: "Kemanusiaan" },
  { value: "other", label: "Lainnya" },
];
const CATEGORY_LABELS: Record<ProgramCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
) as Record<ProgramCategory, string>;

type Program = {
  id: string;
  code: string;
  name: string;
  category: ProgramCategory;
  type: string | null;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
};

type FormState = { name: string; category: ProgramCategory; type: string; description: string };
const EMPTY_FORM: FormState = { name: "", category: "education", type: "", description: "" };

export function ProgramsView({
  companyId,
  canCreate,
  canEdit,
  canDelete,
  programs,
}: {
  companyId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  programs: Program[];
}) {
  const router = useRouter();
  const base = `/api/companies/${companyId}/programs`;
  const [filter, setFilter] = useState<ProgramCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? programs : programs.filter((p) => p.category === filter)),
    [programs, filter]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: Program) {
    setEditing(p);
    setForm({ name: p.name, category: p.category, type: p.type ?? "", description: p.description ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  async function submit() {
    setError(null);
    if (!form.name.trim()) return setError("Nama program wajib diisi.");
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`${base}/${editing.id}`, { name: form.name, type: form.type, description: form.description });
        toast.success("Program diperbarui");
      } else {
        await apiPost(base, form);
        toast.success("Program dibuat");
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(p: Program) {
    try {
      const nextStatus = p.status === "active" ? "archived" : "active";
      await apiPatch(`${base}/${p.id}`, { status: nextStatus });
      toast.success(nextStatus === "archived" ? "Program diarsipkan" : "Program diaktifkan kembali");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    }
  }

  async function deleteProgram() {
    if (!deleteTarget) return;
    try {
      await apiDelete(`${base}/${deleteTarget.id}`);
      toast.success("Program dihapus");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus program.");
    }
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Programs</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Program Code untuk mengelompokkan Project berdasarkan area kerja.</p>
        </div>
        {canCreate ? (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} weight="bold" />
            Buat Program
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["all", ...CATEGORY_OPTIONS.map((c) => c.value)] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 cursor-pointer",
              filter === value ? "bg-ink text-accent-contrast" : "bg-surface-muted text-ink-muted hover:text-ink"
            )}
          >
            {value === "all" ? "Semua" : CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
              <Bookmarks size={20} />
            </div>
            <p className="text-[14px] font-medium text-ink">Belum ada Program</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {canCreate ? "Buat Program pertama untuk mengelompokkan Project berdasarkan area kerja." : "Admin belum membuat Program apa pun."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mt-4">
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-start gap-4 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{p.code}</Badge>
                    <span className="text-[12px] text-ink-faint">{CATEGORY_LABELS[p.category]}</span>
                    {p.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-ink">
                    {p.name}
                    {p.type ? <span className="font-normal text-ink-muted"> — {p.type}</span> : null}
                  </p>
                  {p.description ? <p className="mt-0.5 text-[13px] text-ink-muted">{p.description}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {canEdit ? (
                    <button
                      onClick={() => toggleArchive(p)}
                      title={p.status === "active" ? "Arsipkan" : "Aktifkan"}
                      className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
                    >
                      {p.status === "active" ? <Archive size={14} /> : <ArrowCounterClockwise size={14} />}
                    </button>
                  ) : null}
                  {canEdit ? (
                    <button
                      onClick={() => openEdit(p)}
                      title="Edit"
                      className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
                    >
                      <PencilSimple size={14} />
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      onClick={() => setDeleteTarget(p)}
                      title={p.status !== "archived" ? "Arsipkan program ini dulu sebelum menghapus" : "Hapus"}
                      disabled={p.status !== "archived"}
                      className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer disabled:pointer-events-none disabled:opacity-40"
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
        title={editing ? "Edit Program" : "Buat Program"}
        description={editing ? undefined : "Kode program (mis. EDU-2026-001) dibuat otomatis berdasarkan kategori & tahun."}
        widthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="program-name">Nama Program</Label>
            <Input id="program-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="program-category">Kategori</Label>
              <Select
                id="program-category"
                value={form.category}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProgramCategory }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="program-type">Tipe (opsional)</Label>
              <Input
                id="program-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="mis. Beasiswa"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="program-description">Deskripsi (opsional)</Label>
            <Textarea
              id="program-description"
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
              {editing ? "Simpan perubahan" : "Buat Program"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Hapus "${deleteTarget?.name}"?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        onConfirm={deleteProgram}
      />
    </div>
  );
}
