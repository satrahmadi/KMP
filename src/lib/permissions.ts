/**
 * Central permission catalog (PRD §9.2).
 * Every module that guards an action registers its permission keys here.
 * Adding a new module/action never changes the Role/CompanyMember schema —
 * it only adds rows to this catalog, which the seed script upserts into `Permission`.
 */

export type PermissionDef = {
  key: string; // "module.action"
  module: string;
  action: string;
  label: string;
  description: string;
  defaultAdmin: boolean;
  defaultMember: boolean;
};

function mod(
  module: string,
  actions: Array<{
    action: string;
    label: string;
    description: string;
    defaultAdmin?: boolean;
    defaultMember?: boolean;
  }>
): PermissionDef[] {
  return actions.map((a) => ({
    key: `${module}.${a.action}`,
    module,
    action: a.action,
    label: a.label,
    description: a.description,
    defaultAdmin: a.defaultAdmin ?? true,
    defaultMember: a.defaultMember ?? false,
  }));
}

export const TEAM_MANAGEMENT_PERMISSIONS = mod("team_management", [
  { action: "view_members", label: "View members", description: "Melihat daftar anggota & undangan" },
  { action: "invite_member", label: "Invite member", description: "Mengundang anggota baru" },
  { action: "remove_member", label: "Remove member", description: "Menghapus/menonaktifkan anggota" },
  { action: "manage_roles", label: "Change member roles", description: "Mengubah role anggota" },
]);

export const ROLES_PERMISSIONS = mod("roles", [
  { action: "view", label: "View roles", description: "Melihat daftar Role & isi permission-nya" },
  { action: "manage", label: "Manage roles", description: "Membuat/mengedit/menghapus Custom Role" },
]);

export const COMPANY_SETTINGS_PERMISSIONS = mod("company_settings", [
  { action: "view", label: "View company settings", description: "Melihat pengaturan Company" },
  { action: "edit", label: "Edit company settings", description: "Mengubah pengaturan Company" },
]);

export const PROJECT_PERMISSIONS = mod("project", [
  { action: "view", label: "View projects", description: "Melihat daftar & detail Project", defaultMember: true },
  { action: "create", label: "Create project", description: "Membuat Project baru" },
  { action: "edit", label: "Edit project", description: "Mengubah nama/deskripsi Project" },
  { action: "archive", label: "Archive project", description: "Mengarsipkan / mengaktifkan kembali Project" },
  { action: "delete", label: "Delete project", description: "Menghapus permanen Project" },
]);

export const PROJECT_FINANCE_PERMISSIONS = mod("project_finance", [
  { action: "view", label: "View finance records", description: "Melihat daftar & detail Finance Record (Source of Fund) di sebuah Project" },
  { action: "create", label: "Create finance record", description: "Menambah Finance Record baru" },
  { action: "edit", label: "Edit finance record", description: "Mengubah Finance Record" },
  { action: "delete", label: "Delete finance record", description: "Menghapus Finance Record" },
]);

export const DONOR_PERMISSIONS = mod("donor", [
  { action: "view", label: "View donors", description: "Melihat daftar & detail Donor beserta Contact dan Agreement", defaultMember: true },
  { action: "create", label: "Create donor", description: "Menambah Donor baru" },
  { action: "edit", label: "Edit donor", description: "Mengubah data Donor, Contact, dan Agreement" },
  { action: "delete", label: "Delete donor", description: "Menghapus Donor, Contact, dan Agreement terkait" },
]);

export const CURRENCY_PERMISSIONS = mod("currency", [
  { action: "view", label: "View currencies", description: "Melihat daftar Currency & riwayat Exchange Rate", defaultMember: true },
  { action: "create", label: "Create currency", description: "Menambah Currency baru" },
  { action: "edit", label: "Edit currency", description: "Mengubah data Currency & menambah Exchange Rate baru" },
  { action: "delete", label: "Delete currency", description: "Menghapus Currency" },
]);

export const PROGRAM_PERMISSIONS = mod("program", [
  { action: "view", label: "View programs", description: "Melihat daftar & detail Program Code", defaultMember: true },
  { action: "create", label: "Create program", description: "Membuat Program Code baru" },
  { action: "edit", label: "Edit program", description: "Mengubah data Program" },
  { action: "delete", label: "Delete program", description: "Menghapus Program" },
]);

export const KNOWLEDGE_BASE_PERMISSIONS = mod("knowledge_base", [
  { action: "view_content", label: "View content", description: "Melihat konten KM", defaultMember: true },
  { action: "create_content", label: "Create content", description: "Membuat konten KM baru" },
  { action: "edit_content", label: "Edit content", description: "Mengedit konten KM" },
  { action: "delete_content", label: "Delete content", description: "Menghapus konten KM" },
  { action: "publish_content", label: "Publish content", description: "Mempublikasikan konten dari draf ke final" },
]);

export const PERMISSION_CATALOG: PermissionDef[] = [
  ...TEAM_MANAGEMENT_PERMISSIONS,
  ...ROLES_PERMISSIONS,
  ...COMPANY_SETTINGS_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...PROJECT_FINANCE_PERMISSIONS,
  ...DONOR_PERMISSIONS,
  ...CURRENCY_PERMISSIONS,
  ...PROGRAM_PERMISSIONS,
  ...KNOWLEDGE_BASE_PERMISSIONS,
];

export const MODULE_LABELS: Record<string, string> = {
  team_management: "Team Management",
  roles: "Roles & Permissions",
  company_settings: "Company Settings",
  project: "Projects",
  project_finance: "Finance (Source of Fund)",
  donor: "Donor Management",
  currency: "Currency Management",
  program: "Program Code",
  knowledge_base: "Knowledge Base",
};

export function permissionsByModule(perms: PermissionDef[] = PERMISSION_CATALOG) {
  const map = new Map<string, PermissionDef[]>();
  for (const p of perms) {
    if (!map.has(p.module)) map.set(p.module, []);
    map.get(p.module)!.push(p);
  }
  return map;
}
