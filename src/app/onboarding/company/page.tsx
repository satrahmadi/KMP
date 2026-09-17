import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { AuthShell } from "@/components/auth-shell";
import { LogoutButton } from "@/components/logout-button";
import { CreateCompanyForm } from "@/components/create-company-form";

export default async function CreateCompanyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const count = await db.companyMember.count({ where: { userId: session.user.id, status: "active" } });
  if (count > 0) redirect("/dashboard");

  return (
    <AuthShell
      title="Buat Company"
      description={`Masuk sebagai ${session.user.email}. Buat ruang kerja Anda untuk memulai.`}
    >
      <CreateCompanyForm />
      <div className="mt-5 border-t border-border pt-5">
        <LogoutButton className="w-full" />
      </div>
    </AuthShell>
  );
}
