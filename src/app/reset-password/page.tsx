import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { email } = await searchParams;
  if (!email) redirect("/forgot-password");

  return (
    <AuthShell title="Reset password" description={`Masukkan kode yang dikirim ke ${email} dan password baru.`}>
      <ResetPasswordForm email={email} />
    </AuthShell>
  );
}
