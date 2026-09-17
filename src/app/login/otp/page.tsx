import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { LoginOtpForm } from "./login-otp-form";

export default async function LoginOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const session = await getSession();
  const { email, next } = await searchParams;
  if (session) redirect(next ?? "/");
  if (!email) redirect("/login");

  return (
    <AuthShell
      title="Verifikasi login"
      description={`Masukkan kode 6 digit yang dikirim ke ${email}.`}
      footer={
        <a href="/kmp/login" className="font-medium text-ink underline underline-offset-2">
          Kembali ke login
        </a>
      }
    >
      <LoginOtpForm email={email} next={next} />
    </AuthShell>
  );
}
