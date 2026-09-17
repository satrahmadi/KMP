# PRD — Registrasi, Autentikasi, Company Onboarding & Team Management

**Produk:** Knowledge Management Platform (SaaS, multi-tenant)
**Modul:** Auth (Registrasi/Login/OTP), Company Onboarding, Team Management, RBAC (Role & Permission)
**Status:** Draft untuk direview — belum masuk tahap desain teknis/implementasi
**Versi:** 0.3 — menambahkan sistem RBAC penuh (role default/system + role custom per module) menggantikan role tetap Admin/Member sebagai satu-satunya pilihan

---

## 1. Ringkasan

Modul ini adalah **pintu masuk** ke seluruh produk KMP: bagaimana seseorang mendaftar, memverifikasi dirinya, membuat *tenant* (Company) miliknya, lalu mengundang rekan kerja untuk bergabung ke company tersebut. Tanpa modul ini berjalan benar, tidak ada tenant yang bisa mengisi knowledge base — jadi modul ini adalah prasyarat blocking untuk semua fitur KM lainnya.

Cakupan PRD ini: **Registrasi manual → Verifikasi OTP email → Login → Pembuatan Company → Team Management (invitation) → RBAC (Role Based Access Control): role default (Superadmin, Admin, Member) dan role custom yang bisa dibuat Admin dengan kombinasi izin per modul fitur**.

---

## 2. Latar Belakang & Tujuan

Produk ini akan dijual sebagai SaaS multi-tenant: satu instance platform melayani banyak organisasi (Company) yang datanya terisolasi satu sama lain. Setiap organisasi butuh cara mandiri untuk:

- Mendaftar tanpa perlu campur tangan sales/onboarding manual (*self-serve signup*).
- Memverifikasi bahwa pendaftar adalah pemilik email yang valid (mengurangi akun palsu/spam).
- Membentuk ruang kerja (Company) miliknya sendiri, terisolasi dari tenant lain.
- Mengajak rekan kerja bergabung tanpa perlu admin platform turun tangan.

Sementara itu, tim internal (operator platform) butuh **satu peran lintas-tenant (Superadmin)** untuk keperluan support, audit, dan operasional bisnis SaaS ini sendiri.

### Tujuan
- Alur registrasi → verifikasi → login yang aman dan tidak membingungkan (drop-off rendah).
- Setiap Company terisolasi datanya (multi-tenancy) sejak awal.
- Proses undang anggota tim semudah mungkin (invite by email, tanpa perlu OTP manual dari Admin).
- Superadmin punya visibilitas penuh untuk kebutuhan operasional platform, tanpa mengganggu isolasi data antar-tenant dalam alur kerja normal.

### Non-Tujuan (untuk fase ini)
- Login via SSO/Google/Microsoft (dicatat sebagai kandidat fase berikut).
- Billing/subscription plan per Company.
- Permission berbasis item/record spesifik (mis. "hanya boleh edit dokumen di folder X"). RBAC fase ini bekerja di level **modul fitur**, bukan level konten individual.
- Role custom yang bisa dibagikan/di-clone lintas Company (role marketplace/template publik).

---

## 3. Definisi & Istilah

| Istilah | Arti |
|---|---|
| **Company** | Satu tenant/organisasi dalam sistem. Semua knowledge base, anggota, dan pengaturan berada di dalam scope Company. |
| **RBAC (Role Based Access Control)** | Model otorisasi: setiap anggota Company diberi satu **Role**, dan Role tsb. adalah kumpulan **Permission**. Akses ditentukan lewat Role yang disandang, bukan lewat properti user secara langsung. |
| **Permission** | Izin atomik untuk melakukan satu **aksi** pada satu **modul** fitur, mis. `team_management.invite_member` atau `knowledge_base.publish_content`. Permission didaftarkan oleh setiap modul/fitur yang dibangun — katalognya bertambah seiring fitur baru dirilis. |
| **Module** | Kelompok fitur yang punya permission sendiri, mis. *Team Management*, *Company Settings*, *Knowledge Base*. Setiap module baru yang dibangun wajib mendaftarkan permission-nya sendiri agar otomatis bisa dipilih saat membuat/mengedit Role. |
| **System Role** | Role bawaan platform: **Admin** dan **Member**. Selalu tersedia di setiap Company, tidak bisa dihapus/diganti nama, dan permission-nya tetap (Admin = akses penuh ke semua modul; Member = view-only). |
| **Custom Role** | Role yang dibuat sendiri oleh Admin di dalam Company-nya, dengan nama bebas dan kombinasi permission per modul yang dipilih manual (mis. "Editor Konten" yang boleh create/edit konten KM tapi tidak boleh invite anggota). |
| **Admin** | System Role dengan akses penuh (create/read/update/delete) ke seluruh modul di Company miliknya, termasuk mengelola Role & Permission itu sendiri. Diberikan otomatis ke pembuat Company. |
| **Member** | System Role default untuk pengguna yang diundang, bila Admin tidak memilih role lain saat invite. Akses **view-only** ke seluruh modul yang tersedia. |
| **Superadmin** | Peran level-platform (bukan level-company), berada **di luar** sistem Role/Permission per-company. Dapat melihat seluruh Company dan seluruh User, serta memiliki kewenangan operasional (suspend/aktifkan Company atau User, membuat User baru secara langsung). Tidak dibuat lewat signup publik. |
| **OTP** | One-Time Password 6 digit, dikirim ke email, berlaku singkat. Dipakai untuk (a) verifikasi kepemilikan email saat registrasi, dan (b) sebagai langkah wajib kedua setiap kali login (2FA berbasis email). |
| **Company Switcher** | Komponen UI di side panel, tepat di bawah logo, tempat user memilih Company mana yang sedang aktif ia kerjakan — muncul bila user tergabung di lebih dari satu Company. |
| **Invitation** | Undangan berbasis email + token unik, dikirim Admin/pemegang Role berwenang ke calon anggota Company, membawa sebuah Role (system atau custom) yang akan otomatis melekat saat undangan diterima. |

---

## 4. Peran Pengguna (Roles) & Model RBAC

