# PRD — Modul Finance (Source of Fund) per Project

**Produk:** Knowledge Management Platform (SaaS, multi-tenant)
**Modul:** Finance / Source of Fund — modul pertama yang menempel di level Project (bukan level Company)
**Status:** Draft untuk direview — belum masuk tahap implementasi
**Versi:** 0.1
**Referensi:**
- `PRD-Auth-Company-TeamManagement.md` (dasar Company, RBAC, Role/Permission)
- `PRD-Company-Switching-Project-Module.md` §7 (Module Registration Checklist — wajib diikuti modul ini), §13 (Project Code — dipakai sebagai referensi penomoran), §14 (arsitektur Project Modules — modul ini adalah implementasi pertamanya)

---

## 1. Ringkasan

Setiap Project butuh tempat mencatat **riwayat pendanaannya** — dari mana uang untuk Project itu berasal, dokumen apa saja yang menyertainya, dan berapa nilainya. Modul **Finance (Source of Fund)** adalah kumpulan **catatan knowledge** (bukan sistem akuntansi double-entry) yang di-scope per Project, mencatat: **pengajuan** (proposal pendanaan), **hibah** (grant yang diterima), **catatan pendanaan** (funding note umum), **invoice**, dan **lainnya** — setiap catatan punya tipe, judul, nominal (opsional), tanggal, dan deskripsi bebas.

Modul ini adalah implementasi pertama dari arsitektur **Project Modules** yang didefinisikan di `PRD-Company-Switching-Project-Module.md` §14: RBAC-nya tetap di level Company (lewat katalog permission terpusat), tapi datanya di-scope ke satu Project spesifik.

---

## 2. Latar Belakang & Tujuan

Tim yang mengelola Project — terutama Project yang didanai lewat hibah/donor eksternal — butuh jejak audit sederhana: kapan pengajuan diajukan, kapan hibah cair, invoice apa saja yang terkait, dan catatan pendanaan lain yang tidak masuk kategori baku. Selama ini tidak ada tempat terstruktur untuk mencatat ini di dalam platform; modul ini mengisi gap tsb sebagai bagian dari Knowledge Management yang di-scope ke Project (bukan lagi ke Company secara umum seperti modul Knowledge Base generik di `PRD-Auth` §9.2).

### Tujuan
- Satu tempat terpusat per Project untuk mencatat seluruh riwayat sumber dana & dokumen finansial terkait.
- Kategorisasi yang jelas (pengajuan/hibah/pendanaan/invoice/lainnya) agar mudah difilter dan dicari.
- Akses diatur lewat RBAC yang sama dengan modul lain (Admin penuh secara default; **tidak** view-only untuk Member secara default — lihat §4.2, ini beda dari pola Knowledge Base/Project karena sifat data finansial lebih sensitif).

### Non-Tujuan (untuk fase ini)
- Bukan sistem akuntansi (tidak ada double-entry bookkeeping, chart of accounts, rekonsiliasi bank).
- Bukan sistem approval/workflow (tidak ada status "menunggu persetujuan atasan" berjenjang) — status catatan bersifat sederhana (lihat §5).
- Bukan sistem upload/penyimpanan file — lampiran dokumen untuk fase ini hanya berupa **link/URL eksternal** (mis. ke Google Drive), bukan file upload native ke platform.
- Tidak ada laporan/agregasi finansial (mis. total dana masuk per Project, grafik) — murni pencatatan daftar untuk fase ini.
- Tidak ada permission per-Project (lihat `PRD-Company-Switching-Project-Module.md` §14.4 poin 1) — siapa pun yang punya `project_finance.view` di Company bisa lihat data Finance di **semua** Project Company itu.

---

## 3. Definisi & Istilah

| Istilah | Arti |
|---|---|
| **Finance Record** | Satu catatan/entri di modul Finance — punya tipe, judul, nominal opsional, tanggal, deskripsi. Unit dasar modul ini. |
| **Source of Fund** | Nama produk untuk modul ini secara keseluruhan — kumpulan Finance Record sebuah Project, menjawab pertanyaan "dari mana dan untuk apa saja dana Project ini". |
| **Tipe Catatan** | Kategori Finance Record: `proposal` (Pengajuan), `grant` (Hibah), `funding_note` (Catatan Pendanaan), `invoice` (Invoice), `other` (Lainnya) — lihat §5.2. |
| **Project Module** | Istilah dari `PRD-Company-Switching-Project-Module.md` §14 — modul fitur yang datanya di-scope ke satu Project (bukan ke Company). Finance adalah Project Module pertama. |

