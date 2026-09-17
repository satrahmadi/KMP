"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, PencilSimple, Trash, Lock } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPost, apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";

type PermissionDef = { key: string; module: string; label: string; description: string };
type Role = {
  id: string;
  name: string;
  description: string | null;
  type: "system" | "custom";
  memberCount: number;
  permissionKeys: string[];
};

export function RolesView({
  companyId,
  canManage,
  catalog,
  moduleLabels,
  roles,
}: {
  companyId: string;
  canManage: boolean;
  catalog: PermissionDef[];
  moduleLabels: Record<string, string>;
  roles: Role[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const systemRoles = roles.filter((r) => r.type === "system");
  const customRoles = roles.filter((r) => r.type === "custom");

  function openCreate() {
    setEditingRole(null);
    setFormOpen(true);
  }
  function openEdit(role: Role) {
    setEditingRole(role);
    setFormOpen(true);
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Roles &amp; Permissions</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Atur izin akses berbasis role untuk company ini.</p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} weight="bold" />
            Buat Role Baru
          </Button>
        ) : null}
      </div>

      <h2 className="mt-8 mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">System Role</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {systemRoles.map((r) => (
          <RoleCard key={r.id} role={r} moduleLabels={moduleLabels} catalog={catalog} />
        ))}
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Custom Role</h2>
      </div>
      {customRoles.length === 0 ? (
        <Card>
          <div className="px-6 py-10 text-center text-[13px] text-ink-muted">
            Belum ada Custom Role. {canManage ? 'Klik "Buat Role Baru" untuk membuat kombinasi izin sendiri.' : ""}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {customRoles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              moduleLabels={moduleLabels}
              catalog={catalog}
              onEdit={canManage ? () => openEdit(r) : undefined}
              onDelete={canManage ? () => setDeleteTarget(r) : undefined}
            />
          ))}
        </div>
      )}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companyId={companyId}
        role={editingRole}
        catalog={catalog}
        moduleLabels={moduleLabels}
        onSaved={() => router.refresh()}
      />

      <DeleteRoleDialog
        role={deleteTarget}
        otherRoles={roles.filter((r) => r.id !== deleteTarget?.id)}
        companyId={companyId}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}

function RoleCard({
  role,
  catalog,
  moduleLabels,
  onEdit,
  onDelete,
}: {
  role: Role;
  catalog: PermissionDef[];
  moduleLabels: Record<string, string>;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const grouped = new Map<string, PermissionDef[]>();
  for (const key of role.permissionKeys) {
    const def = catalog.find((c) => c.key === key);
    if (!def) continue;
    if (!grouped.has(def.module)) grouped.set(def.module, []);
    grouped.get(def.module)!.push(def);
  }

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between px-5 py-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-semibold text-ink">{role.name}</p>
            {role.type === "system" ? <Lock size={12} className="text-ink-faint" /> : null}
          </div>
          {role.description ? <p className="mt-0.5 text-[12px] text-ink-muted">{role.description}</p> : null}
          <p className="mt-1.5 text-[12px] text-ink-faint">{role.memberCount} anggota</p>
        </div>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 gap-1">
            {onEdit ? (
              <button
                onClick={onEdit}
                className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                <PencilSimple size={14} />
              </button>
            ) : null}
            {onDelete ? (
              <button
                onClick={onDelete}
                className="rounded-[var(--radius-sm)] p-1.5 text-ink-faint transition-colors hover:bg-danger-surface hover:text-danger cursor-pointer"
              >
                <Trash size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {grouped.size > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-5 py-3">
          {[...grouped.entries()].map(([mod, perms]) => (
            <Badge key={mod} tone="outline" title={perms.map((p) => p.label).join(", ")}>
              {moduleLabels[mod] ?? mod} &middot; {perms.length}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="border-t border-border px-5 py-3 text-[12px] text-ink-faint">Tidak ada izin (view-only)</div>
      )}
    </Card>
  );
}

function RoleFormDialog({
  open,
  onOpenChange,
  companyId,
  role,
  catalog,
  moduleLabels,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  role: Role | null;
  catalog: PermissionDef[];
  moduleLabels: Record<string, string>;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissionKeys ?? []));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset form fields whenever a different role is opened for editing (or dialog re-opened for create).
  const [lastRoleId, setLastRoleId] = useState<string | null | undefined>(undefined);
  if (open && role?.id !== lastRoleId) {
    setLastRoleId(role?.id ?? null);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setSelected(new Set(role?.permissionKeys ?? []));
    setError(null);
  }

  const grouped = new Map<string, PermissionDef[]>();
  for (const p of catalog) {
    if (!grouped.has(p.module)) grouped.set(p.module, []);
    grouped.get(p.module)!.push(p);
  }

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function submit() {
    if (name.trim().length < 2) return setError("Nama role minimal 2 karakter.");
    setError(null);
    setLoading(true);
    try {
      const payload = { name: name.trim(), description, permissionKeys: [...selected] };
      if (role) {
        await apiPatch(`/api/companies/${companyId}/roles/${role.id}`, payload);
        toast.success("Role diperbarui");
      } else {
        await apiPost(`/api/companies/${companyId}/roles`, payload);
        toast.success("Role dibuat");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={role ? `Edit ${role.name}` : "Buat Role Baru"}
      description="Pilih izin per modul untuk role ini."
      widthClassName="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="role-name">Nama role</Label>
          <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Editor Konten" />
        </div>
        <div>
          <Label htmlFor="role-desc">Deskripsi (opsional)</Label>
          <Textarea id="role-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Permission</Label>
          <div className="max-h-72 space-y-4 overflow-y-auto rounded-[var(--radius-md)] border border-border p-3">
            {[...grouped.entries()].map(([mod, perms]) => (
              <div key={mod}>
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  {moduleLabels[mod] ?? mod}
                </p>
                <div className="space-y-1.5">
                  {perms.map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-[13px] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                        className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      <span>
                        {p.label}
                        <span className="block text-[12px] text-ink-muted">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button size="sm" loading={loading} onClick={submit}>
            {role ? "Simpan" : "Buat Role"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DeleteRoleDialog({
  role,
  otherRoles,
  companyId,
  onOpenChange,
  onDeleted,
}: {
  role: Role | null;
  otherRoles: Role[];
  companyId: string;
  onOpenChange: (o: boolean) => void;
  onDeleted: () => void;
}) {
  const [replacementId, setReplacementId] = useState(otherRoles[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!role) return null;
  const needsReplacement = role.memberCount > 0;

  async function confirmDelete() {
    setError(null);
    setLoading(true);
    try {
      await apiDelete(`/api/companies/${companyId}/roles/${role!.id}`, needsReplacement ? { replacementRoleId: replacementId } : undefined);
      toast.success("Role dihapus");
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange} title={`Hapus ${role.name}?`}>
      <div className="space-y-4">
        {needsReplacement ? (
          <>
            <p className="text-[13px] text-ink-muted">
              {role.memberCount} anggota masih memegang role ini. Pilih role pengganti sebelum menghapus.
            </p>
            <Select value={replacementId} onChange={(e) => setReplacementId(e.target.value)}>
              {otherRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </>
        ) : (
          <p className="text-[13px] text-ink-muted">Role ini akan dihapus permanen.</p>
        )}
        <FieldError>{error ?? undefined}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="danger" size="sm" loading={loading} onClick={confirmDelete}>
            Hapus
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