Sistem ini menggunakan **RBAC (Role Based Access Control)**: akses tidak dicek langsung dari "apakah dia Admin", melainkan dari **permission apa saja yang dimiliki Role yang sedang disandang user di Company yang aktif**. Ini memungkinkan Admin membuat Role baru kapan pun tanpa perlu perubahan kode setiap kali kebutuhan tim berubah.

### 4.1 Dua Kategori Role

| Kategori | Siapa yang membuat | Bisa diubah/dihapus? | Contoh |
|---|---|---|---|
| **System Role** | Platform (bawaan, otomatis ada di setiap Company) | Tidak — nama & isi permission tetap | Admin, Member |
| **Custom Role** | Admin, di dalam Company miliknya, lewat menu Roles & Permissions | Ya — bisa diedit/di-nonaktifkan/dihapus kapan saja oleh Admin | mis. "Editor Konten", "Reviewer SOP", "Kontributor Riset" |

### 4.2 Role Tingkat Platform (di luar RBAC per-company)

| Role | Level | Dibuat lewat | Kemampuan Inti |
|---|---|---|---|
| **Superadmin** | Platform (global) | Provisioning internal (bukan signup publik) | Melihat seluruh Company & seluruh User; suspend/aktifkan Company atau User; membuat User baru secara langsung; akses data lintas-tenant untuk keperluan support/operasional |

### 4.3 System Role Bawaan (ada di setiap Company)

| Role | Dibuat lewat | Kemampuan Inti |
|---|---|---|
| **Admin** | Otomatis saat user membuat Company | Akses penuh (create/read/update/delete) ke **seluruh modul**, termasuk modul Roles & Permissions itu sendiri (bisa membuat/mengedit/menghapus Custom Role) |
| **Member** | Role default saat invite, bila Admin tidak memilih role lain | Akses **view-only** ke seluruh modul yang tersedia; tidak bisa mengelola anggota, Company, atau Role |

### 4.4 Custom Role

Admin dapat membuat Role baru dengan nama bebas, lalu memilih kombinasi permission dari **katalog permission per modul** (lihat §9.2) — misalnya sebuah Role "Editor Konten" yang boleh create/edit konten Knowledge Base tapi tidak boleh mengundang anggota atau mengubah pengaturan Company. Role ini kemudian bisa dipasangkan ke anggota mana pun di Company tsb., persis seperti System Role.

**Prinsip penting:** setiap kali sebuah modul/fitur baru dibangun di platform ini (bukan hanya fitur di PRD ini), modul tsb. **wajib mendaftarkan permission-nya sendiri** ke katalog terpusat, sehingga otomatis muncul sebagai pilihan saat Admin membuat/mengedit Custom Role — tanpa perlu mengubah struktur Role/Permission yang sudah ada.

Catatan penting lainnya:
- **Role (system maupun custom) di-scope per Company.** Satu user bisa punya Role berbeda di Company berbeda (mis. Admin di Company A yang ia buat sendiri, sekaligus Role custom "Reviewer" di Company B tempat ia diundang) — lihat §6.3 Company Switcher.
- Superadmin adalah role terpisah yang **tidak** memiliki company (atau berada di luar konsep company sama sekali) dan **tidak** memakai mekanisme Role/Permission per-company di atas — perannya murni operasional platform.

---

## 5. Ruang Lingkup

### 5.1 Termasuk dalam Fase Ini
1. Registrasi manual (form: nama, email, password).
2. Pengiriman & verifikasi OTP via email.
3. Login (email + password, **dilanjutkan verifikasi OTP email sebagai langkah wajib kedua di setiap login**).
4. Lupa password (reset via link/OTP email) — *ditambahkan sebagai kebutuhan implisit dari alur login, lihat FR-4*.
5. Pembuatan Company (form: nama company, dan field dasar lain) tepat setelah registrasi/login pertama kali, bila user belum tergabung/membuat Company manapun.
6. **Company Switcher**: memilih Company aktif dari side panel (di bawah logo) bila user tergabung di lebih dari satu Company.
7. Menu **Team Management**: undang anggota by email (memilih Role dari daftar System Role + Custom Role, default Member/view-only), lihat daftar anggota & status undangan, ubah role, hapus/nonaktifkan anggota.
8. Alur penerimaan undangan, baik untuk email yang **sudah** punya akun maupun **belum** punya akun di platform.
9. **Menu Roles & Permissions**: melihat System Role (Admin, Member — read-only), membuat/mengedit/menghapus Custom Role dengan memilih permission per modul lewat matrix UI.
10. RBAC penuh: seluruh pengecekan akses (Team Management, Company Settings, dan modul-modul yang akan dibangun berikutnya) berjalan lewat permission yang melekat pada Role user, bukan pengecekan role hard-coded.
11. Console Superadmin: melihat daftar seluruh Company dan seluruh User, **serta kewenangan tulis**: suspend/aktifkan Company, suspend/aktifkan User, dan membuat User baru secara langsung.

### 5.2 Tidak Termasuk (Out of Scope)
- SSO / social login.
- Billing, subscription tier, payment.
- Permission spesifik-fitur untuk modul Knowledge Management itu sendiri (tagging, search, dsb — daftar permission modul KM akan didefinisikan saat PRD modul KM tsb. dibuat; PRD ini hanya menyiapkan **mekanisme RBAC**-nya).
- Custom Role yang bisa dibagikan/di-clone lintas Company.
- Permission berbasis item/record individual (row-level), RBAC fase ini bekerja di level modul.
- Multi-level approval untuk invitation.
- Audit log UI (pencatatan boleh disiapkan di data model, tapi UI-nya di luar fase ini).

---

## 6. User Flow

### 6.1 Registrasi & Verifikasi OTP
1. User mengisi form registrasi (nama, email, password).
2. Sistem membuat akun dengan status `unverified`, mengirim OTP 6-digit ke email yang didaftarkan.
3. User memasukkan OTP di halaman verifikasi.
4. Jika OTP benar & belum kedaluwarsa → akun menjadi `verified`, user otomatis login (atau diarahkan ke halaman login — *lihat §12 untuk keputusan ini*).
5. Jika OTP salah 3x berturut-turut atau kedaluwarsa → user bisa klik "Kirim ulang OTP" (dengan cooldown/anti-spam, lihat §10).

