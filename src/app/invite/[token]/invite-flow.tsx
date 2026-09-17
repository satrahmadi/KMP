"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { OtpPanel } from "@/components/otp-panel";
import { apiFetch, apiPost, ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

type InvitationInfo = {
  status: "pending" | "accepted" | "expired" | "revoked";
  companyName: string;
  roleName: string;
  email: string;
  hasAccount: boolean;
};
type Me = { user: { id: string; email: string } };

type Step = "loading" | "invalid" | "signup" | "otp" | "login-required" | "wrong-account" | "accepting" | "done";

export function InviteFlow({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [invRes, meRes] = await Promise.all([
          apiFetch<InvitationInfo>(`/api/invitations/${token}`),
          apiFetch<Me>("/api/me").catch(() => null),
        ]);
        if (cancelled) return;
        setInfo(invRes);
        setMe(meRes);

        if (invRes.status !== "pending") {
          setStep("invalid");
        } else if (meRes) {
          if (meRes.user.email === invRes.email) {
            setStep("accepting");
          } else {
            setStep("wrong-account");
          }
        } else if (invRes.hasAccount) {
          setStep("login-required");
        } else {
          setStep("signup");
        }
      } catch {
        if (!cancelled) setStep("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (step !== "accepting") return;
    (async () => {
      try {
        await apiPost(`/api/invitations/${token}/accept`);
        setStep("done");
        toast.success("Berhasil bergabung");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 900);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Gagal menerima undangan.");
        setStep("invalid");
      }
    })();
  }, [step, token, router]);

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ devCode?: string }>(`/api/invitations/${token}/start`, { name, password });
      showDevOtp(res.devCode);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "loading") {
    return <p className="text-center text-[13px] text-ink-muted">Memuat undangan...</p>;
  }

  if (step === "invalid") {
    return (
      <div className="flex flex-col items-center text-center">
        <XCircle size={28} className="mb-3 text-ink-faint" />
        <p className="text-[13px] text-ink-muted">
          {error ?? "Undangan ini sudah tidak berlaku (kedaluwarsa, dibatalkan, atau sudah digunakan)."}
        </p>
        <a href="/kmp/login" className="mt-4 text-[13px] font-medium text-ink underline underline-offset-2">
          Ke halaman login
        </a>
      </div>
    );
  }

  if (step === "accepting") {
    return <p className="text-center text-[13px] text-ink-muted">Menyelesaikan undangan...</p>;
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle size={28} className="mb-3 text-ink" />
        <p className="text-[13px] text-ink-muted">Anda bergabung ke {info?.companyName}. Mengarahkan...</p>
      </div>
    );
  }

  if (step === "wrong-account") {
    return (
      <div className="text-center">
        <p className="text-[13px] text-ink-muted">
          Undangan ini ditujukan untuk <span className="font-medium text-ink">{info?.email}</span>, sedangkan Anda
          masuk sebagai <span className="font-medium text-ink">{me?.user.email}</span>.
        </p>
        <Button
          className="mt-4 w-full"
          variant="secondary"
          onClick={async () => {
            await apiPost("/api/auth/logout");
            router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
          }}
        >
          Keluar &amp; login sebagai {info?.email}
        </Button>
      </div>
    );
  }

  if (step === "login-required") {
    return (
      <div className="text-center">
        <p className="text-[13px] text-ink-muted">
          Anda diundang ke <span className="font-medium text-ink">{info?.companyName}</span> sebagai{" "}
          <span className="font-medium text-ink">{info?.roleName}</span>. Akun untuk {info?.email} sudah terdaftar —
          silakan login untuk bergabung.
        </p>
        <a href={`/kmp/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
          <Button className="mt-4 w-full">Login untuk bergabung</Button>
        </a>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <>
        <p className="mb-4 text-center text-[13px] text-ink-muted">
          Masukkan kode 6 digit yang dikirim ke {info?.email}.
        </p>
        <OtpPanel
          submitLabel="Verifikasi & bergabung"
          onVerify={async (code) => {
            await apiFetch(`/api/invitations/${token}/verify`, { method: "POST", body: JSON.stringify({ code }) });
            toast.success(`Berhasil bergabung ke ${info?.companyName}`);
            router.push("/dashboard");
            router.refresh();
          }}
          onResend={() => apiPost(`/api/invitations/${token}/start`, { name, password })}
        />
      </>
    );
  }

  // step === "signup"
  return (
    <>
      <p className="mb-4 text-center text-[13px] text-ink-muted">
        Anda diundang ke <span className="font-medium text-ink">{info?.companyName}</span> sebagai{" "}
        <span className="font-medium text-ink">{info?.roleName}</span>. Lengkapi data untuk membuat akun{" "}
        {info?.email}.
      </p>
      <form onSubmit={submitSignup} className="space-y-4">
        <div>
          <Label htmlFor="invite-name">Nama lengkap</Label>
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="invite-password">Password</Label>
          <Input
            id="invite-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <FieldError>{error ?? undefined}</FieldError>
        <Button type="submit" className="w-full" loading={loading}>
          Lanjutkan
        </Button>
      </form>
    </>
  );
}
