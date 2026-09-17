"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) return setError("Masukkan 6 digit kode.");
    if (password !== confirmPassword) return setError("Konfirmasi password tidak cocok.");

    setLoading(true);
    try {
      await apiPost("/api/auth/password/reset", { email, code, password });
      toast.success("Password berhasil direset. Silakan login.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const res = await apiPost<{ devCode?: string }>("/api/auth/password/forgot", { email });
      showDevOtp(res.devCode);
      toast.success("Kode baru terkirim");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Kode OTP</Label>
        <OtpInput value={code} onChange={setCode} disabled={loading} />
      </div>
      <div>
        <Label htmlFor="password">Password baru</Label>
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
        <Label htmlFor="confirmPassword">Konfirmasi password baru</Label>
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
        Reset password
      </Button>
      <div className="text-center text-[13px] text-ink-muted">
        Tidak menerima kode?{" "}
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          className="font-medium text-ink underline underline-offset-2 disabled:no-underline disabled:text-ink-faint cursor-pointer disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : "Kirim ulang"}
        </button>
      </div>
    </form>
  );
}
