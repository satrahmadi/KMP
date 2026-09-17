"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Archive, ArrowCounterClockwise, Trash, Plus, PencilSimple, LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";
import { CATEGORY_LABELS } from "../donors-view";

type DonorCategory = "multilateral" | "bilateral" | "foundation" | "corporate" | "government" | "other";
const CATEGORY_OPTIONS: DonorCategory[] = ["multilateral", "bilateral", "foundation", "corporate", "government", "other"];

type Donor = {
  id: string;
  name: string;
  category: DonorCategory;
  notes: string | null;
  status: "active" | "archived";
};

type Contact = { id: string; name: string; email: string | null; phone: string | null; position: string | null };

type Agreement = {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  referenceUrl: string | null;
  description: string | null;
  status: "active" | "archived";
};

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) return null;
  const formatted = new Intl.NumberFormat("id-ID").format(amount);
  return currency === "IDR" ? `Rp ${formatted}` : `${currency} ${formatted}`;
}

export function DonorDetailView({
  companyId,
  donor,
  canEdit,
  canDelete,
  contacts,
  agreements,
}: {
  companyId: string;
  donor: Donor;
  canEdit: boolean;
  canDelete: boolean;
  contacts: Contact[];
  agreements: Agreement[];
}) {
  const router = useRouter();
  const base = `/api/companies/${companyId}/donors/${donor.id}`;

  const [name, setName] = useState(donor.name);
  const [category, setCategory] = useState<DonorCategory>(donor.category);
  const [notes, setNotes] = useState(donor.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty = name.trim() !== donor.name || category !== donor.category || notes !== (donor.notes ?? "");

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Nama donor wajib diisi.");
    setSaving(true);
    try {
      await apiPatch(base, { name, category, notes });
      toast.success("Perubahan disimpan");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    setArchiving(true);
    try {
      const nextStatus = donor.status === "active" ? "archived" : "active";
      await apiPatch(base, { status: nextStatus });
      toast.success(nextStatus === "archived" ? "Donor diarsipkan" : "Donor diaktifkan kembali");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setArchiving(false);
    }
  }

  async function deleteDonor() {
    try {
      await apiDelete(base);
      toast.success("Donor dihapus");
      router.push("/dashboard/donors");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus donor.");
    }
  }

  // --- Contact ---
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", position: "" });
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactDeleteTarget, setContactDeleteTarget] = useState<Contact | null>(null);

  async function addContact() {
    setContactError(null);
    if (!contactForm.name.trim()) return setContactError("Nama kontak wajib diisi.");
    setContactSaving(true);
    try {
      await apiPost(`${base}/contacts`, contactForm);
      toast.success("Kontak ditambahkan");
      setContactOpen(false);
      setContactForm({ name: "", email: "", phone: "", position: "" });
      router.refresh();
    } catch (err) {
      setContactError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setContactSaving(false);
    }
  }

  async function deleteContact() {
    if (!contactDeleteTarget) return;
    try {
      await apiDelete(`${base}/contacts/${contactDeleteTarget.id}`);
      toast.success("Kontak dihapus");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus kontak.");
    }
  }

  // --- Agreement ---
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [agreementForm, setAgreementForm] = useState({
    title: "",
    amount: "",
    currency: "IDR",
    startDate: "",
    endDate: "",
    referenceUrl: "",
    description: "",
  });
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [agreementSaving, setAgreementSaving] = useState(false);
  const [agreementDeleteTarget, setAgreementDeleteTarget] = useState<Agreement | null>(null);

  function openCreateAgreement() {
    setEditingAgreement(null);
    setAgreementForm({ title: "", amount: "", currency: "IDR", startDate: "", endDate: "", referenceUrl: "", description: "" });
    setAgreementError(null);
    setAgreementOpen(true);
  }

  function openEditAgreement(a: Agreement) {
    setEditingAgreement(a);
    setAgreementForm({
      title: a.title,
      amount: a.amount !== null ? String(a.amount) : "",
      currency: a.currency,
      startDate: a.startDate ? a.startDate.slice(0, 10) : "",
      endDate: a.endDate ? a.endDate.slice(0, 10) : "",
      referenceUrl: a.referenceUrl ?? "",
      description: a.description ?? "",
    });
    setAgreementError(null);
    setAgreementOpen(true);
  }

  async function submitAgreement() {
    setAgreementError(null);
    if (!agreementForm.title.trim()) return setAgreementError("Judul wajib diisi.");
    if (agreementForm.amount.trim() && Number.isNaN(Number(agreementForm.amount))) {
      return setAgreementError("Nominal harus berupa angka.");
    }
    setAgreementSaving(true);
    try {
      const payload = {
        title: agreementForm.title,
        amount: agreementForm.amount.trim() ? Number(agreementForm.amount) : null,
        currency: agreementForm.currency,
        startDate: agreementForm.startDate,
        endDate: agreementForm.endDate,
        referenceUrl: agreementForm.referenceUrl,
        description: agreementForm.description,
      };
      if (editingAgreement) {
        await apiPatch(`${base}/agreements/${editingAgreement.id}`, payload);
        toast.success("Agreement diperbarui");
      } else {
        await apiPost(`${base}/agreements`, payload);
        toast.success("Agreement ditambahkan");
      }
      setAgreementOpen(false);
      router.refresh();
    } catch (err) {
      setAgreementError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setAgreementSaving(false);
    }
  }

  async function deleteAgreement() {
    if (!agreementDeleteTarget) return;
    try {
      await apiDelete(`${base}/agreements/${agreementDeleteTarget.id}`);
      toast.success("Agreement dihapus");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus agreement.");
    }
  }

  return (
    <div className="fade-in">
      <Link href="/dashboard/donors" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Kembali ke Donors
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-faint">{CATEGORY_LABELS[donor.category]}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-ink">{donor.name}</h1>
            {donor.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit ? (
            <Button variant="secondary" size="sm" loading={archiving} onClick={toggleArchive}>
              {donor.status === "active" ? (
                <>
                  <Archive size={14} /> Arsipkan
                </>
              ) : (
                <>
                  <ArrowCounterClockwise size={14} /> Aktifkan
                </>
              )}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="danger"
              size="sm"
              disabled={donor.status !== "archived"}
              title={donor.status !== "archived" ? "Arsipkan donor ini dulu sebelum menghapus" : undefined}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash size={14} /> Hapus
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Detail Donor</CardTitle>
          <CardDescription>Informasi dasar lembaga/donor ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="donor-name">Nama Donor</Label>
            <Input id="donor-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="donor-category">Kategori</Label>
            <Select
              id="donor-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DonorCategory)}
              disabled={!canEdit}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="donor-notes">Catatan</Label>
            <Textarea id="donor-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          {canEdit ? (
            <Button size="sm" loading={saving} disabled={!dirty} onClick={save}>
              Simpan perubahan
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-start justify-between gap-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Kontak</h2>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={() => setContactOpen(true)}>
            <Plus size={14} weight="bold" /> Tambah Kontak
          </Button>
        ) : null}
      </div>
      <Card className="mt-3">
        {contacts.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-ink-muted">Belum ada kontak.</div>
        ) : (
          <div className="divide-y divide-border">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {c.name} {c.position ? <span className="font-normal text-ink-muted">— {c.position}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    onClick={() => setContactDeleteTarget(c)}
                    title="Hapus"
                    className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer"
                  >
                    <Trash size={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-start justify-between gap-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Agreement</h2>
        {canEdit ? (
          <Button size="sm" variant="secondary" onClick={openCreateAgreement}>
            <Plus size={14} weight="bold" /> Tambah Agreement
          </Button>
        ) : null}
      </div>
      <Card className="mt-3">
        {agreements.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-ink-muted">Belum ada agreement.</div>
        ) : (
          <div className="divide-y divide-border">
            {agreements.map((a) => (
              <div key={a.id} className="flex items-start gap-4 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
                    {a.startDate || a.endDate ? (
                      <span className="text-[12px] text-ink-faint">
                        {a.startDate ? new Date(a.startDate).toLocaleDateString("id-ID") : "?"} —{" "}
                        {a.endDate ? new Date(a.endDate).toLocaleDateString("id-ID") : "berlangsung"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-ink">{a.title}</p>
                  {a.description ? <p className="mt-0.5 text-[13px] text-ink-muted">{a.description}</p> : null}
                  {a.referenceUrl ? (
                    <a
                      href={a.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink"
                    >
                      <LinkSimple size={12} /> {a.referenceUrl}
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {formatAmount(a.amount, a.currency) ? (
                    <span className="text-[13px] font-medium text-ink">{formatAmount(a.amount, a.currency)}</span>
                  ) : null}
                  {canEdit ? (
                    <>
                      <button
                        onClick={() => openEditAgreement(a)}
                        title="Edit"
                        className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => setAgreementDeleteTarget(a)}
                        title="Hapus"
                        className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer"
                      >
                        <Trash size={14} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus ${donor.name}?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan. Kontak dan Agreement donor ini akan ikut terhapus."
        confirmLabel="Hapus permanen"
        danger
        onConfirm={deleteDonor}
      />

      <Dialog open={contactOpen} onOpenChange={setContactOpen} title="Tambah Kontak" widthClassName="max-w-md">
        <div className="space-y-4">
          <div>
            <Label htmlFor="contact-name">Nama</Label>
            <Input
              id="contact-name"
              value={contactForm.name}
              onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="contact-email">Email (opsional)</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Telepon (opsional)</Label>
              <Input
                id="contact-phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contact-position">Jabatan (opsional)</Label>
            <Input
              id="contact-position"
              value={contactForm.position}
              onChange={(e) => setContactForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>
          <FieldError>{contactError ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setContactOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={contactSaving} onClick={addContact}>
              Tambah Kontak
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!contactDeleteTarget}
        onOpenChange={(o) => !o && setContactDeleteTarget(null)}
        title={`Hapus kontak "${contactDeleteTarget?.name}"?`}
        confirmLabel="Hapus"
        danger
        onConfirm={deleteContact}
      />

      <Dialog
        open={agreementOpen}
        onOpenChange={setAgreementOpen}
        title={editingAgreement ? "Edit Agreement" : "Tambah Agreement"}
        widthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="agreement-title">Judul</Label>
            <Input
              id="agreement-title"
              value={agreementForm.title}
              onChange={(e) => setAgreementForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
              placeholder="mis. Grant Agreement Tahap 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="agreement-start">Mulai (opsional)</Label>
              <Input
                id="agreement-start"
                type="date"
                value={agreementForm.startDate}
                onChange={(e) => setAgreementForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="agreement-end">Berakhir (opsional)</Label>
              <Input
                id="agreement-end"
                type="date"
                value={agreementForm.endDate}
                onChange={(e) => setAgreementForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="agreement-amount">Nominal (opsional)</Label>
              <Input
                id="agreement-amount"
                type="number"
                min="0"
                step="any"
                value={agreementForm.amount}
                onChange={(e) => setAgreementForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="agreement-currency">Mata Uang</Label>
              <Input
                id="agreement-currency"
                value={agreementForm.currency}
                onChange={(e) => setAgreementForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="agreement-reference">Link Referensi (opsional)</Label>
            <Input
              id="agreement-reference"
              placeholder="https://..."
              value={agreementForm.referenceUrl}
              onChange={(e) => setAgreementForm((f) => ({ ...f, referenceUrl: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="agreement-description">Deskripsi (opsional)</Label>
            <Textarea
              id="agreement-description"
              rows={3}
              value={agreementForm.description}
              onChange={(e) => setAgreementForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <FieldError>{agreementError ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAgreementOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={agreementSaving} onClick={submitAgreement}>
              {editingAgreement ? "Simpan perubahan" : "Tambah Agreement"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!agreementDeleteTarget}
        onOpenChange={(o) => !o && setAgreementDeleteTarget(null)}
        title={`Hapus "${agreementDeleteTarget?.title}"?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        onConfirm={deleteAgreement}
      />
    </div>
  );
}
