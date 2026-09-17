import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <AuthShell
      title="Buat akun"
      description="Daftar untuk mulai menggunakan Knowledge Management Platform."
      footer={
        <>
          Sudah punya akun?{" "}
          <a href="/kmp/login" className="font-medium text-ink underline underline-offset-2">
            Masuk
          </a>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
