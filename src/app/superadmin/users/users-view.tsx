"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Prohibit, CheckCircle, Plus, ShieldStar } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPatch, apiPost, ApiError } from "@/lib/fetch-json";
import { showDevOtp } from "@/lib/dev-otp-toast";

type User = {
  id: string;
  name: string;
  email: string;
  status: "unverified" | "active" | "suspended";
  isSuperadmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  companies: Array<{ companyName: string; roleName: string }>;
};
type Company = { id: string; name: string };
type Role = { id: string; name: string; companyId: string | null };

const STATUS_TONE = { active: "success", suspended: "danger", unverified: "warning" } as const;
const STATUS_LABEL = { active: "Aktif", suspended: "Suspended", unverified: "Belum verifikasi" } as const;

export function UsersView({
  currentUserId,
  users,
  companies,
  roles,
}: {
  currentUserId: string;
  users: User[];
  companies: Company[];
  roles: Role[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function toggle(u: User) {
    const nextStatus = u.status === "suspended" ? "active" : "suspended";
    try {
      await apiPatch(`/api/superadmin/users/${u.id}/status`, { status: nextStatus });
      toast.success(nextStatus === "suspended" ? `${u.name} disuspend` : `${u.name} diaktifkan kembali`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    }
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Users</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{users.length} akun terdaftar di platform.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} weight="bold" />
          Buat User
        </Button>
      </div>

      <Card className="mt-6">
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                  {u.name}
                  {u.isSuperadmin ? <ShieldStar size={13} className="text-ink-muted" /> : null}
                </p>
                <p className="truncate text-[12px] text-ink-muted">{u.email}</p>
                {u.companies.length > 0 ? (
                  <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                    {u.companies.map((c) => `${c.companyName} (${c.roleName})`).join(", ")}
                  </p>
                ) : null}
              </div>
              <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
              {u.status !== "unverified" && u.id !== currentUserId ? (
                <Button variant="secondary" size="sm" onClick={() => toggle(u)}>
                  {u.status === "suspended" ? (
                    <>
                      <CheckCircle size={13} /> Aktifkan
                    </>
                  ) : (
                    <>
                      <Prohibit size={13} /> Suspend
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        roles={roles}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  companies,
  roles,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companies: Company[];
  roles: Role[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableRoles = roles.filter((r) => r.companyId === null || r.companyId === companyId);

  async function submit() {
    if (name.trim().length < 2) return setError("Nama minimal 2 karakter.");
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ devCode?: string }>("/api/superadmin/users", {
        name,
        email,
        companyId: companyId || undefined,
        roleId: companyId ? roleId : undefined,
      });
      showDevOtp(res.devCode);
      toast.success("User dibuat. Kode set-password telah dikirim.");
      onOpenChange(false);
      setName("");
      setEmail("");
      setCompanyId("");
      setRoleId("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Buat User" description="Email otomatis terverifikasi, tanpa OTP registrasi.">
      <div className="space-y-4">
        <div>
          <Label htmlFor="su-name">Nama lengkap</Label>
          <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="su-company">Tempatkan ke Company (opsional)</Label>
          <Select id="su-company" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setRoleId(""); }}>
            <option value="">Tidak ditempatkan</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {companyId ? (
          <div>
            <Label htmlFor="su-role">Role di company tsb.</Label>
            <Select id="su-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Pilih role</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <FieldHint>Password awal dikirim lewat kode set-password (OTP) ke email user.</FieldHint>
        <FieldError>{error ?? undefined}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button size="sm" loading={loading} onClick={submit}>
            Buat User
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
