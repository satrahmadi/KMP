"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ email: string; devCode?: string }>("/api/auth/register", {
        name,
        email,
        password,
        confirmPassword,
      });
      showDevOtp(res.devCode);
      toast.success("Kode verifikasi terkirim", { description: `Cek email ${res.email}.` });
      router.push(`/verify-otp?email=${encodeURIComponent(res.email)}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nama lengkap</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Konfirmasi password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <Button type="submit" className="w-full" loading={loading}>
        Daftar
      </Button>
    </form>
  );
}