### 6.2 Login
1. User memasukkan email + password.
2. Jika email belum diverifikasi (akun baru yang belum menuntaskan OTP registrasi) → sistem menolak login, arahkan ke alur verifikasi OTP registrasi (kirim ulang OTP otomatis).
3. Jika akun berstatus `suspended` (di-suspend Superadmin) → login ditolak dengan pesan "akun dinonaktifkan, hubungi administrator", tidak ada opsi self-service.
4. Jika kredensial (email + password) valid → sistem mengirim **OTP login** ke email terdaftar, user diarahkan ke halaman input OTP (langkah ini wajib di **setiap** login, bukan hanya login pertama).
5. User memasukkan OTP login. Jika benar & belum kedaluwarsa → sesi login dibuat.
6. Setelah sesi login terbentuk, sistem mengecek keanggotaan Company user:
   - **Belum tergabung di Company manapun** → arahkan ke alur "Buat Company".
   - **Tergabung di tepat satu Company** (dan Company tsb. berstatus aktif) → langsung masuk ke dashboard Company tsb.
   - **Tergabung di lebih dari satu Company** → masuk ke Company yang terakhir aktif digunakan (atau Company pertama bila belum ada riwayat), dengan Company Switcher tersedia untuk berpindah — lihat §6.3.
   - Bila Company yang dituju berstatus `suspended` → tampilkan pesan "Company ini sedang dinonaktifkan" dan (bila user tergabung di company lain yang aktif) arahkan ke company tsb. lewat switcher.

### 6.3 Berpindah Antar Company (Company Switcher)
1. Setelah login, side panel menampilkan nama Company yang sedang aktif tepat di bawah logo, dengan kontrol untuk membuka daftar seluruh Company tempat user menjadi anggota (Admin maupun Member).
2. User memilih Company lain dari daftar tsb. → seluruh konteks kerja (dashboard, data KM, menu yang terlihat) berpindah mengikuti role user **di Company yang baru dipilih** (role bisa berbeda antar Company).
3. Company yang berstatus `suspended` tetap muncul di daftar namun ditandai non-aktif/tidak bisa dipilih.
4. Bila user hanya tergabung di satu Company, kontrol switcher tidak menampilkan opsi pindah (cukup menampilkan nama Company saat ini).

### 6.4 Pembuatan Company
1. User yang belum punya Company mengisi form: nama Company (wajib), dan field dasar lain (mis. industri/tipe organisasi — opsional).
2. Sistem membuat record Company baru, menetapkan user tersebut sebagai **Admin** dari Company itu.
3. User diarahkan ke dashboard Company (kosong, siap diisi tim & konten).

### 6.5 Team Management — Mengundang Anggota
1. Admin membuka menu **Team Management** di dalam Company-nya.
2. Admin memasukkan satu atau beberapa alamat email untuk diundang, memilih **Role** untuk masing-masing dari dropdown berisi System Role (Admin, Member) **dan** seluruh Custom Role yang sudah dibuat di Company tsb. Bila tidak dipilih, default ke Member.
3. Sistem membuat record `Invitation` (status `pending`, menyimpan `role_id` yang dipilih) dan mengirim email undangan berisi tautan unik (token).
4. Admin dapat melihat daftar undangan (`pending`/`accepted`/`expired`/`revoked`), mengirim ulang, atau membatalkan undangan yang masih `pending`.

### 6.6 Mengelola Role & Permission (Roles & Permissions)
1. Admin membuka menu **Roles & Permissions** di dalam Company-nya (dapat berupa tab di bawah Team Management).
2. Halaman menampilkan dua System Role (**Admin**, **Member**) sebagai referensi read-only — nama dan permission-nya tidak bisa diubah — beserta daftar Custom Role yang sudah dibuat.
3. Admin memilih **"Buat Role Baru"** → mengisi nama Role → menandai permission yang diaktifkan lewat matrix per modul (mis. modul *Team Management*: `view_members`, `invite_member`; modul *Knowledge Base*: `view_content`, `create_content`, dst — katalog lengkap lihat §9.2).
4. Role baru langsung tersedia untuk dipasangkan ke anggota, baik lewat undangan baru (§6.5) maupun lewat mengubah role anggota yang sudah aktif.
5. Admin dapat mengedit permission Custom Role kapan saja — perubahan berlaku **langsung** ke semua anggota yang sedang memegang Role tsb (lihat efek di §11).
6. Admin dapat menghapus Custom Role. Jika masih ada anggota yang memegang Role tsb., sistem meminta Admin memilih Role pengganti untuk anggota-anggota itu sebelum penghapusan diproses (tidak boleh ada anggota tanpa Role).

### 6.7 Penerimaan Undangan
- **Kasus A — Email belum punya akun:** klik tautan undangan → diarahkan ke form registrasi ringkas (nama, password; email sudah terisi dari undangan) → verifikasi OTP → otomatis bergabung ke Company pengundang dengan Role sesuai undangan (tidak perlu membuat Company baru).
- **Kasus B — Email sudah punya akun:** klik tautan undangan → diminta login (jika belum) → begitu login, otomatis bergabung ke Company pengundang dengan Role sesuai undangan.
- Undangan punya masa berlaku (mis. 7 hari); setelah lewat, status menjadi `expired` dan tidak bisa dipakai (Admin bisa mengirim ulang untuk membuat token baru).
- Bila Custom Role yang tertaut ke undangan sudah dihapus sebelum undangan diterima, sistem jatuh kembali ke Role **Member** dan mencatat perubahan ini agar Admin tahu.

---

## 7. Functional Requirements

Prioritas: **M** = Must have, **S** = Should have.

### FR-1 — Registrasi Manual *(M)*
- Field wajib: nama lengkap, email, password (+ konfirmasi password).
- Validasi: format email, kekuatan password minimum (lihat §10), email belum terdaftar sebelumnya (unik).
- Akun baru berstatus `unverified` sampai OTP berhasil diverifikasi.
- **AC:** Jika email sudah terdaftar & terverifikasi → tampilkan error "email sudah digunakan, silakan login". Jika email terdaftar tapi belum terverifikasi → tawarkan kirim ulang OTP, bukan membuat akun duplikat.

