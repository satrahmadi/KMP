"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Archive, ArrowCounterClockwise, Trash, Plus, Star } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  isBase: boolean;
  status: "active" | "archived";
};

type Rate = { id: string; rate: number; effectiveDate: string };

export function CurrencyDetailView({
  companyId,
  currency,
  canEdit,
  canDelete,
  rates,
}: {
  companyId: string;
  currency: Currency;
  canEdit: boolean;
  canDelete: boolean;
  rates: Rate[];
}) {
  const router = useRouter();
  const base = `/api/companies/${companyId}/currencies/${currency.id}`;

  const [name, setName] = useState(currency.name);
  const [symbol, setSymbol] = useState(currency.symbol ?? "");
  const [isBase, setIsBase] = useState(currency.isBase ? "yes" : "no");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty = name.trim() !== currency.name || symbol !== (currency.symbol ?? "") || (isBase === "yes") !== currency.isBase;

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Nama currency wajib diisi.");
    setSaving(true);
    try {
      await apiPatch(base, { name, symbol, isBase: isBase === "yes" });
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
      const nextStatus = currency.status === "active" ? "archived" : "active";
      await apiPatch(base, { status: nextStatus });
      toast.success(nextStatus === "archived" ? "Currency diarsipkan" : "Currency diaktifkan kembali");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setArchiving(false);
    }
  }

  async function deleteCurrency() {
    try {
      await apiDelete(base);
      toast.success("Currency dihapus");
      router.push("/dashboard/currencies");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus currency.");
    }
  }

  const [rateOpen, setRateOpen] = useState(false);
  const [rateValue, setRateValue] = useState("");
  const [rateDate, setRateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSaving, setRateSaving] = useState(false);

  async function addRate() {
    setRateError(null);
    if (!rateValue.trim() || Number.isNaN(Number(rateValue)) || Number(rateValue) <= 0) {
      return setRateError("Rate harus berupa angka lebih besar dari 0.");
    }
    if (!rateDate) return setRateError("Tanggal wajib diisi.");
    setRateSaving(true);
    try {
      await apiPost(`${base}/rates`, { rate: Number(rateValue), effectiveDate: rateDate });
      toast.success("Exchange rate ditambahkan");
      setRateOpen(false);
      setRateValue("");
      router.refresh();
    } catch (err) {
      setRateError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setRateSaving(false);
    }
  }

  return (
    <div className="fade-in">
      <Link href="/dashboard/currencies" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Kembali ke Currencies
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-ink">{currency.code}</h1>
            {currency.isBase ? (
              <Badge tone="neutral">
                <Star size={10} weight="fill" className="mr-1" /> Base
              </Badge>
            ) : null}
            {currency.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">{currency.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit ? (
            <Button variant="secondary" size="sm" loading={archiving} onClick={toggleArchive}>
              {currency.status === "active" ? (
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
              disabled={currency.status !== "archived"}
              title={currency.status !== "archived" ? "Arsipkan currency ini dulu sebelum menghapus" : undefined}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash size={14} /> Hapus
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Detail Currency</CardTitle>
          <CardDescription>Kode currency tidak bisa diubah setelah dibuat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kode</Label>
              <Input value={currency.code} disabled />
            </div>
            <div>
              <Label htmlFor="currency-symbol">Simbol</Label>
              <Input id="currency-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          <div>
            <Label htmlFor="currency-name">Nama</Label>
            <Input id="currency-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="currency-base">Base Currency?</Label>
            <Select id="currency-base" value={isBase} onChange={(e) => setIsBase(e.target.value)} disabled={!canEdit}>
              <option value="no">Tidak</option>
              <option value="yes">Ya</option>
            </Select>
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
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Riwayat Exchange Rate</h2>
        {canEdit && !currency.isBase ? (
          <Button size="sm" variant="secondary" onClick={() => setRateOpen(true)}>
            <Plus size={14} weight="bold" /> Tambah Rate
          </Button>
        ) : null}
      </div>
      <Card className="mt-3">
        {currency.isBase ? (
          <div className="px-6 py-8 text-center text-[13px] text-ink-muted">
            Ini adalah base currency — rate-nya selalu 1.0000 terhadap dirinya sendiri.
          </div>
        ) : rates.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-ink-muted">Belum ada riwayat rate.</div>
        ) : (
          <div className="divide-y divide-border">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-3">
                <span className="text-[13px] text-ink-muted">{new Date(r.effectiveDate).toLocaleDateString("id-ID")}</span>
                <span className="text-[13px] font-medium text-ink">{r.rate}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus ${currency.code}?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan. Seluruh riwayat rate currency ini akan ikut terhapus."
        confirmLabel="Hapus permanen"
        danger
        onConfirm={deleteCurrency}
      />

      <Dialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        title="Tambah Exchange Rate"
        description={`1 ${currency.code} = ? base currency company ini.`}
        widthClassName="max-w-sm"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="rate-value">Rate</Label>
            <Input
              id="rate-value"
              type="number"
              min="0"
              step="any"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="rate-date">Tanggal Berlaku</Label>
            <Input id="rate-date" type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
          </div>
          <FieldError>{rateError ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRateOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={rateSaving} onClick={addRate}>
              Tambah Rate
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
