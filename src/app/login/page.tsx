import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  const { next } = await searchParams;
  if (session) redirect(next ?? "/");

  return (
    <AuthShell
      title="Masuk"
      description="Masuk ke Knowledge Management Platform."
      footer={
        <>
          Belum punya akun?{" "}
          <a href="/register" className="font-medium text-ink underline underline-offset-2">
            Daftar
          </a>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
