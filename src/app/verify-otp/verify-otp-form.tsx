"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpPanel } from "@/components/otp-panel";
import { apiPost } from "@/lib/fetch-json";

export function VerifyOtpForm({ email }: { email: string }) {
  const router = useRouter();

  return (
    <OtpPanel
      submitLabel="Verifikasi & masuk"
      onVerify={async (code) => {
        await apiPost("/api/auth/otp/verify", { email, code });
        toast.success("Email terverifikasi");
        router.push("/");
        router.refresh();
      }}
      onResend={() => apiPost("/api/auth/otp/resend", { email, purpose: "registration" })}
    />
  );
}