### FR-2 — Verifikasi OTP Email *(M)*
- OTP 6 digit numerik, dikirim ke email pendaftar.
- Masa berlaku OTP: **10 menit** (dapat dikonfigurasi).
- Maksimum **5 kali percobaan salah** per OTP sebelum harus request OTP baru.
- Tombol "kirim ulang" dengan cooldown 60 detik antar-permintaan.
- **AC:** OTP hanya bisa dipakai sekali (single-use); OTP lama otomatis invalid begitu OTP baru diterbitkan untuk user/tujuan yang sama.

### FR-3 — Login (dengan OTP wajib) *(M)*
- Login dua langkah: (1) email + password, (2) OTP email — **OTP wajib di setiap login**, bukan hanya login pertama.
- Menolak login untuk akun `unverified`, dengan pesan jelas + opsi kirim ulang OTP registrasi.
- Menolak login untuk akun `suspended`, dengan pesan "akun dinonaktifkan, hubungi administrator" (tanpa opsi self-service).
- OTP login memakai aturan yang sama dengan §FR-2 (masa berlaku, batas percobaan, cooldown kirim ulang), dengan `purpose = login_verification` agar terpisah dari OTP registrasi.
- Sesi login (token/session cookie) baru dibentuk **setelah** OTP login berhasil diverifikasi, dengan masa berlaku yang wajar (lihat §10).
- **AC:** Percobaan login gagal berulang pada satu akun (baik salah password maupun salah OTP) dibatasi (rate limit) untuk mencegah brute-force.
- **AC:** Password benar tetapi OTP tidak pernah dimasukkan → tidak ada sesi yang terbentuk (tidak ada "login parsial" yang tetap memberi akses).

### FR-4 — Lupa & Reset Password *(M)*
- User meminta reset lewat email → sistem kirim kode OTP atau tautan reset bertoken.
- Reset password mengharuskan konfirmasi password baru, dan otomatis mengakhiri seluruh sesi login aktif lain.

### FR-5 — Pembuatan Company *(M)*
- Hanya bisa dilakukan oleh user yang sudah login & terverifikasi, dan belum memiliki Company *(bergantung keputusan §12 soal multi-company)*.
- User pembuat otomatis menjadi Admin Company tersebut.
- Nama Company harus diisi; sistem menghasilkan identifier unik (mis. slug) untuk keperluan URL/internal.
- **AC:** Satu akun tidak bisa membuat dua Company secara bersamaan dalam satu alur onboarding — proses ini adalah langkah wajib sebelum masuk dashboard.

### FR-6 — Team Management: Undang Anggota *(M)*
- Hanya pemegang permission `team_management.invite_member` (secara default: Admin) yang bisa mengakses aksi ini.
- Input: email calon anggota + **Role** yang akan diberikan, dipilih dari System Role dan/atau Custom Role yang tersedia di Company tsb. **Default role saat invite adalah Member (view-only)** bila tidak dipilih.
- Mendukung undangan lebih dari satu email sekaligus (bulk invite), masing-masing boleh diberi Role berbeda.
- Menampilkan daftar seluruh anggota aktif (beserta Role-nya) + seluruh undangan beserta statusnya.
- Pemegang permission terkait dapat: kirim ulang undangan, batalkan undangan `pending`, hapus anggota aktif, mengubah Role anggota aktif (ke System Role maupun Custom Role manapun di Company tsb.).
- **AC:** Tidak bisa mengundang email yang sudah menjadi anggota aktif di Company yang sama (tampilkan pesan, bukan membuat undangan duplikat).
- **AC:** Company tidak boleh berakhir tanpa Admin sama sekali — sistem mencegah penghapusan/penurunan role Admin terakhir (System Role Admin, bukan Custom Role apa pun) di sebuah Company.

### FR-7 — Penerimaan Undangan *(M)*
- Mendukung dua kasus di §6.7 (user baru & user existing), keduanya berujung pada `CompanyMember` baru dengan `role_id` sesuai `Invitation.role_id`.
- Token undangan unik, single-use, kedaluwarsa setelah durasi tertentu (default 7 hari).
- **AC:** Membuka tautan undangan yang sudah `expired`/`revoked`/`accepted` menampilkan pesan yang jelas (bukan error generik), dengan opsi bagi pengundang untuk mengirim ulang.
- **AC:** Bila Role yang tertaut ke undangan sudah dihapus sebelum diterima, sistem jatuh ke Role Member (lihat §6.7).

### FR-8 — RBAC Engine (Otorisasi Berbasis Role & Permission) *(M)*
- Setiap anggota Company memiliki tepat satu Role aktif per Company (System Role atau Custom Role), disimpan sebagai `role_id` di `CompanyMember`.
- Setiap aksi yang dilindungi di backend (endpoint/menu/tombol) dipetakan ke satu **permission key** (`module.action`). Otorisasi dilakukan dengan mengecek apakah Role user memiliki permission key tsb — **bukan** mengecek nama role secara hard-coded (mis. `if role == 'admin'`).
- Superadmin **tidak** tunduk pada pengecekan RBAC per-Company ini — otorisasinya memakai jalur terpisah (flag `is_superadmin`, lihat FR-9).
- Setiap request ke data ber-scope Company tetap wajib divalidasi terhadap keanggotaan user di Company tersebut (isolasi tenant), sebelum pengecekan permission dilakukan.
- **AC:** Menghapus/menonaktifkan satu permission dari sebuah Role langsung berlaku ke semua pemegang Role tsb pada request berikutnya (tidak perlu logout/login ulang) — lihat §11 untuk penanganan sesi yang sedang berjalan.
- **AC:** Modul baru yang ditambahkan ke platform mendaftarkan permission-nya sendiri ke katalog (§9.2) tanpa mengubah skema `Role`/`CompanyMember` yang sudah ada (lihat FR-12).

