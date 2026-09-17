# PRD — Perbaikan Company Switching (Multi-Company) & Modul Project

**Produk:** Knowledge Management Platform (SaaS, multi-tenant)
**Modul:** Company Switching (perbaikan gap), Project Management (baru), Konvensi Registrasi Modul ke RBAC
**Status:** §1–§11 (v0.1: Company Switching fix, CRUD Project dasar, Module Registration Checklist) — **Implemented**. §13–§15 (v0.2: Project Code, arsitektur Project Modules) — Draft untuk direview, belum masuk tahap implementasi.
**Versi:** 0.2
**Referensi:** `PRD-Auth-Company-TeamManagement.md` (dasar Company, RBAC, Role/Permission) — dokumen ini **tidak mengubah** keputusan di PRD tsb., hanya menutup gap implementasi dan menambahkan modul baru di atasnya. Lihat juga `PRD-Project-Finance-Module.md` (modul turunan pertama yang memakai arsitektur Project Modules di §14).

---

## 1. Ringkasan

Struktur produk dari sisi user: **User → Company(s) → Project(s) → Project Module(s)**.

Dokumen ini mencakup empat hal:

1. **Perbaikan Company Switching** — saat ini user yang sudah punya 1 Company tidak punya jalur UI untuk membuat Company lain, padahal `PRD-Auth-Company-TeamManagement.md` §12 sudah memutuskan multi-company diperbolehkan dan backend-nya sudah mendukung. Ini murni gap UI, bukan perubahan keputusan produk. *(v0.1 — sudah diimplementasikan)*
2. **Modul Project** — level struktur baru di bawah Company. Setiap Company bisa punya banyak Project; Project menjadi wadah kerja yang nanti akan diisi konten Knowledge Management. *(v0.1 — sudah diimplementasikan)*
3. **Konvensi Registrasi Modul ke RBAC** — memformalkan pola yang sudah dirintis di `PRD-Auth` §4.4/FR-12 dan diimplementasikan di `src/lib/permissions.ts` + `prisma/seed.ts`, menjadi checklist wajib setiap kali modul baru dibangun. *(v0.1 — sudah diimplementasikan, dan sudah terbukti bekerja: permission `project.*` otomatis muncul di matrix Roles & Permissions tanpa kode tambahan)*
4. **Project Code & arsitektur Project Modules** — setiap Project butuh kode identifikasi unik (§13), dan Project ke depannya akan punya modul-modul fitur tambahan yang menempel padanya — dimulai dari modul **Finance (Source of Fund)** — sehingga perlu pola arsitektur yang jelas untuk "modul di dalam Project" (§14), berbeda dari "modul di level Company" yang sudah ada (Team Management, Roles, Company Settings, Project). *(v0.2 — draft, dokumen ini)*

---

## 2. Latar Belakang: Analisis Gap Company Switching

Kode saat ini (`src/app/onboarding/company/page.tsx:12-13`):

```ts
const count = await db.companyMember.count({ where: { userId: session.user.id, status: "active" } });
if (count > 0) redirect("/dashboard");
```

`/onboarding/company` adalah **satu-satunya** rute yang merender form pembuatan Company (`CreateCompanyForm`). Begitu user punya ≥1 membership aktif, rute ini langsung redirect ke `/dashboard` — sehingga tidak ada jalur UI tersisa untuk membuat Company kedua.

Sementara itu backend `POST /api/companies` (`src/app/api/companies/route.ts`) **tidak** memiliki guard semacam itu — endpoint ini akan sukses membuat Company baru untuk user manapun yang sudah login, berapa pun jumlah Company yang sudah ia miliki. `CompanySwitcher` (`src/components/dashboard/company-switcher.tsx`) juga sudah berfungsi penuh untuk berpindah antar Company yang ada — hanya saja tidak punya aksi "buat Company baru" di dalam dropdown-nya, dan ketika `memberships.length <= 1` komponen ini bahkan collapse jadi `<div>` statis (bukan tombol), sehingga tidak bisa diklik sama sekali.

**Kesimpulan:** ini adalah gap UI murni (dua tempat), bukan keputusan produk yang perlu diubah. `PRD-Auth` §12 sudah eksplisit ✅ mengizinkan multi-company membership.

---

## 3. Definisi & Istilah Baru