---

## 4. Ruang Lingkup

### 4.1 Termasuk
1. CRUD Finance Record: buat, lihat daftar (dengan filter per tipe), lihat detail, edit, hapus.
2. Lima tipe catatan tetap (§5.2) — tidak bisa ditambah user (bukan tipe custom, berbeda dari Custom Role yang bisa dibuat bebas).
3. Tab/section **"Source of Fund"** di halaman detail Project (`/dashboard/projects/:projectId`), mengikuti pola navigasi Project Module di `PRD-Company-Switching-Project-Module.md` §14.2.
4. Permission `project_finance.*` terdaftar di katalog RBAC lewat Module Registration Checklist — otomatis muncul di matrix Roles & Permissions.
5. Audit log untuk setiap create/update/delete Finance Record (konsisten dengan modul lain, lewat `logAudit`).

### 4.2 Tidak Termasuk (Out of Scope)
- Lihat §2 Non-Tujuan.
- Notifikasi (mis. reminder invoice jatuh tempo).
- Ekspor data (CSV/PDF) — kandidat fase berikutnya.
- Multi-currency conversion — nominal dicatat apa adanya dengan field `currency` bebas teks (default `IDR`), tanpa konversi otomatis antar mata uang.

---

## 5. Data Model

**FinanceRecord**
`id, projectId (FK → Project), type (enum: proposal/grant/funding_note/invoice/other), title, amount (nullable, decimal), currency (default "IDR"), recordDate (nullable, tanggal terkait dokumen — mis. tanggal pengajuan/tanggal invoice), description (nullable, teks bebas), referenceUrl (nullable, link ke dokumen eksternal), status (enum: active/archived — konsisten dengan pola Project, bukan status approval berjenjang), createdById (FK → User), createdAt, updatedAt`

> Catatan: `projectId` adalah satu-satunya jalur isolasi data (bukan `companyId` langsung) — validasi `Project.companyId` terhadap Company aktif tetap wajib di setiap request (isolasi berlapis, lihat `PRD-Company-Switching-Project-Module.md` §14.2). Tidak ada perubahan pada model `Role`/`Permission`/`RolePermission`/`CompanyMember`.

### 5.1 Field Wajib vs Opsional

| Field | Wajib? | Catatan |
|---|:---:|---|
| `type` | Wajib | Salah satu dari 5 nilai §5.2 |
| `title` | Wajib | Judul singkat catatan, mis. "Pengajuan Hibah Tahap 1" |
| `amount` | Opsional | Kosong untuk catatan yang tidak punya nominal (mis. `other` yang sifatnya administratif) |
| `currency` | Opsional | Default `"IDR"` bila `amount` diisi |
| `recordDate` | Opsional | Tanggal dokumen/kejadian terkait (bukan `createdAt` — bisa berbeda, mis. input catatan telat dari tanggal invoice aslinya) |
| `description` | Opsional | Catatan bebas, mis. konteks/ringkasan |
| `referenceUrl` | Opsional | Link eksternal ke dokumen (lihat §2 Non-Tujuan soal upload file) |

### 5.2 Tipe Catatan (`type`)

| Value (enum) | Label UI | Deskripsi |
|---|---|---|
| `proposal` | Pengajuan | Dokumen/catatan pengajuan pendanaan yang diajukan (ke donor/lembaga/internal) |
| `grant` | Hibah | Catatan hibah/dana yang diterima |
| `funding_note` | Catatan Pendanaan | Catatan pendanaan umum yang tidak masuk kategori pengajuan/hibah/invoice spesifik |
| `invoice` | Invoice | Invoice terkait Project (masuk maupun keluar) |
| `other` | Lainnya | Catatan finansial lain di luar 4 kategori di atas |

---

## 6. User Flow