### FR-12 — Manajemen Role & Permission (Roles & Permissions) *(M)*
- Menu diakses oleh pemegang permission `roles.manage` (secara default: Admin).
- Menampilkan System Role (Admin, Member) sebagai referensi read-only, dan daftar Custom Role Company tsb (nama, jumlah anggota yang memegangnya, ringkas permission).
- **Buat Custom Role:** isi nama (wajib, unik dalam satu Company) + opsional deskripsi, lalu pilih permission lewat matrix bergroup per modul (checkbox per `module.action`).
- **Edit Custom Role:** ubah nama/deskripsi/permission kapan saja.
- **Hapus Custom Role:** bila masih dipegang ≥1 anggota, wajib memilih Role pengganti terlebih dulu (lihat §6.6 poin 6).
- **AC:** Nama Custom Role tidak boleh sama dengan nama System Role (`Admin`/`Member`) maupun Custom Role lain di Company yang sama.
- **AC:** Custom Role yang baru dibuat langsung muncul sebagai pilihan di dropdown invite (FR-6) dan di halaman ubah role anggota, tanpa perlu reload/deploy.

### FR-13 — Assign / Ubah Role Anggota *(M)*
- Dari daftar anggota di Team Management, pemegang permission `team_management.manage_roles` dapat mengubah Role seorang anggota aktif ke Role lain (System atau Custom) yang tersedia di Company tsb.
- **AC:** Tidak bisa mengubah Role anggota terakhir yang memegang System Role Admin menjadi Role lain (lihat aturan "≥1 Admin" di FR-6).
- **AC:** Perubahan Role berlaku langsung terhadap akses anggota tsb (lihat FR-8, §11).

### FR-9 — Superadmin Console: Visibilitas *(M)*
- Superadmin dapat melihat daftar seluruh Company (nama, jumlah anggota, tanggal dibuat, status aktif/suspended) dan seluruh User (email, status verifikasi, status aktif/suspended, daftar company yang diikuti beserta role di masing-masing).
- Akun Superadmin **tidak dibuat lewat form registrasi publik** — diprovisikan langsung di database/lewat proses internal (mis. seed/admin tool terpisah), atau lewat FR-11 (superadmin lain membuatkan).
- Superadmin **tidak otomatis** menjadi anggota seluruh Company — ia melihat lewat console khusus, bukan lewat keanggotaan Company biasa; sehingga tidak tunduk pada isolasi tenant di FR-8.

### FR-10 — Company Switcher *(M)*
- Side panel menampilkan Company yang sedang aktif tepat di bawah logo; elemen ini dapat dibuka untuk menampilkan seluruh Company tempat user terdaftar sebagai anggota (Admin atau Member).
- Memilih Company lain mengganti seluruh konteks kerja aktif (data KM, menu yang tampil sesuai role di company tsb.) tanpa perlu logout/login ulang.
- Company berstatus `suspended` tetap tampil di daftar namun non-selectable, ditandai jelas (mis. label "Nonaktif").
- **AC:** Bila user hanya anggota satu Company, tidak ada opsi pindah yang ditampilkan (hindari UI kosong/membingungkan).
- **AC:** Berpindah Company tidak mengubah sesi login (tidak perlu OTP ulang) — hanya mengubah `company_id` yang aktif di konteks kerja.

### FR-11 — Superadmin Console: Aksi Kelola *(M)*
- Superadmin dapat **suspend** dan **aktifkan kembali** sebuah Company. Saat `suspended`: seluruh anggota Company tersebut kehilangan akses ke data Company itu (lihat §11), namun data tidak dihapus (soft-suspend, reversibel).
- Superadmin dapat **suspend** dan **aktifkan kembali** sebuah User. Saat `suspended`: user tidak bisa login sama sekali di company manapun ia tergabung, sesi aktif yang ada langsung diakhiri.
- Superadmin dapat **membuat User baru secara langsung** (di luar alur self-registrasi publik), dengan email wajib terverifikasi otomatis (tanpa OTP) — mekanisme set password awal (mis. tautan set-password terkirim ke email user) mengikuti §12 poin baru.
- **AC:** Setiap aksi suspend/aktifkan/create oleh Superadmin tercatat di audit trail minimum (§10) — siapa Superadmin yang melakukan, kapan, terhadap entitas apa.
- **AC:** Superadmin tidak dapat men-suspend dirinya sendiri melalui console ini (mencegah lockout tidak sengaja).

---

## 8. Data Model (High-Level)

Belum berupa skema database final — ini peta entitas untuk menyelaraskan pemahaman sebelum desain teknis.

**User**
`id, name, email (unique), password_hash, email_verified_at, status (unverified/active/suspended), is_superadmin (bool), created_by (User.id, nullable — terisi bila dibuat langsung oleh Superadmin via FR-11), created_at`

**Company**
`id, name, slug (unique), created_by (User.id), status (active/suspended), suspended_at, suspended_by (User.id, nullable), created_at`

**CompanyMember** *(tabel penghubung User ↔ Company, many-to-many)*
`id, company_id, user_id, role_id (FK → Role), status (active/removed), invited_by, joined_at`

**Invitation**
`id, company_id, email, role_id (FK → Role), token (unique), invited_by (User.id), status (pending/accepted/expired/revoked), expires_at, created_at`

**OTP**
`id, user_id (nullable jika untuk email yang belum jadi user), email, code_hash, purpose (registration/login_verification/password_reset), expires_at, attempt_count, consumed_at`

**Role**
`id, company_id (nullable — NULL berarti System Role global, terisi berarti Custom Role milik company tsb), name, description, type (system/custom), created_by (User.id, nullable untuk system role), created_at, updated_at`

**Permission** *(katalog statis, didaftarkan oleh kode tiap modul — bukan dibuat lewat UI)*
`id, module (mis. "team_management", "company_settings", "knowledge_base"), action (mis. "view", "create", "edit", "delete", "invite_member"), key (unik, gabungan module.action), label, description`

**RolePermission** *(tabel penghubung Role ↔ Permission, many-to-many)*
`role_id (FK → Role), permission_id (FK → Permission)` — composite primary key