| Istilah | Arti |
|---|---|
| **Project** | Unit kerja di dalam satu Company. Setiap Project terisolasi datanya dari Project lain (walau sama-sama di bawah Company yang sama), dan menjadi wadah bagi konten Knowledge Management yang akan dibangun di modul berikutnya. |
| **Company Creation Entry Point** | Jalur UI mana pun yang merender form buat Company. Setelah perbaikan ini, ada dua: `/onboarding/company` (khusus user yang benar-benar belum punya Company sama sekali) dan `/dashboard/companies/new` (bisa diakses kapan saja oleh user yang sudah login, dari dalam dashboard). |
| **Module Registration Checklist** | Langkah wajib yang harus dilakukan setiap kali modul/fitur baru dibangun, agar permission-nya otomatis terdaftar di katalog RBAC dan bisa dipilih Admin saat membuat Custom Role — lihat §7. |

---

## 4. Ruang Lingkup

### 4.1 Termasuk
1. Tombol **"+ Buat Company Baru"** di dalam dropdown Company Switcher — selalu tersedia, tidak peduli user sudah punya berapa Company.
2. Company Switcher tidak lagi collapse menjadi elemen statis saat user hanya punya 1 Company — tetap jadi dropdown yang bisa dibuka (isinya: 1 Company yang ada + aksi buat baru).
3. Rute baru `/dashboard/companies/new` — form buat Company yang bisa diakses user yang sudah punya Company (tanpa redirect guard `count > 0`).
4. Setelah Company baru dibuat lewat rute manapun, Company tsb otomatis jadi Company aktif dan user diarahkan ke dashboard-nya (perilaku yang sudah ada di `POST /api/companies`, dipertahankan).
5. Modul **Project**: data model, API, menu sidebar, halaman list & buat Project, permission module `project.*` terdaftar di katalog RBAC.
6. Dokumentasi/checklist Module Registration di §7, dijadikan acuan wajib untuk modul Project ini sendiri dan modul-modul KM berikutnya.

### 4.2 Tidak Termasuk (Out of Scope)
- Konten Knowledge Management di dalam Project (dokumen, folder, dsb.) — menyusul di PRD modul KM terpisah, memakai katalog `knowledge_base.*` yang sudah ada di `PRD-Auth` §9.2.
- Batas jumlah Company atau Project yang boleh dibuat satu user/Company (mengikuti pertanyaan terbuka `PRD-Auth` §12 poin 3, belum diputuskan).
- Project-level role/permission (permission di fase ini tetap di level modul dalam satu Company, sesuai `PRD-Auth` §2 non-tujuan "permission berbasis item/record spesifik").
- Memindahkan Project antar Company.

---

## 5. User Flow

### 5.1 Membuat Company Tambahan (perbaikan)
1. User yang sudah login & sudah punya ≥1 Company membuka dropdown Company Switcher di sidebar.
2. Di baris paling bawah daftar Company, ada aksi **"+ Buat Company Baru"**.
3. Klik aksi tsb → diarahkan ke `/dashboard/companies/new`, form sama seperti onboarding pertama (nama Company wajib, industri opsional).
4. Submit → Company baru dibuat, user otomatis jadi Admin di Company itu (perilaku existing `POST /api/companies`), Company baru langsung jadi Company aktif, redirect ke `/dashboard`.
5. Company lama tetap ada di daftar switcher, bisa dipilih kembali kapan saja.

### 5.2 Company Switcher — perilaku baru saat hanya 1 Company
1. Sebelumnya: elemen statis, tidak bisa diklik.
2. Sekarang: tetap jadi tombol dropdown. Membuka dropdown menampilkan 1 Company yang ada (ditandai centang, tidak bisa "dipilih ulang" — no-op) + aksi "+ Buat Company Baru" di bawahnya. Ini menyamakan perilaku dengan Slack workspace switcher, persis seperti yang diminta.

### 5.3 Menu Project
1. Setelah masuk ke sebuah Company (dashboard), user dengan permission `project.view` melihat menu **"Projects"** di sidebar.
2. Halaman `/dashboard/projects` menampilkan daftar Project di Company aktif (nama, status, jumlah anggota — jika relevan, tanggal dibuat).
3. User dengan permission `project.create` melihat tombol **"Buat Project"** → form nama Project (wajib) + deskripsi (opsional) → submit → Project baru masuk daftar.
4. Klik salah satu Project → masuk ke halaman detail Project (placeholder untuk fase ini; konten KM menyusul di modul berikutnya).
5. User dengan permission `project.edit`/`project.archive`/`project.delete` melihat aksi terkait di halaman detail/list.
6. Berpindah Company lewat Company Switcher (§5.1) otomatis mengganti daftar Project yang ditampilkan — Project selalu ter-scope ke Company aktif, tidak pernah bocor lintas Company.

