"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

export function OtpPanel({
  onVerify,
  onResend,
  submitLabel = "Verifikasi",
}: {
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<{ devCode?: string } | void>;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const res = await onResend();
      showDevOtp(res?.devCode);
      toast.success("Kode baru terkirim");
      setCooldown(60);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (typeof err.payload?.secondsLeft === "number") setCooldown(err.payload.secondsLeft as number);
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex justify-center">
        <OtpInput value={code} onChange={setCode} disabled={loading} />
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <Button type="submit" className="w-full" loading={loading} disabled={code.length !== 6}>
        {submitLabel}
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
