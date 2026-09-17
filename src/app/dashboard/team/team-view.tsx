"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ArrowClockwise, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";

type Role = { id: string; name: string; type: "system" | "custom" };
type Member = {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  roleType: "system" | "custom";
  joinedAt: string;
};
type Invitation = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  invitedByName: string;
  expiresAt: string;
  createdAt: string;
};

const STATUS_TONE: Record<Invitation["status"], "warning" | "success" | "outline" | "danger"> = {
  pending: "warning",
  accepted: "success",
  expired: "outline",
  revoked: "danger",
};
const STATUS_LABEL: Record<Invitation["status"], string> = {
  pending: "Pending",
  accepted: "Diterima",
  expired: "Kedaluwarsa",
  revoked: "Dibatalkan",
};

export function TeamView({
  companyId,
  currentUserId,
  canInvite,
  canRemove,
  canManageRoles,
  adminCount,
  roles,
  members,
  invitations,
}: {
  companyId: string;
  currentUserId: string;
  canInvite: boolean;
  canRemove: boolean;
  canManageRoles: boolean;
  adminCount: number;
  roles: Role[];
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const memberRoleId = roles.find((r) => r.type === "system" && r.name === "Member")?.id ?? roles[0]?.id ?? "";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRows, setInviteRows] = useState([{ email: "", roleId: memberRoleId }]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  function isLastAdmin(m: { roleType: string; roleName: string }) {
    return m.roleType === "system" && m.roleName === "Admin" && adminCount <= 1;
  }

  async function submitInvite() {
    setInviteError(null);
    const clean = inviteRows.filter((r) => r.email.trim());
    if (clean.length === 0) return setInviteError("Masukkan minimal satu email.");
    setInviteLoading(true);
    try {
      const res = await apiPost<{ results: Array<{ email: string; ok: boolean; message?: string }> }>(
        `/api/companies/${companyId}/invitations`,
        { invites: clean }
      );
      const failed = res.results.filter((r) => !r.ok);
      const ok = res.results.filter((r) => r.ok);
      if (ok.length) toast.success(`${ok.length} undangan terkirim`);
      if (failed.length) {
        failed.forEach((f) => toast.error(`${f.email}: ${f.message}`));
      }
      if (!failed.length) {
        setInviteOpen(false);
        setInviteRows([{ email: "", roleId: memberRoleId }]);
      }
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function changeRole(userId: string, roleId: string) {
    try {
      await apiPatch(`/api/companies/${companyId}/members/${userId}`, { roleId });
      toast.success("Role diperbarui");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengubah role.");
    }
  }

  async function removeMember(userId: string) {
    await apiDelete(`/api/companies/${companyId}/members/${userId}`);
    toast.success("Anggota dihapus");
    router.refresh();
  }

  async function resendInvite(id: string) {
    try {
      await apiPost(`/api/companies/${companyId}/invitations/${id}/resend`);
      toast.success("Undangan dikirim ulang");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengirim ulang.");
    }
  }

  async function cancelInvite(id: string) {
    try {
      await apiDelete(`/api/companies/${companyId}/invitations/${id}`);
      toast.success("Undangan dibatalkan");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal membatalkan.");
    }
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const otherInvitations = invitations.filter((i) => i.status !== "pending");

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Team</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Kelola anggota dan undangan company ini.</p>
        </div>
        {canInvite ? (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus size={14} weight="bold" />
            Undang anggota
          </Button>
        ) : null}
      </div>

      <Card className="mt-6">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[13px] font-semibold text-ink">Anggota aktif ({members.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[12px] font-medium text-ink-muted">
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">
                  {m.name} {m.userId === currentUserId ? <span className="text-ink-faint">(Anda)</span> : null}
                </p>
                <p className="truncate text-[12px] text-ink-muted">{m.email}</p>
              </div>
              <div className="w-44 shrink-0">
                {canManageRoles ? (
                  <Select
                    value={m.roleId}
                    disabled={isLastAdmin(m)}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                    title={isLastAdmin(m) ? "Company wajib memiliki minimal satu Admin" : undefined}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.type === "system" ? " (System)" : ""}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone="outline">{m.roleName}</Badge>
                )}
              </div>
              {canRemove ? (
                <button
                  onClick={() => setRemoveTarget(m)}
                  disabled={isLastAdmin(m)}
                  title={isLastAdmin(m) ? "Company wajib memiliki minimal satu Admin" : "Hapus anggota"}
                  className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger disabled:pointer-events-none disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash size={15} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {pendingInvitations.length > 0 ? (
        <Card className="mt-6">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-ink">Undangan pending ({pendingInvitations.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {pendingInvitations.map((i) => (
              <InvitationRow
                key={i.id}
                invitation={i}
                canInvite={canInvite}
                onResend={() => resendInvite(i.id)}
                onCancel={() => cancelInvite(i.id)}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {otherInvitations.length > 0 ? (
        <Card className="mt-6">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-ink">Riwayat undangan</h2>
          </div>
          <div className="divide-y divide-border">
            {otherInvitations.map((i) => (
              <InvitationRow key={i.id} invitation={i} canInvite={false} onResend={() => {}} onCancel={() => {}} />
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Undang anggota"
        description="Masukkan email dan pilih role untuk setiap undangan."
        widthClassName="max-w-lg"
      >
        <div className="space-y-3">
          {inviteRows.map((row, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="nama@perusahaan.com"
                  value={row.email}
                  onChange={(e) =>
                    setInviteRows((rows) => rows.map((r, i) => (i === idx ? { ...r, email: e.target.value } : r)))
                  }
                />
              </div>
              <div className="w-40">
                <Select
                  value={row.roleId}
                  onChange={(e) =>
                    setInviteRows((rows) => rows.map((r, i) => (i === idx ? { ...r, roleId: e.target.value } : r)))
                  }
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              {inviteRows.length > 1 ? (
                <button
                  onClick={() => setInviteRows((rows) => rows.filter((_, i) => i !== idx))}
                  className="mt-1.5 shrink-0 text-ink-faint hover:text-ink cursor-pointer"
                >
                  <X size={15} />
                </button>
              ) : (
                <div className="w-[15px]" />
              )}
            </div>
          ))}

          <button
            onClick={() => setInviteRows((rows) => [...rows, { email: "", roleId: memberRoleId }])}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink cursor-pointer"
          >
            <Plus size={13} /> Tambah email
          </button>

          <FieldError>{inviteError ?? undefined}</FieldError>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setInviteOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={inviteLoading} onClick={submitInvite}>
              Kirim undangan
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`Hapus ${removeTarget?.name}?`}
        description="Anggota ini akan kehilangan akses ke company ini."
        confirmLabel="Hapus"
        danger
        onConfirm={async () => {
          if (removeTarget) await removeMember(removeTarget.userId);
        }}
      />
    </div>
  );
}

function InvitationRow({
  invitation,
  canInvite,
  onResend,
  onCancel,
}: {
  invitation: Invitation;
  canInvite: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{invitation.email}</p>
        <p className="truncate text-[12px] text-ink-muted">
          {invitation.roleName} &middot; diundang oleh {invitation.invitedByName}
        </p>
      </div>
      <Badge tone={STATUS_TONE[invitation.status]}>{STATUS_LABEL[invitation.status]}</Badge>
      {canInvite && invitation.status === "pending" ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onResend}
            title="Kirim ulang"
            className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
          >
            <ArrowClockwise size={14} />
          </button>
          <button
            onClick={onCancel}
            title="Batalkan"
            className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