---

## 6. Functional Requirements

Prioritas: **M** = Must have, **S** = Should have.

### FR-1 — Buat Company Tambahan Kapan Saja *(M)*
- User yang sudah login (verified) dan sudah punya ≥1 Company dapat membuat Company baru lewat `/dashboard/companies/new`, tanpa batas jumlah (mengikuti keputusan `PRD-Auth` §12 — belum ada limit).
- User otomatis jadi Admin di Company baru tsb (role terpisah dari role-nya di Company lain — role di-scope per Company, sesuai `PRD-Auth` §4.4).
- **AC:** Setelah submit sukses, session `companyId` aktif langsung berpindah ke Company baru tanpa perlu logout/login ulang (reuse `setActiveCompany`, sama seperti alur onboarding pertama).

### FR-2 — Aksi "Buat Company Baru" di Company Switcher *(M)*
- Selalu tampil di dropdown Company Switcher, di bawah daftar Company yang ada, terlepas dari berapa jumlah Company user saat ini (termasuk saat hanya 1).
- **AC:** Company Switcher tidak pernah collapse menjadi elemen non-interaktif — minimal selalu bisa dibuka untuk mengakses aksi "Buat Company Baru", bahkan bila user baru punya 1 Company.

### FR-3 — Modul Project: CRUD Dasar *(M)*
- Field wajib: nama. Field opsional: deskripsi.
- Slug Project unik **per Company** (bukan global — beda Company boleh punya Project dengan nama/slug yang sama).
- Status Project: `active` / `archived` (soft-state, bukan hapus permanen saat "archive").
- Hanya pemegang permission `project.view` yang bisa melihat daftar & detail Project di Company tsb.
- Hanya pemegang permission `project.create` yang bisa membuat Project baru.
- Hanya pemegang permission `project.edit` yang bisa mengubah nama/deskripsi Project.
- Hanya pemegang permission `project.archive` yang bisa mengarsipkan/mengaktifkan kembali Project.
- Hanya pemegang permission `project.delete` yang bisa menghapus permanen Project — **diimplementasikan**: wajib berstatus `archived` lebih dulu (mencoba `DELETE` pada Project berstatus `active` mengembalikan 409), menjawab pertanyaan terbuka lama di §12 poin 3.
- **AC:** Semua query Project wajib difilter berdasarkan `companyId` dari context Company aktif (`requireCompanyContext`) — tidak pernah menerima `companyId` mentah dari client tanpa validasi keanggotaan (isolasi tenant, konsisten dengan `PRD-Auth` §10).
- **AC:** Membuat Project dengan nama yang menghasilkan slug bentrok di Company yang sama → auto-suffix (pola sama dengan `uniqueSlug` di `src/app/api/companies/route.ts`), bukan error ke user.

### FR-4 — Menu "Projects" di Sidebar *(M)*
- Muncul hanya untuk pemegang permission `project.view`, memakai pola `NAV_ITEMS` + `permission` key yang sudah ada di `src/components/dashboard/sidebar.tsx` (item lain: Team, Roles & Permissions, Company Settings sudah pakai pola ini).
- **AC:** Tidak ada perubahan pada mekanisme filter nav yang sudah ada — modul Project cukup menambah satu entri baru ke `NAV_ITEMS`.

---

## 7. Konvensi Registrasi Modul ke RBAC (Module Registration Checklist)

Prinsip ini **sudah** dinyatakan di `PRD-Auth-Company-TeamManagement.md` §4.4 ("setiap kali sebuah modul/fitur baru dibangun ... wajib mendaftarkan permission-nya sendiri") dan §10 NFR Extensibility. Dokumen ini memformalkannya jadi checklist konkret berdasarkan pola yang sudah berjalan di kode (`src/lib/permissions.ts`, `prisma/seed.ts`, `src/lib/rbac.ts`), supaya **setiap** modul baru — dimulai dari Project di PRD ini — mengikuti langkah yang sama persis:

1. **Definisikan permission modul** di `src/lib/permissions.ts` memakai helper `mod(module, actions[])`, tambahkan hasilnya ke `PERMISSION_CATALOG`, dan tambahkan label modul ke `MODULE_LABELS`. Setiap action menentukan `defaultAdmin`/`defaultMember` — default aman: Admin penuh, Member view-only kecuali modul tsb memang butuh pola lain (persis seperti `knowledge_base.view_content` yang `defaultMember: true`).
2. **Jalankan ulang `prisma/seed.ts`** — script ini melakukan `upsert` per permission key, sehingga menambah baris `Permission` baru dan mengisi `RolePermission` default untuk System Role (Admin/Member) **tanpa pernah menyentuh** Custom Role yang sudah ada (fail-closed: Custom Role lama tidak otomatis dapat permission baru sampai Admin mengaktifkannya manual — sesuai NFR di `PRD-Auth` §10).
3. **Lindungi setiap endpoint modul** dengan `can(ctx, "module.action")` dari `src/lib/rbac.ts` (hasil `requireCompanyContext`) — **tidak pernah** hardcode nama role (mis. `if (role === "Admin")`), sesuai FR-8 di `PRD-Auth`.
4. **Tambahkan entri ke `NAV_ITEMS`** di `src/components/dashboard/sidebar.tsx` dengan field `permission` yang sesuai, agar menu otomatis hilang untuk Role yang tidak punya izin tsb.
5. Setelah langkah 1–2, permission modul baru **otomatis** muncul di matrix `Roles & Permissions` (`src/app/dashboard/roles`) sebagai pilihan saat Admin membuat/mengedit Custom Role — **tidak ada** perubahan skema `Role`/`RolePermission`/`CompanyMember` yang diperlukan.

Checklist ini berlaku untuk modul Project (§8 di bawah) dan wajib diikuti untuk modul-modul Knowledge Management berikutnya.

---

## 8. Data Model (High-Level, tambahan ke `PRD-Auth` §8)

**Project**
`id, companyId (FK → Company), code (unique per companyId — lihat §13), name, slug (unique per companyId — composite unique [companyId, slug]), description (nullable), status (active/archived), createdById (FK → User), createdAt, updatedAt`

> Catatan: relasi `Company.projects Project[]` ditambahkan ke model `Company` yang sudah ada. Tidak ada perubahan pada model `Role`/`Permission`/`RolePermission`/`CompanyMember` — permission Project murni baris baru di katalog `Permission`, sesuai §7. Field `code` (§13) adalah tambahan v0.2 — belum ada di migration v0.1 yang sudah berjalan, butuh migration tambahan.

---

## 9. Permission Catalog — Tambahan Modul Project

Menyambung tabel `PRD-Auth` §9.2:

| Modul | Permission Key | Deskripsi | Admin (default) | Member (default) |
|---|---|---|:---:|:---:|
| Project | `project.view` | Melihat daftar & detail Project di Company | ✅ | ✅ |
| Project | `project.create` | Membuat Project baru | ✅ | ❌ |
| Project | `project.edit` | Mengubah nama/deskripsi Project | ✅ | ❌ |
| Project | `project.archive` | Mengarsipkan / mengaktifkan kembali Project | ✅ | ❌ |
| Project | `project.delete` | Menghapus permanen Project | ✅ | ❌ |

Contoh Custom Role yang jadi mungkin lewat katalog ini: **"Project Lead"** = `project.view` + `project.create` + `project.edit`, tanpa `project.archive`/`project.delete`.

---

## 10. Edge Cases & Error Handling

| Skenario | Perilaku yang Diharapkan |
|---|---|
| User dengan 1 Company klik Company Switcher | Dropdown tetap terbuka, menampilkan Company tsb (checked) + aksi "Buat Company Baru" |
| Nama Project baru menghasilkan slug bentrok di Company yang sama | Auto-suffix slug (pola sama seperti slug Company), bukan error |
| User tanpa `project.view` mengakses `/dashboard/projects` langsung lewat URL | Ditolak di authorization layer (403 / redirect), bukan hanya disembunyikan dari menu |
| User berpindah Company lewat switcher saat sedang membuka detail Project Company lama | Halaman Project lama tidak lagi valid di context Company baru → redirect ke `/dashboard/projects` milik Company yang baru aktif |
| Buat Company baru dari `/dashboard/companies/new` saat user sedang aktif di Company lain | Company lama tidak terpengaruh (tetap ada di daftar switcher); Company baru langsung jadi aktif setelah dibuat |
| Menghapus (`project.delete`) Project yang berstatus `active` (belum diarsipkan) | **Diimplementasikan:** ditolak (409) — wajib diarsipkan dulu sebelum bisa dihapus permanen, mencegah penghapusan tidak sengaja |

---

## 11. Lampiran — Sketsa Endpoint (Non-Final)

