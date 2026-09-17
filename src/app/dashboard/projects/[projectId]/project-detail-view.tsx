"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Archive, ArrowCounterClockwise, Trash } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPatch, apiDelete, ApiError } from "@/lib/fetch-json";
import { ProjectTabs } from "./project-tabs";

type Project = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  costCenter: string | null;
  classification: string | null;
  status: "active" | "archived";
};

export function ProjectDetailView({
  companyId,
  project,
  canEdit,
  canArchive,
  canDelete,
  showFinanceTab,
}: {
  companyId: string;
  project: Project;
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  showFinanceTab: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [costCenter, setCostCenter] = useState(project.costCenter ?? "");
  const [classification, setClassification] = useState(project.classification ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty =
    name.trim() !== project.name ||
    description !== (project.description ?? "") ||
    costCenter !== (project.costCenter ?? "") ||
    classification !== (project.classification ?? "");

  async function save() {
    setError(null);
    if (!name.trim()) return setError("Nama project wajib diisi.");
    setSaving(true);
    try {
      await apiPatch(`/api/companies/${companyId}/projects/${project.id}`, {
        name,
        description,
        costCenter,
        classification,
      });
      toast.success("Perubahan disimpan");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    setArchiving(true);
    try {
      const nextStatus = project.status === "active" ? "archived" : "active";
      await apiPatch(`/api/companies/${companyId}/projects/${project.id}`, { status: nextStatus });
      toast.success(nextStatus === "archived" ? "Project diarsipkan" : "Project diaktifkan kembali");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setArchiving(false);
    }
  }

  async function deleteProject() {
    try {
      await apiDelete(`/api/companies/${companyId}/projects/${project.id}`);
      toast.success("Project dihapus");
      router.push("/dashboard/projects");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus project.");
    }
  }

  return (
    <div className="fade-in">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={14} />
        Kembali ke Projects
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-faint">{project.code}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-ink">{project.name}</h1>
            {project.status === "archived" ? <Badge tone="outline">Arsip</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canArchive ? (
            <Button variant="secondary" size="sm" loading={archiving} onClick={toggleArchive}>
              {project.status === "active" ? (
                <>
                  <Archive size={14} /> Arsipkan
                </>
              ) : (
                <>
                  <ArrowCounterClockwise size={14} /> Aktifkan
                </>
              )}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="danger"
              size="sm"
              disabled={project.status !== "archived"}
              title={project.status !== "archived" ? "Arsipkan project ini dulu sebelum menghapus" : undefined}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash size={14} /> Hapus
            </Button>
          ) : null}
        </div>
      </div>

      <ProjectTabs projectId={project.id} showFinance={showFinanceTab} />

      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>Detail Project</CardTitle>
          <CardDescription>Konten Knowledge Base untuk Project ini akan tersedia di modul berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="project-name">Nama Project</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <Label htmlFor="project-description">Deskripsi</Label>
            <Textarea
              id="project-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="project-cost-center">Cost Center</Label>
              <Input
                id="project-cost-center"
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                disabled={!canEdit}
                placeholder="mis. CC-OPS-01"
              />
            </div>
            <div>
              <Label htmlFor="project-classification">Klasifikasi</Label>
              <Input
                id="project-classification"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                disabled={!canEdit}
                placeholder="mis. Hibah / Internal"
              />
            </div>
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          {canEdit ? (
            <Button size="sm" loading={saving} disabled={!dirty} onClick={save}>
              Simpan perubahan
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus ${project.name}?`}
        description="Tindakan ini permanen dan tidak bisa dibatalkan."
        confirmLabel="Hapus permanen"
        danger
        onConfirm={deleteProject}
      />
    </div>
  );
}
