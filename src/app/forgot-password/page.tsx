import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <AuthShell
      title="Lupa password"
      description="Masukkan email Anda, kami akan mengirimkan kode reset."
      footer={
        <a href="/login" className="font-medium text-ink underline underline-offset-2">
          Kembali ke login
        </a>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