```
POST /api/companies                          — sudah ada, tidak berubah (dipakai ulang oleh /dashboard/companies/new)

GET    /api/companies/:id/projects           — daftar Project di Company (butuh project.view)
POST   /api/companies/:id/projects           — buat Project baru (butuh project.create)
GET    /api/companies/:id/projects/:projectId    — detail Project (butuh project.view)
PATCH  /api/companies/:id/projects/:projectId    — ubah nama/deskripsi/status (butuh project.edit / project.archive)
DELETE /api/companies/:id/projects/:projectId    — hapus permanen (butuh project.delete)
```

---

## 12. Pertanyaan Terbuka (v0.1 — status setelah implementasi)

1. Apakah Project butuh keanggotaan sendiri (subset dari member Company yang ditugaskan ke Project tsb.), atau semua member Company otomatis bisa lihat semua Project sesuai permission `project.view` di level Company — **masih terbuka**, saat ini dipakai opsi kedua (konsisten dengan prinsip "permission di level modul" dari `PRD-Auth` §2). Relevan lagi di §14 saat Project mulai punya modul yang datanya lebih sensitif (mis. Finance).
2. Apakah ada batas jumlah Project per Company (mirroring pertanyaan terbuka soal batas Company per user di `PRD-Auth` §12 poin 3) — **masih terbuka**, belum ada limit.
3. ~~Aturan pasti untuk `project.delete`~~ — **selesai**: wajib diarsipkan dulu sebelum bisa dihapus permanen (409 jika belum).

---

## 13. Project Code

### 13.1 Latar Belakang
Selain nama dan slug (URL-friendly, bisa berubah kalau nama diubah), setiap Project butuh **kode identifikasi pendek dan stabil** — dipakai untuk referensi cepat di percakapan tim, penomoran dokumen/invoice (lihat `PRD-Project-Finance-Module.md`), dan pencarian. Ini konvensi umum di tools manajemen proyek (mis. kode "ENG-123" di Jira/Linear).

### 13.2 Keputusan Desain
- **Format:** `PRJ-` + angka urut 4 digit, zero-padded, mis. `PRJ-0001`, `PRJ-0002`, ... — dihasilkan otomatis oleh sistem saat Project dibuat, **tidak bisa diisi manual oleh user** (mencegah tabrakan/format tidak konsisten).
- **Scope keunikan:** unik **per Company** (bukan global lintas Company) — konsisten dengan slug Project di §8. Urutan angka mengikuti urutan pembuatan Project di Company tsb (Project pertama di Company = `PRJ-0001`, dst — independen dari Project yang sudah dihapus).
- **Immutable:** `code` tidak bisa diubah setelah Project dibuat (beda dengan `name`/`description` yang bisa diedit lewat `project.edit`).
- **Tampil di mana:** kartu Project di `/dashboard/projects`, header halaman detail Project, dan di manapun Project dirujuk dari modul lain (mis. daftar Finance Record akan menampilkan `code` Project induknya bila ditampilkan lintas-Project).

### 13.3 Functional Requirement

**FR-5 — Project Code Otomatis** *(M)*
- Setiap Project baru otomatis mendapat `code` unik per Company mengikuti format §13.2, dibuat bersamaan dengan `POST /api/companies/:id/projects` — tidak ada field tambahan yang perlu diisi user di form "Buat Project".
- **AC:** Dua Project di Company yang sama tidak pernah punya `code` yang sama; Project di Company berbeda boleh punya `code` yang sama (mis. dua Company sama-sama punya `PRJ-0001`).
- **AC:** `code` tampil di UI segera setelah Project dibuat (response `POST` menyertakan `code`), tanpa perlu reload.
- **AC:** Endpoint `PATCH` Project menolak perubahan pada `code` meski dikirim di body request (field ini di luar `updateProjectSchema`).

### 13.4 Edge Case
| Skenario | Perilaku yang Diharapkan |
|---|---|
| Dua request "Buat Project" di Company yang sama nyaris bersamaan (race condition) | Penomoran urut wajib atomik di level database (mis. transaksi + `count`+1, atau kolom sequence) — tidak boleh menghasilkan `code` duplikat di Company yang sama |
| Project dengan `code` tertentu dihapus permanen | Nomor urut **tidak** dipakai ulang oleh Project baru berikutnya (next-value selalu naik, bukan mengisi celah) — mencegah kebingungan bila `code` lama sempat dirujuk di luar sistem (mis. di invoice yang sudah dicetak) |

---

## 14. Arsitektur "Project Modules" (Modul di dalam Project)

