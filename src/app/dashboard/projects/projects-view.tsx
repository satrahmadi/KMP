"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FolderSimple, Archive } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { apiPost, ApiError } from "@/lib/fetch-json";

type Project = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
};

export function ProjectsView({
  companyId,
  canCreate,
  projects,
}: {
  companyId: string;
  canCreate: boolean;
  projects: Project[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createProject() {
    setError(null);
    if (!name.trim()) return setError("Nama project wajib diisi.");
    setLoading(true);
    try {
      await apiPost(`/api/companies/${companyId}/projects`, { name, description });
      toast.success("Project dibuat");
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Projects</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Wadah kerja di dalam company ini.</p>
        </div>
        {canCreate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} weight="bold" />
            Buat Project
          </Button>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-border-strong text-ink-muted">
              <FolderSimple size={20} />
            </div>
            <p className="text-[14px] font-medium text-ink">Belum ada Project</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              {canCreate
                ? "Buat Project pertama untuk mulai mengorganisir kerja tim di company ini."
                : "Admin belum membuat Project apa pun di company ini."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block h-full">
              <Card className="h-full p-4 transition-colors duration-150 hover:border-border-strong hover:bg-surface-muted">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-ink-muted">
                    <FolderSimple size={16} />
                  </div>
                  {p.status === "archived" ? (
                    <Badge tone="outline">
                      <Archive size={11} className="mr-1" />
                      Arsip
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] font-medium tracking-wide text-ink-faint">{p.code}</p>
                <p className="truncate text-[14px] font-medium text-ink">{p.name}</p>
                {p.description ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{p.description}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Buat Project" description="Beri nama Project baru di company ini.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="project-name">Nama Project</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="project-description">Deskripsi (opsional)</Label>
            <Textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button size="sm" loading={loading} onClick={createProject}>
              Buat Project
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
