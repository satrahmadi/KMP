import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CreateCompanyForm } from "@/components/create-company-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewCompanyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="fade-in mx-auto max-w-md">
      <h1 className="text-[20px] font-semibold tracking-tight text-ink">Buat Company Baru</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        Company baru akan langsung menjadi ruang kerja aktif Anda. Company lama tetap tersimpan dan bisa dipilih
        kembali lewat Company Switcher.
      </p>
      <Card className="mt-6">
        <CardContent>
          <CreateCompanyForm />
        </CardContent>
      </Card>
    </div>
  );
}
