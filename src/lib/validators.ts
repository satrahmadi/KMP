import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().trim().email("Format email tidak valid").toLowerCase(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export const otpVerifySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  code: z.string().length(6),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, "Password wajib diisi"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    code: z.string().length(6),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
  });

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Nama company minimal 2 karakter").max(120),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().trim().email().toLowerCase(),
        roleId: z.string().min(1),
      })
    )
    .min(1, "Minimal satu email"),
});

export const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Nama role minimal 2 karakter").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  permissionKeys: z.array(z.string()).default([]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/)
    .optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Nama project minimal 2 karakter").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  costCenter: z.string().trim().max(80).optional().or(z.literal("")),
  classification: z.string().trim().max(80).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, "Nama project minimal 2 karakter").max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  costCenter: z.string().trim().max(80).optional().or(z.literal("")),
  classification: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).optional(),
});

export const FINANCE_RECORD_TYPES = ["proposal", "grant", "funding_note", "invoice", "other"] as const;

/**
 * Field set differs per type (Pengajuan/Hibah/Invoice each carry fields the others don't —
 * donorId+periodStart/End for grant, invoiceNumber+dueDate for invoice, etc). `type` is fixed
 * at creation (which per-type dialog was opened) and immutable afterwards — same rationale as
 * Project.code / Program.category — so it's excluded from the update schema entirely.
 */
export const createFinanceRecordSchema = z.object({
  type: z.enum(FINANCE_RECORD_TYPES),
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(160),
  donorId: z.string().trim().optional().or(z.literal("")),
  amount: z.number().finite().nonnegative("Nominal tidak boleh negatif").optional().nullable(),
  currency: z.string().trim().max(10).optional().or(z.literal("")),
  recordDate: z.string().trim().optional().or(z.literal("")),
  periodStart: z.string().trim().optional().or(z.literal("")),
  periodEnd: z.string().trim().optional().or(z.literal("")),
  invoiceNumber: z.string().trim().max(80).optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  referenceUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateFinanceRecordSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(160).optional(),
  donorId: z.string().trim().optional().or(z.literal("")),
  amount: z.number().finite().nonnegative("Nominal tidak boleh negatif").optional().nullable(),
  currency: z.string().trim().max(10).optional().or(z.literal("")),
  recordDate: z.string().trim().optional().or(z.literal("")),
  periodStart: z.string().trim().optional().or(z.literal("")),
  periodEnd: z.string().trim().optional().or(z.literal("")),
  invoiceNumber: z.string().trim().max(80).optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  referenceUrl: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).optional(),
});

export const DONOR_CATEGORIES = ["multilateral", "bilateral", "foundation", "corporate", "government", "other"] as const;

export const createDonorSchema = z.object({
  name: z.string().trim().min(2, "Nama donor minimal 2 karakter").max(160),
  category: z.enum(DONOR_CATEGORIES),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateDonorSchema = z.object({
  name: z.string().trim().min(2, "Nama donor minimal 2 karakter").max(160).optional(),
  category: z.enum(DONOR_CATEGORIES).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).optional(),
});

export const createDonorContactSchema = z.object({
  name: z.string().trim().min(2, "Nama kontak minimal 2 karakter").max(120),
  email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  position: z.string().trim().max(120).optional().or(z.literal("")),
});

export const updateDonorContactSchema = createDonorContactSchema.partial();

export const createDonorAgreementSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(160),
  amount: z.number().finite().nonnegative("Nominal tidak boleh negatif").optional().nullable(),
  currency: z.string().trim().max(10).optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
  referenceUrl: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateDonorAgreementSchema = createDonorAgreementSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

export const createCurrencySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Kode currency harus 3 huruf, mis. USD"),
  name: z.string().trim().min(2, "Nama currency minimal 2 karakter").max(80),
  symbol: z.string().trim().max(10).optional().or(z.literal("")),
  isBase: z.boolean().optional(),
});

export const updateCurrencySchema = z.object({
  name: z.string().trim().min(2, "Nama currency minimal 2 karakter").max(80).optional(),
  symbol: z.string().trim().max(10).optional().or(z.literal("")),
  isBase: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export const createExchangeRateSchema = z.object({
  rate: z.number().finite().positive("Rate harus lebih besar dari 0"),
  effectiveDate: z.string().trim().min(1, "Tanggal wajib diisi"),
});

export const PROGRAM_CATEGORIES = [
  "education",
  "health",
  "economic_development",
  "governance",
  "environment",
  "humanitarian",
  "other",
] as const;

export const createProgramSchema = z.object({
  name: z.string().trim().min(2, "Nama program minimal 2 karakter").max(160),
  category: z.enum(PROGRAM_CATEGORIES),
  type: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateProgramSchema = z.object({
  name: z.string().trim().min(2, "Nama program minimal 2 karakter").max(160).optional(),
  type: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).optional(),
});

export function slugify(input: string, fallback = "company") {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}
