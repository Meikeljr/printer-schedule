# Aplikasi Web Pencatatan Isi Ulang Tinta Printer

Aplikasi web berbasis **React, Node.js (Express), dan PostgreSQL** untuk mencatat pengisian ulang tinta printer dan menampilkan jumlah hari sejak pengisian terakhir berdasarkan data Excel. Impor Excel mengikuti format sampel dengan kolom:
- **nama** (Petugas / PIC)
- **departement** (Departemen)
- **printer** (Kode jenis tinta, misalnya `003` atau `664`)
- **jenis tinta** (Warna tinta: Hitam, Magenta, Biru, atau Kuning)
- **tanggal** (Tanggal pengisian terakhir)
- **ID** (Opsional; diabaikan saat impor)

---

## 🌟 Fitur Utama

1. **Hari Sejak Isi Ulang**: Menampilkan jumlah hari sejak isi ulang terakhir untuk setiap warna tinta. Tidak ada status atau pengingat isi ulang.
2. **Daftar Pemilik Printer**: Daftar nama, departemen, jenis tinta, serta warna Hitam, Magenta, Biru, dan Kuning sesuai `Data_printer.xlsx` dimuat saat backend berjalan; tanggal awal kosong sampai tombol **"Isi Ulang"** ditekan.
3. **Dashboard per Kelompok Tinta**: Menampilkan satu baris per kombinasi PIC, departemen, dan jenis tinta; tanggal setiap warna tetap terpisah dan bisa dilihat atau diperbarui pada detail.
4. **Pembaruan Isi Ulang**: Tombol **"Isi Ulang"** memperbarui tanggal yang dipilih dan mencatat riwayat.
5. **Impor Data Excel**: Pengunggahan data pengisian dengan format `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal`; impor hanya memperbarui tanggal dan riwayat data printer yang sudah terdaftar, tidak menambahkan nama/printer baru. Baris roster tanpa warna atau data yang tidak cocok akan dilewati.
6. **Ekspor Laporan Excel**: Mengunduh detail seluruh warna dalam format `.xlsx`.
7. **Pencarian & Multi-Filter**: Filter data berdasarkan kata kunci, Departemen, jenis tinta, dan warna.
8. **Ringkasan Dashboard**: Menampilkan jumlah kelompok tinta unik dan jumlah catatan warna tinta yang sudah lebih dari 60 hari sejak isi ulang terakhir.
9. **Dukungan Dual Database**: Mendukung koneksi PostgreSQL bawaan, serta dilengkapi fitur **Auto-Fallback SQLite** apabila PostgreSQL lokal belum dinyalakan.

### Jenis Tinta Printer

- **Epson 664**: L110, L120, L360
- **Epson 003**: L3110, L3210, L3250, L3251
- **Brother LC400 / LC77XL**: Brother MFC-J6710DW

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi A: Jalankan dengan 1-Click Batch File (Windows)
Klik ganda file `start-all.bat` di direktori ini:
```cmd
C:\Users\Meikel\Documents\Printer\start-all.bat
```
Script akan otomatis menjalankan server Backend (Port 5000) dan Frontend React (Port 3000).

---

### Opsi B: Jalankan Secara Manual via Terminal

#### 1. Jalankan Backend (Node.js)
```bash
cd "C:\Users\Meikel\Documents\Printer\server"
npm start
```
*Backend akan berjalan di `http://localhost:5000`*

#### 2. Jalankan Frontend (React + Vite)
Buka terminal kedua:
```bash
cd "C:\Users\Meikel\Documents\Printer\client"
npm run dev
```
*Aplikasi web React dapat diakses di `http://localhost:3000`*

---

## 📊 File Sampel Excel

File Excel berisi daftar pemilik printer:
```text
C:\Users\Meikel\Documents\Printer\Data_printer.xlsx
```
Roster disimpan di `server/printer_roster.json` dan diselaraskan otomatis ketika backend dijalankan. Setiap printer baru ditampilkan tanpa tanggal isi ulang sampai tombol **Isi Ulang** ditekan. Untuk menambahkan pemilik printer baru, tombol **Tambah Printer** tetap tersedia.

File aktivitas isi ulang dengan kolom `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal` dapat diimpor; kolom `Printer` berisi kode tinta dan `Jenis Tinta` berisi warna. Impor mencocokkan nama, departemen, printer, dan warna dengan baris yang sudah ada lalu memperbarui tanggal terakhir serta riwayat. Nama/printer yang belum terdaftar tidak dibuat otomatis oleh impor.

---

## 🗄️ Konfigurasi PostgreSQL

### Supabase lokal

Supabase lokal menjalankan PostgreSQL melalui Docker. Pasang dan jalankan Docker Desktop, lalu dari direktori proyek:

```bash
npx supabase start
npx supabase db reset
```

Migrasi di `supabase/migrations` membuat tabel `printer_refills` dan `refill_history`. Perintah reset hanya diperlukan untuk membuat ulang database lokal dari migrasi dan akan menghapus data lokal Supabase yang sudah ada.

Backend membaca `server/.env`, yang disiapkan untuk port PostgreSQL Supabase lokal `54322`:

```env
DB_HOST=127.0.0.1
DB_PORT=54322
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
DB_SSL=false
DB_FALLBACK_SQLITE=false
```

Jalankan backend dari folder `server` dengan `npm start`. Jika Supabase lokal belum berjalan atau koneksi gagal, backend tidak akan diam-diam berpindah ke SQLite. Saat backend tersambung, roster dari `server/printer_roster.json` disinkronkan otomatis.

Untuk Supabase hosted, gunakan detail koneksi PostgreSQL dari dashboard Supabase di environment backend, misalnya `DATABASE_URL` dan `DB_SSL=true`; jangan masukkan kredensial tersebut ke frontend atau commit ke Git. `server/.env.example` berisi contoh konfigurasi. Struktur tabel juga tersedia di `server/schema.sql`.

### Deploy ke Vercel dan Render

- **Supabase**: Buat project, lalu jalankan migrasi di `supabase/migrations` melalui Supabase CLI atau SQL Editor. Salin connection string PostgreSQL dari dashboard Supabase.
- **Render**: Hubungkan repository GitHub. Blueprint `render.yaml` membuat backend dengan direktori root `server`. Isi environment variable `DATABASE_URL` dengan connection string Supabase; `DB_SSL` dan `DB_FALLBACK_SQLITE` sudah dikonfigurasi oleh blueprint.
- **Vercel**: Impor repository dan atur **Root Directory** ke `client`. Vercel membangun frontend menggunakan `npm run build`; aturan di `client/vercel.json` meneruskan `/api/*` ke backend Render.

Domain backend pada `client/vercel.json` harus sama dengan domain service Render. Endpoint `/api/health` digunakan Render untuk memeriksa koneksi backend dan database.
