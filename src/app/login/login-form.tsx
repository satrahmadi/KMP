"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ email: string; devCode?: string }>("/api/auth/login", { email, password });
      showDevOtp(res.devCode);
      toast.success("Kode verifikasi terkirim");
      router.push(`/login/otp?email=${encodeURIComponent(res.email)}${nextParam}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.payload?.code === "unverified") {
          showDevOtp(err.payload.devCode as string | undefined);
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(err.message);
      } else {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <a href="/forgot-password" className="text-[13px] font-medium text-ink-muted hover:text-ink">
            Lupa password?
          </a>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      <Button type="submit" className="w-full" loading={loading}>
        Lanjutkan
      </Button>
    </form>
  );
}