> Catatan:
> - `CompanyMember` sebagai tabel terpisah (bukan field `company_id` langsung di `User`) sengaja dipilih untuk mengakomodasi **satu user tergabung di lebih dari satu Company** (dikonfirmasi — lihat §6.3 Company Switcher). "Company aktif" yang sedang dikerjakan user disimpan sebagai konteks sesi (mis. klaim di session/token, bukan kolom permanen di `User`), sehingga berpindah company tidak memerlukan login ulang.
> - Saat `CompanyMember.role_id` atau `Invitation.role_id` diisi, sistem wajib memvalidasi: `Role.company_id IS NULL` (System Role, berlaku untuk semua company) **atau** `Role.company_id = CompanyMember.company_id` (Custom Role milik company yang sama) — mencegah Role dari satu Company terpasang ke anggota Company lain.
> - Dua baris System Role (`Admin`, `Member`) cukup dibuat sekali secara global (`company_id = NULL`), tidak perlu di-duplikasi per Company.

---

## 9. RBAC: Permission Matrix & Katalog

### 9.1 Baseline System Role (tetap, tidak bisa diubah)

Tabel ini hanya berlaku untuk dua System Role. Kombinasi izin untuk Custom Role bersifat dinamis — ditentukan Admin sendiri lewat menu Roles & Permissions (§6.6/FR-12), memakai permission dari katalog §9.2.

| Aksi | Superadmin | Admin (System Role) | Member (System Role) |
|---|:---:|:---:|:---:|
| Registrasi & login (email + password + OTP) | – | ✅ | ✅ |
| Membuat Company baru | – | ✅ | ✅ *(user manapun boleh membuat company baru; menjadi Admin di company itu)* |
| Berpindah antar Company via Company Switcher | – | ✅ | ✅ |
| Melihat data Company & User **di seluruh platform** | ✅ | ❌ | ❌ |
| Melihat/edit pengaturan Company miliknya | – | ✅ | ❌ |
| Mengundang / menghapus anggota | – | ✅ | ❌ |
| Membuat/mengedit/menghapus Custom Role | – | ✅ | ❌ |
| Mengubah role anggota lain | – | ✅ | ❌ |
| Melihat konten/fitur Knowledge Management di company tsb. | – | ✅ | ✅ |
| Membuat / mengedit / menghapus konten KM di company tsb. | – | ✅ | ❌ *(view-only)* |
| Keluar dari Company | – | ✅ *(jika bukan Admin terakhir)* | ✅ |
| Suspend / aktifkan Company | ✅ | ❌ | ❌ |
| Suspend / aktifkan User | ✅ | ❌ | ❌ |
| Membuat User baru secara langsung | ✅ | ❌ | ❌ |

### 9.2 Katalog Permission per Modul (awal)

Katalog ini adalah titik awal, akan bertambah setiap kali modul baru (mis. modul-modul Knowledge Management dari rancangan sistem sebelumnya) dibangun — setiap modul baru wajib mendaftarkan permission-nya sendiri di sini agar otomatis tersedia untuk Custom Role.

| Modul | Permission Key | Deskripsi | Dimiliki Admin (default) | Dimiliki Member (default) |
|---|---|---|:---:|:---:|
| Team Management | `team_management.view_members` | Melihat daftar anggota & undangan | ✅ | ❌ |
| Team Management | `team_management.invite_member` | Mengundang anggota baru | ✅ | ❌ |
| Team Management | `team_management.remove_member` | Menghapus/menonaktifkan anggota | ✅ | ❌ |
| Team Management | `team_management.manage_roles` | Mengubah role anggota | ✅ | ❌ |
| Roles & Permissions | `roles.view` | Melihat daftar Role & isi permission-nya | ✅ | ❌ |
| Roles & Permissions | `roles.manage` | Membuat/mengedit/menghapus Custom Role | ✅ | ❌ |
| Company Settings | `company_settings.view` | Melihat pengaturan Company | ✅ | ❌ |
| Company Settings | `company_settings.edit` | Mengubah pengaturan Company | ✅ | ❌ |
| Knowledge Base *(placeholder, detail final di PRD modul KM)* | `knowledge_base.view_content` | Melihat konten KM | ✅ | ✅ |
| Knowledge Base *(placeholder)* | `knowledge_base.create_content` | Membuat konten KM baru | ✅ | ❌ |
| Knowledge Base *(placeholder)* | `knowledge_base.edit_content` | Mengedit konten KM | ✅ | ❌ |
| Knowledge Base *(placeholder)* | `knowledge_base.delete_content` | Menghapus konten KM | ✅ | ❌ |
| Knowledge Base *(placeholder)* | `knowledge_base.publish_content` | Mempublikasikan konten dari draf ke final | ✅ | ❌ |

Contoh Custom Role yang menjadi mungkin lewat katalog ini: **"Kontributor KM"** = `knowledge_base.view_content` + `knowledge_base.create_content` + `knowledge_base.edit_content`, tanpa `delete_content`/`publish_content`, dan tanpa satu pun permission modul Team Management/Roles/Company Settings.

---

## 10. Non-Functional Requirements