### 14.1 Latar Belakang
Sampai v0.1, seluruh modul yang RBAC-nya terdaftar di katalog (`PRD-Auth` §9.2 + §9 dokumen ini) di-scope ke **Company**: Team Management, Roles & Permissions, Company Settings, dan Project sendiri (siapa saja yang punya `project.view` bisa lihat *semua* Project di Company itu). Mulai dari kebutuhan modul **Finance (Source of Fund)** — lihat `PRD-Project-Finance-Module.md` — platform ini mulai punya modul yang datanya di-scope ke **satu Project spesifik**, bukan ke Company secara keseluruhan.

### 14.2 Keputusan Desain
- **RBAC tetap di level Company, bukan di level Project.** Permission seperti `project_finance.view` tetap dicek lewat `CompanyContext` yang sama (`requireCompanyContext` + `can()`) seperti modul lain — artinya siapa pun yang punya permission tsb di Company itu bisa mengakses data modul itu **di Project manapun** dalam Company yang sama. Ini konsisten dengan prinsip `PRD-Auth` §2 ("RBAC fase ini bekerja di level modul fitur, bukan level konten individual") dan menjawab sebagian pertanyaan terbuka §12 poin 1: **belum ada** izin per-Project, hanya per-modul.
- **Data tetap di-scope ke Project via foreign key** (`projectId`), persis seperti data Project di-scope ke Company via `companyId`. Isolasi query "modul-di-dalam-Project" mengikuti pola berlapis: validasi keanggotaan Company dulu (`requireCompanyContext`), baru validasi bahwa `Project.companyId` cocok dengan Company aktif, baru filter data modul berdasarkan `projectId`.
- **Setiap Project Module tetap wajib ikut Module Registration Checklist (§7)** — tidak ada pengecualian. Permission modul (mis. `project_finance.*`) didaftarkan di katalog yang sama dengan modul level-Company; yang membedakan hanyalah data modul tsb difilter tambahan berdasarkan `projectId`, bukan mekanisme RBAC-nya.
- **Navigasi:** modul di dalam Project tampil sebagai tab/section di halaman detail Project (`/dashboard/projects/:projectId`), bukan item terpisah di sidebar utama — beda dengan modul level-Company yang masing-masing punya entri sendiri di `NAV_ITEMS`.

### 14.3 Pola Endpoint untuk Project Module
Konvensi URL untuk modul di dalam Project mengikuti pola bersarang di bawah Company **dan** Project, sesuai isolasi berlapis di §14.2:

```
GET    /api/companies/:id/projects/:projectId/<module>
POST   /api/companies/:id/projects/:projectId/<module>
GET    /api/companies/:id/projects/:projectId/<module>/:recordId
PATCH  /api/companies/:id/projects/:projectId/<module>/:recordId
DELETE /api/companies/:id/projects/:projectId/<module>/:recordId
```

Modul pertama yang memakai pola ini: **Finance (Source of Fund)**, lihat `PRD-Project-Finance-Module.md` §5–§9 untuk detail lengkap (data model `FinanceRecord`, tipe catatan pengajuan/hibah/pendanaan/invoice/lainnya, dan katalog permission `project_finance.*`).

### 14.4 Pertanyaan Terbuka
1. Apakah ke depan dibutuhkan permission **per-Project** (mis. Finance Lead hanya boleh lihat data finance Project A, bukan Project B di Company yang sama)? Saat ini **tidak** — keputusan §14.2 sengaja menyamakan dengan pola RBAC level-modul yang sudah ada. Jika kebutuhan ini muncul, perlu PRD RBAC v2 terpisah (item baru: keanggotaan/izin per-Project), bukan perubahan diam-diam di modul manapun.
2. Apakah semua Project Module (Finance dan modul berikutnya) tampil sebagai tab yang sama untuk semua Project, atau bisa diaktifkan/nonaktifkan per Project (mis. Project non-hibah tidak butuh tab Finance)? Belum diputuskan — v0.2 mengasumsikan semua Project Module selalu tampil bila user punya permission-nya, tanpa toggle per-Project.

---

**Langkah selanjutnya yang disarankan:** review §13–§14 bersama stakeholder (terutama §14.4), lalu lanjut ke implementasi mengikuti urutan: (1) migration tambahan untuk `Project.code` (§13), (2) update endpoint `POST /api/companies/:id/projects` untuk generate `code`, (3) update UI Project (kartu, detail) untuk menampilkan `code`, (4) baru lanjut ke implementasi modul Finance mengikuti `PRD-Project-Finance-Module.md` di atas fondasi arsitektur §14.
