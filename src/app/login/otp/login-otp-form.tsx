"use client";

import { useRouter } from "next/navigation";
import { OtpPanel } from "@/components/otp-panel";
import { apiPost } from "@/lib/fetch-json";

export function LoginOtpForm({ email, next }: { email: string; next?: string }) {
  const router = useRouter();

  return (
    <OtpPanel
      submitLabel="Masuk"
      onVerify={async (code) => {
        await apiPost("/api/auth/login/otp/verify", { email, code });
        router.push(next ?? "/");
        router.refresh();
      }}
      onResend={() => apiPost("/api/auth/otp/resend", { email, purpose: "login_verification" })}
    />
  );
}