1. User dengan permission `project_finance.view` membuka halaman detail sebuah Project → tab **"Source of Fund"**.
2. Halaman menampilkan daftar Finance Record milik Project tsb, dengan filter tab per tipe (Semua/Pengajuan/Hibah/Catatan Pendanaan/Invoice/Lainnya) — mirroring pola filter status di Team Management (`PRD-Auth` §6.5).
3. User dengan permission `project_finance.create` klik **"Tambah Catatan"** → dialog: pilih tipe (wajib), judul (wajib), nominal + currency (opsional), tanggal (opsional), deskripsi (opsional), link referensi (opsional) → submit → catatan masuk daftar.
4. Klik satu Finance Record → lihat/edit detail (bila punya `project_finance.edit`).
5. User dengan permission `project_finance.delete` bisa menghapus catatan — **berbeda dari Project (§13 PRD lain yang mewajibkan arsip dulu)**: Finance Record boleh dihapus langsung dari status `active` (lihat alasan di §8 edge case), karena catatan finance individual bukan entitas berumur panjang seperti Project.
6. Berpindah Project (lewat navigasi Project, bukan Company Switcher) otomatis mengganti daftar Finance Record yang ditampilkan — selalu ter-scope ke `projectId` yang sedang dibuka.

---

## 7. Functional Requirements

Prioritas: **M** = Must have, **S** = Should have.

### FR-1 — CRUD Finance Record *(M)*
- Field sesuai §5.1; validasi `type` harus salah satu dari 5 enum §5.2.
- Hanya pemegang `project_finance.view` yang bisa melihat daftar & detail.
- Hanya pemegang `project_finance.create` yang bisa membuat catatan baru.
- Hanya pemegang `project_finance.edit` yang bisa mengubah catatan.
- Hanya pemegang `project_finance.delete` yang bisa menghapus catatan (tanpa syarat arsip dulu — lihat §6 poin 5).
- **AC:** Semua query Finance Record wajib divalidasi berlapis: (a) `requireCompanyContext` untuk keanggotaan Company, (b) `Project.companyId` cocok dengan Company aktif, (c) filter `projectId` sesuai Project yang diminta — tidak pernah menerima `projectId` mentah tanpa validasi langkah (b).
- **AC:** Finance Record dari Project A tidak pernah muncul saat mengakses endpoint dengan `projectId` milik Project B, meski di Company yang sama (404, bukan array kosong yang membingungkan — konsisten dengan pola 404 di `PRD-Company-Switching-Project-Module.md`).

### FR-2 — Filter per Tipe di UI *(S)*
- Halaman daftar Finance Record punya filter tab per tipe (§5.2) + "Semua".
- **AC:** Filter murni UI-side (client-side) atau lewat query param — tidak wajib endpoint terpisah per tipe.

### FR-3 — Registrasi Permission ke RBAC *(M)*
- Modul ini **wajib** mengikuti Module Registration Checklist di `PRD-Company-Switching-Project-Module.md` §7 secara penuh: permission didaftarkan di `src/lib/permissions.ts`, seed dijalankan ulang, endpoint dilindungi `can()`, dan otomatis muncul di matrix Roles & Permissions.
- **AC:** Setelah modul ini dibangun, Admin bisa membuat Custom Role baru (mis. "Finance Officer") yang hanya punya `project_finance.view` + `project_finance.create` + `project_finance.edit`, tanpa `project_finance.delete` dan tanpa permission modul lain — dan role ini bisa dipasangkan ke anggota Company seperti Custom Role lainnya (`PRD-Auth` §6.6).

---

## 8. Permission Catalog — Modul Baru `project_finance`

Menyambung tabel di `PRD-Auth` §9.2 dan `PRD-Company-Switching-Project-Module.md` §9:

| Modul | Permission Key | Deskripsi | Admin (default) | Member (default) |
|---|---|---|:---:|:---:|
| Finance (Source of Fund) | `project_finance.view` | Melihat daftar & detail Finance Record di sebuah Project | ✅ | ❌ |
| Finance (Source of Fund) | `project_finance.create` | Menambah Finance Record baru | ✅ | ❌ |
| Finance (Source of Fund) | `project_finance.edit` | Mengubah Finance Record | ✅ | ❌ |
| Finance (Source of Fund) | `project_finance.delete` | Menghapus Finance Record | ✅ | ❌ |

**Catatan desain penting — beda dari pola default Project/Knowledge Base:** modul `project` dan `knowledge_base` memberi Member akses **view-only** secara default (lihat `PRD-Auth` §9.2, `PRD-Company-Switching-Project-Module.md` §9). Modul Finance ini **sengaja tidak** — mengikuti pola `team_management`/`roles`/`company_settings` (Admin-only secara default), karena data pendanaan/finansial lazimnya lebih sensitif daripada konten kerja umum. Admin tetap bisa memberi Member (lewat Custom Role) akses `project_finance.view` bila memang dibutuhkan — ini asumsi desain, ditandai di §10 sebagai keputusan yang perlu dikonfirmasi bila tidak sesuai ekspektasi bisnis.

