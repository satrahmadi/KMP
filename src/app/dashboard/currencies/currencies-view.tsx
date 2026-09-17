"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, CurrencyDollar, Star } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { apiPost, ApiError } from "@/lib/fetch-json";

type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  isBase: boolean;
  status: "active" | "archived";
  latestRate: number | null;
  latestRateDate: string | null;
};

export function CurrenciesView({
  companyId,
  canCreate,
  currencies,
}: {
  companyId: string;
  canCreate: boolean;
  currencies: Currency[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [isBase, setIsBase] = useState("no");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasBase = currencies.some((c) => c.isBase);

  async function createCurrency() {
    setError(null);
    if (!code.trim()) return setError("Kode currency wajib diisi.");
    if (!name.trim()) return setError("Nama currency wajib diisi.");
    setLoading(true);
    try {
      await apiPost(`/api/companies/${companyId}/currencies`, { code, name, symbol, isBase: isBase === "yes" });
      toast.success("Currency ditambahkan");
      setOpen(false);
      setCode("");
      setName("");
      setSymbol("");
      setIsBase("no");
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
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Currencies</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Mata uang & riwayat nilai tukar yang dipakai di company ini.</p>
        </div>
        {canCreate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} weight="bold" />
            Tambah Currency
          </Button>
        ) : null}
      </div>

      {currencies.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
              <CurrencyDollar size={20} />
            </div>
            <p className="text-[14px] font-medium text-ink">Belum ada Currency</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {canCreate ? "Tambahkan currency seperti IDR, USD, atau EUR untuk mulai mencatat nilai tukar." : "Admin belum menambahkan Currency apa pun."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mt-6">
          <div className="divide-y divide-border">
            {currencies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/currencies/${c.id}`}
                className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors duration-150 hover:bg-surface-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-ink-muted">
                    <CurrencyDollar size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-ink">{c.code}</p>
                      {c.isBase ? (
                        <Badge tone="neutral">
                          <Star size={10} weight="fill" className="mr-1" /> Base
                        </Badge>
                      ) : null}
                      {c.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
                    </div>
                    <p className="text-[12px] text-ink-muted">{c.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {c.isBase ? (
                    <p className="text-[13px] text-ink-muted">1.0000</p>
                  ) : c.latestRate !== null ? (
                    <p className="text-[13px] font-medium text-ink">{c.latestRate}</p>
                  ) : (
                    <p className="text-[13px] text-ink-faint">Belum ada rate</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Tambah Currency" description="Daftarkan mata uang baru di company ini.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currency-code">Kode</Label>
              <Input
                id="currency-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                maxLength={3}
                placeholder="USD"
              />
            </div>
            <div>
              <Label htmlFor="currency-symbol">Simbol (opsional)</Label>
              <Input id="currency-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="$" />
            </div>
          </div>
          <div>
            <Label htmlFor="currency-name">Nama</Label>
            <Input id="currency-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="US Dollar" />
          </div>
          <div>
            <Label htmlFor="currency-base">Base Currency?</Label>
            <Select id="currency-base" value={isBase} onChange={(e) => setIsBase(e.target.value)}>
              <option value="no">Tidak</option>
              <option value="yes">Ya</option>
            </Select>
            {isBase === "yes" && hasBase ? (
              <FieldHint>Base currency saat ini akan otomatis diganti oleh currency ini.</FieldHint>
            ) : null}
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={loading} onClick={createCurrency}>
              Tambah Currency
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
