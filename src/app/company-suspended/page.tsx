import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthShell } from "@/components/auth-shell";
import { LogoutButton } from "@/components/logout-button";

export default async function CompanySuspendedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AuthShell title="Company dinonaktifkan" description="Hubungi administrator untuk informasi lebih lanjut.">
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Company tempat Anda tergabung sedang dinonaktifkan oleh Superadmin platform. Semua akses ke data company ini
        dihentikan sementara.
      </p>
      <div className="mt-5">
        <LogoutButton className="w-full" />
      </div>
    </AuthShell>
  );
}