Contoh Custom Role yang jadi mungkin lewat katalog ini: **"Finance Officer"** = `project_finance.view` + `project_finance.create` + `project_finance.edit`, tanpa `project_finance.delete` dan tanpa permission modul lain (Team Management, Roles, dst).

---

## 9. Edge Cases & Error Handling

| Skenario | Perilaku yang Diharapkan |
|---|---|
| `type` yang dikirim di luar 5 enum §5.2 | Ditolak validasi (422), bukan disimpan sebagai teks bebas |
| `amount` diisi tapi `currency` kosong | Default ke `"IDR"` |
| Finance Record dari Project yang sudah `archived` (Project-nya, bukan record-nya) | Tetap bisa dilihat (read-only histori) — `project_finance.view` tidak diblokir oleh status arsip Project; `create`/`edit`/`delete` pada Finance Record milik Project yang sudah `archived` **ditolak** (Project arsip dianggap "selesai", tidak seharusnya menerima catatan baru) |
| User dengan `project_finance.view` tapi tanpa `project.view` | Skenario ini seharusnya tidak terjadi di UI normal (tab Finance ada di dalam halaman detail Project yang sudah mensyaratkan `project.view`) — tapi di level API, `project_finance.view` **tidak otomatis** memberi akses ke data Project itu sendiri (nama/deskripsi Project). Kedua permission independen; UI diasumsikan selalu mensyaratkan `project.view` untuk masuk ke halaman detail Project lebih dulu. |
| Menghapus Finance Record | Langsung terhapus permanen tanpa syarat arsip (beda dari Project di §6 PRD lain) — **keputusan desain**, karena Finance Record adalah catatan individual granular yang jauh lebih sering perlu dikoreksi/dihapus (mis. salah input) dibanding Project yang merupakan entitas struktural |

---

## 10. Pertanyaan Terbuka

1. **Default akses Member = tidak ada (§8) — perlu dikonfirmasi.** Apakah ini sesuai ekspektasi, atau justru Member harus bisa lihat (view-only) data Finance seperti pola modul lain, dan hanya create/edit/delete yang dibatasi ke Admin?
2. Apakah Finance Record butuh status lain selain `active`/`archived` (mis. workflow status khusus seperti "diajukan" → "cair" → "selesai" untuk tipe `proposal`/`grant`)? Saat ini FR-1 mengasumsikan status generik saja (§2 Non-Tujuan: bukan sistem approval).
3. Apakah dibutuhkan agregasi sederhana (mis. total nominal per tipe di satu Project) di fase ini, atau murni daftar seperti yang didefinisikan di §6? Saat ini diasumsikan murni daftar (§4.2 Non-Tujuan: tidak ada laporan/agregasi).
4. Format `referenceUrl` — perlu validasi bahwa itu benar-benar URL, atau bebas teks (untuk kasus user paste nama file/path lokal)?

---

## 11. Lampiran — Sketsa Endpoint (Non-Final)

Mengikuti pola URL Project Module di `PRD-Company-Switching-Project-Module.md` §14.3:

```
GET    /api/companies/:id/projects/:projectId/finance-records            — daftar (butuh project_finance.view)
POST   /api/companies/:id/projects/:projectId/finance-records            — buat baru (butuh project_finance.create)
GET    /api/companies/:id/projects/:projectId/finance-records/:recordId  — detail (butuh project_finance.view)
PATCH  /api/companies/:id/projects/:projectId/finance-records/:recordId  — ubah (butuh project_finance.edit)
DELETE /api/companies/:id/projects/:projectId/finance-records/:recordId  — hapus (butuh project_finance.delete)
```

---

**Langkah selanjutnya yang disarankan:** review §10 bersama stakeholder (terutama poin 1 soal default akses Member), lalu lanjut ke implementasi mengikuti Module Registration Checklist (`PRD-Company-Switching-Project-Module.md` §7): (1) migration `FinanceRecord` di `prisma/schema.prisma`, (2) tambahkan `project_finance.*` ke `src/lib/permissions.ts` + re-run seed, (3) API routes mengikuti §11, (4) tab "Source of Fund" di halaman detail Project + filter per tipe.
