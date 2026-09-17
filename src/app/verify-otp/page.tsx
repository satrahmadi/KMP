import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { VerifyOtpForm } from "./verify-otp-form";

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { email } = await searchParams;
  if (!email) redirect("/register");

  return (
    <AuthShell
      title="Verifikasi email"
      description={`Masukkan kode 6 digit yang dikirim ke ${email}.`}
      footer={
        <a href="/register" className="font-medium text-ink underline underline-offset-2">
          Kembali ke pendaftaran
        </a>
      }
    >
      <VerifyOtpForm email={email} />
    </AuthShell>
  );
}
