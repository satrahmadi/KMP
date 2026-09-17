"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiPatch, ApiError } from "@/lib/fetch-json";

export function SettingsView({ companyId, name, canEdit }: { companyId: string; name: string; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setError(null);
    setLoading(true);
    try {
      await apiPatch(`/api/companies/${companyId}`, { name: value });
      toast.success("Pengaturan disimpan");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <h1 className="text-[20px] font-semibold tracking-tight text-ink">Company Settings</h1>
      <p className="mt-1 text-[13px] text-ink-muted">Kelola informasi dasar company ini.</p>

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Company</CardTitle>
          <CardDescription>Nama ini tampil di seluruh sisi produk dan Company Switcher.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="company-name">Nama Company</Label>
          <Input id="company-name" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} />
          <FieldError>{error ?? undefined}</FieldError>
          {canEdit ? (
            <Button className="mt-4" size="sm" loading={loading} onClick={save} disabled={value.trim() === name}>
              Simpan perubahan
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
