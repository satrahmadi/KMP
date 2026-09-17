"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/fetch-json";

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/companies", { name });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nama Company</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <FieldHint>Anda akan menjadi Admin dari company ini.</FieldHint>
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <Button type="submit" className="w-full" loading={loading}>
        Buat Company
      </Button>
    </form>
  );
}