- **Keamanan password:** minimum 8 karakter, kombinasi huruf & angka; hash dengan algoritma standar industri (bcrypt/argon2), tidak pernah disimpan/di-log plaintext.
- **OTP:** disimpan dalam bentuk hash, bukan plaintext; rate limit pengiriman (mis. maks. 5 permintaan OTP per email per jam).
- **Rate limiting login:** maks. percobaan gagal per akun/IP dalam rentang waktu tertentu sebelum lockout sementara.
- **Isolasi data tenant:** setiap query data ber-scope Company wajib memfilter berdasarkan `company_id` sesuai keanggotaan user yang sedang login (dicegah lewat middleware/authorization layer, bukan hanya validasi UI).
- **Deliverability email:** OTP & undangan harus terkirim < 30 detik pada kondisi normal; gunakan email service dengan reputasi domain terjaga (hindari masuk folder spam).
- **Audit trail minimum:** setiap perubahan role/keanggotaan (invite, accept, remove, ubah role) tercatat dengan pelaku & waktu, meski UI audit log di luar scope fase ini.
- **Session:** token login punya masa berlaku & mekanisme refresh; logout menghapus sesi di sisi server (bukan hanya sisi klien).
- **OTP wajib setiap login — dampak UX & keandalan:** karena OTP kini menjadi bagian dari setiap login (bukan hanya sekali saat registrasi), keandalan pengiriman email menjadi kritis terhadap kemampuan user login sehari-hari (bukan cuma onboarding). Perlu jalur dukungan cepat untuk kasus "tidak menerima OTP saat mau login" (lihat juga metrik §13).
- **Efek suspend real-time:** suspend Company/User oleh Superadmin harus langsung mengakhiri sesi aktif terkait (bukan menunggu sesi lama kedaluwarsa secara alami), agar akses benar-benar terputus seketika.
- **Konsistensi & performa pengecekan permission:** karena hampir setiap request akan melewati pengecekan RBAC, permission efektif suatu user (hasil join Role→RolePermission→Permission) sebaiknya di-cache per sesi/request dan diinvalidasi begitu Role atau permission-nya diubah — bukan query berat berulang di setiap request, tapi juga tidak boleh stale (§11: perubahan permission harus berlaku di request berikutnya).
- **Extensibility katalog Permission:** menambah `module.action` baru (untuk fitur yang belum ada) tidak boleh mengubah data Role/RolePermission yang sudah ada — Custom Role lama otomatis tidak memiliki permission baru tsb sampai Admin mengaktifkannya secara eksplisit (default aman: fail-closed, bukan fail-open).

---

## 11. Edge Cases & Error Handling

| Skenario | Perilaku yang Diharapkan |
|---|---|
| Registrasi dengan email yang sudah aktif | Tolak, arahkan ke login |
| Registrasi dengan email yang `unverified` (belum selesai OTP) | Tawarkan kirim ulang OTP, jangan buat akun baru |
| OTP kedaluwarsa saat submit | Tampilkan pesan spesifik + tombol kirim ulang, bukan error generik |
| Login sebelum email diverifikasi | Blokir, arahkan ke alur verifikasi |
| Invite ke email yang sudah jadi anggota aktif | Tolak dengan pesan jelas, tidak membuat invitation baru |
| Invite ke email yang sudah punya invitation `pending` lain di company yang sama | Perbarui/perpanjang invitation lama, atau tolak duplikasi (perlu keputusan produk) |
| Admin menghapus dirinya sendiri sebagai satu-satunya Admin | Tolak — Company wajib punya ≥1 Admin aktif |
| Klik tautan undangan yang sudah `accepted` sebelumnya | Tampilkan pesan "undangan sudah digunakan", arahkan ke login |
| User mencoba akses data Company lain lewat manipulasi URL/ID | Ditolak di authorization layer (403), bukan hanya disembunyikan di UI |
| Member mencoba aksi create/update/delete konten KM lewat manipulasi request | Ditolak di authorization layer (403) — pembatasan view-only ditegakkan di backend, bukan hanya disembunyikan di UI |
| Password benar, tapi OTP login tidak diinput/kedaluwarsa/salah berkali-kali | Tidak ada sesi terbentuk; tampilkan opsi kirim ulang OTP; terapkan rate limit sesuai §10 |
| Superadmin men-suspend Company saat anggotanya sedang aktif menggunakan sistem | Sesi seluruh anggota Company tsb. langsung diakhiri; percobaan akses berikutnya menampilkan "Company ini sedang dinonaktifkan" |
| Superadmin men-suspend User yang sedang login di company manapun | Seluruh sesi aktif user tsb. langsung diakhiri; percobaan login berikutnya ditolak dengan pesan akun dinonaktifkan |
| User dengan satu-satunya company yang ia ikuti berstatus `suspended` | Setelah login (lolos OTP), tampilkan halaman khusus "Company dinonaktifkan, hubungi administrator" — tidak ada company lain untuk dialihkan |
| Superadmin mencoba men-suspend akun Superadmin miliknya sendiri | Ditolak oleh sistem (cegah self-lockout) |
| Admin menghapus Custom Role yang masih dipegang ≥1 anggota | Sistem meminta Role pengganti terlebih dulu sebelum menghapus (tidak ada anggota tanpa Role) |
| Admin mengubah/mencabut permission dari Custom Role saat anggotanya sedang aktif memakai sistem | Perubahan berlaku di request berikutnya anggota tsb (menu/tombol yang kehilangan izin langsung hilang/nonaktif), tanpa perlu logout paksa |
| Dua Custom Role dibuat dengan nama yang sama persis dalam satu Company | Ditolak, nama Role harus unik dalam satu Company |
| Undangan terkirim membawa Role tertentu, lalu Role tsb dihapus sebelum undangan diterima | Saat diterima, sistem menetapkan Role Member sebagai fallback (lihat §6.7) |
| User dengan permission terbatas mencoba memanggil endpoint di luar permission-nya lewat API langsung | Ditolak di authorization layer (403), independen dari apa yang ditampilkan di UI |

---

## 12. Asumsi & Pertanyaan Terbuka

### Sudah diputuskan
- ✅ **Multi-company membership** diperbolehkan; berpindah company dilakukan lewat Company Switcher di side panel, di bawah logo (§6.3, FR-10).
- ✅ **Role Member** = System Role default untuk anggota yang diundang, bersifat **view-only** terhadap seluruh modul (§9.1).
- ✅ **OTP dipakai juga untuk login** — wajib di setiap login sebagai langkah kedua setelah password, bukan hanya saat registrasi (§6.2, FR-3).
- ✅ **Superadmin punya kewenangan tulis**: suspend/aktifkan Company, suspend/aktifkan User, membuat User baru secara langsung (FR-11).
- ✅ **Sistem memakai RBAC**: dua System Role tetap (Admin, Member) plus Custom Role yang bisa dibuat Admin dengan kombinasi permission per modul, dan katalog permission bertambah otomatis seiring modul baru dibangun (§4, FR-8, FR-12, §9).

