import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { requireCompanyContext, can } from "@/lib/rbac";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.companyId) redirect("/dashboard");

  const company = await requireCompanyContext(session.user.id, session.companyId);
  if (!can(company, "company_settings.view")) redirect("/dashboard");

  return (
    <SettingsView
      companyId={company.companyId}
      name={company.companyName}
      canEdit={can(company, "company_settings.edit")}
    />
  );
}