### Masih perlu dikonfirmasi
1. **Auto-login setelah verifikasi OTP registrasi:** setelah OTP registrasi berhasil, apakah user langsung masuk ke sistem, atau tetap diminta login manual (yang kini juga akan meminta OTP login lagi)?
2. **Remember-device untuk OTP login:** karena OTP kini wajib di **setiap** login, apakah perlu opsi "percayai device ini selama N hari" agar tidak mengganggu power user yang login berkali-kali sehari? Tanpa ini, setiap login (termasuk dari device yang sama) selalu minta OTP.
3. **Batasan jumlah Company yang boleh dibuat satu user:** karena user boleh tergabung di banyak company, apakah ada batas berapa Company yang boleh **dibuat/di-Admin-i** oleh satu akun yang sama (relevan untuk model bisnis SaaS, mis. 1 Admin = 1 Company berbayar)?
4. **Invite ke role Admin (co-admin):** apakah saat invite, Admin boleh langsung memilih System Role "Admin" untuk undangannya (co-admin), atau System Role Admin hanya bisa didapat lewat pembuatan Company / promosi terpisah, sementara invite selalu memilih dari Member atau Custom Role?
5. **Provisioning User oleh Superadmin (FR-11):** saat Superadmin membuat User baru secara langsung — apakah user tsb. langsung ditempatkan ke sebuah Company tertentu (dipilih Superadmin, sekaligus memilih Role-nya), dibuat tanpa company, dan bagaimana ia mendapat password pertama (link set-password via email, atau password sementara)?
6. **Cakupan akses Superadmin terhadap konten:** FR-9/FR-11 memberi Superadmin visibilitas metadata Company/User dan kewenangan suspend/aktifkan/buat-user — apakah Superadmin juga perlu bisa **membuka isi konten KM** di dalam suatu Company (mis. untuk investigasi laporan/keluhan), atau cukup metadata saja?
7. **Notifikasi ke user yang di-suspend:** apakah user/Admin Company yang di-suspend menerima notifikasi email otomatis saat statusnya berubah, atau mereka baru tahu saat mencoba login/akses?
8. **Penamaan/branding company:** apakah company butuh field tambahan di luar nama (logo, domain email whitelist untuk auto-join berdasarkan domain email), relevan untuk UX Company Switcher menampilkan lebih dari sekadar nama?
9. **Batas jumlah Custom Role per Company:** apakah perlu dibatasi (mis. maks. 20 role) untuk menghindari kompleksitas berlebihan, atau bebas tanpa batas?
10. **Siapa yang boleh mengelola Roles & Permissions selain Admin:** apakah kewenangan `roles.manage` selalu terikat ke System Role Admin saja (tidak bisa dipindahkan), atau boleh diberikan ke Custom Role lain juga (mis. Admin membuat Custom Role "HR Manager" yang juga diberi izin mengelola role)?
11. **Bisakah Custom Role mewarisi (extend) dari role lain**, atau setiap Custom Role harus dikonfigurasi dari nol setiap kali dibuat?

---

## 13. Metrik Keberhasilan

- **Completion rate** alur registrasi (dari submit form → OTP terverifikasi) — target awal >85%.
- **Time-to-first-company:** rata-rata waktu dari akun terverifikasi sampai Company berhasil dibuat.
- **Invitation acceptance rate:** persentase undangan yang diterima dalam 7 hari.
- **Login failure rate** akibat email belum terverifikasi (indikator apakah komunikasi OTP cukup jelas).
- Jumlah tiket support terkait "tidak menerima OTP" / "tidak bisa login" (indikator kualitas deliverability email & UX pesan error).
- **Adopsi RBAC:** jumlah Company yang membuat minimal satu Custom Role, dan rata-rata jumlah Custom Role per Company (indikator apakah role default Admin/Member saja sudah cukup atau tim benar-benar butuh granularitas tambahan).
- Jumlah insiden "akses ditolak tak terduga" yang dilaporkan setelah perubahan permission Role — indikator apakah efek langsung perubahan Role (§11) cukup jelas dikomunikasikan ke user.

---

## 14. Lampiran — Sketsa Endpoint (Non-Final, untuk Diskusi Teknis Lanjutan)

```
POST /auth/register             — registrasi manual
POST /auth/otp/verify           — verifikasi OTP (registration/login/reset)
POST /auth/otp/resend           — kirim ulang OTP
POST /auth/login                — langkah 1: cek email + password, memicu pengiriman OTP login
POST /auth/login/otp/verify     — langkah 2: verifikasi OTP login, membentuk sesi
POST /auth/logout               — akhiri sesi
POST /auth/password/forgot      — request reset password
POST /auth/password/reset       — set password baru

POST /companies                 — buat company baru (auto Admin)
GET  /companies/:id             — detail company
GET  /me/companies              — daftar company milik user saat ini (untuk Company Switcher)
POST /me/active-company         — set company aktif di konteks sesi

GET  /companies/:id/members        — daftar anggota + undangan
POST /companies/:id/invitations    — buat undangan (bulk, default role=Member)
POST /invitations/:token/accept    — terima undangan
DELETE /companies/:id/invitations/:invId — batalkan undangan
PATCH  /companies/:id/members/:userId    — ubah role_id / nonaktifkan anggota

GET    /companies/:id/roles              — daftar System Role + Custom Role di company ini
POST   /companies/:id/roles              — buat Custom Role baru (nama + daftar permission_id)
GET    /companies/:id/roles/:roleId      — detail Role (termasuk daftar permission & jumlah anggota)
PATCH  /companies/:id/roles/:roleId      — ubah nama/deskripsi/permission Custom Role
DELETE /companies/:id/roles/:roleId      — hapus Custom Role (butuh role pengganti bila masih dipakai)
GET    /permissions                      — katalog seluruh Permission yang terdaftar (dikelompokkan per modul)

GET   /superadmin/companies             — daftar seluruh company (Superadmin only)
GET   /superadmin/users                 — daftar seluruh user (Superadmin only)
POST  /superadmin/users                 — buat user baru secara langsung (Superadmin only)
PATCH /superadmin/companies/:id/status  — suspend/aktifkan company (Superadmin only)
PATCH /superadmin/users/:id/status      — suspend/aktifkan user (Superadmin only)
```

---

**Langkah selanjutnya yang disarankan:** review §12 (Asumsi & Pertanyaan Terbuka) bersama tim/stakeholder sebelum PRD ini dijadikan dasar desain teknis (ERD final, wireframe, dan pemilihan mekanisme auth/session).
