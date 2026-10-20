# Aplikasi Web Pencatatan Isi Ulang Tinta Printer

Aplikasi web berbasis **React, Node.js (Express), dan PostgreSQL (Supabase)** untuk mencatat pengisian ulang tinta printer dan menampilkan jumlah hari sejak pengisian terakhir berdasarkan data Excel. Impor Excel mengikuti format sampel dengan kolom:
- **nama** (Petugas / PIC)
- **departement** (Departemen)
- **printer** (Kode jenis tinta, misalnya `003` atau `664`)
- **jenis tinta** (Warna tinta: Hitam, Magenta, Biru, atau Kuning)
- **tanggal** (Tanggal pengisian terakhir)
- **ID** (Opsional; diabaikan saat impor)

---

## 🌟 Fitur Utama

1. **Hari Sejak Isi Ulang**: Menampilkan hari sejak isi ulang untuk setiap warna tinta dengan status Aman (<30 hari), Menipis (30-60 hari), Kritis (>60 hari), atau Belum tercatat.
2. **Daftar Pemilik Printer**: Daftar nama, departemen, jenis tinta, serta warna Hitam, Magenta, Biru, dan Kuning sesuai `Data_printer.xlsx` dimuat saat backend berjalan; tanggal awal kosong sampai tombol **"Isi Ulang"** ditekan.
3. **Dashboard per Kelompok Tinta**: Menampilkan satu baris per kombinasi PIC, departemen, dan jenis tinta; tanggal setiap warna tetap terpisah dan bisa dilihat atau diperbarui pada detail.
4. **Pembaruan Isi Ulang**: Tombol **"Isi Ulang"** memperbarui tanggal yang dipilih dan mencatat riwayat.
5. **Impor Data Excel**: Pengunggahan data pengisian dengan format `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal`; impor hanya memperbarui tanggal dan riwayat data printer yang sudah terdaftar, tidak menambahkan nama/printer baru. Baris roster tanpa warna atau data yang tidak cocok akan dilewati.
6. **Ekspor Laporan Excel**: Mengunduh detail seluruh warna dalam format `.xlsx`.
7. **Pencarian, Filter & Pengurutan**: Filter berdasarkan kata kunci, Departemen, jenis tinta, dan warna; urutkan berdasarkan nama PIC atau usia isi ulang. Kartu tinta lebih dari 60 hari menjadi filter cepat.
8. **Ringkasan Dashboard & Pagination**: Menampilkan jumlah kelompok tinta unik dan jumlah catatan warna tinta yang sudah lebih dari 60 hari sejak isi ulang terakhir, dengan pilihan 10, 25, atau 50 kelompok per halaman.
9. **Database PostgreSQL**: Backend menyimpan data pada PostgreSQL, termasuk koneksi Supabase untuk deployment.

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

## 🗄️ Konfigurasi Supabase PostgreSQL

1. Buat proyek di [Supabase](https://supabase.com/) dan tunggu sampai database siap.
2. Dari dashboard proyek, buka **Connect** dan salin connection string PostgreSQL. Untuk service Render, gunakan alamat **Session pooler** jika direct connection tidak dapat dijangkau melalui IPv4.
3. Jalankan migrasi `supabase/migrations/20261016120000_create_printer_refill_tables.sql` melalui **SQL Editor** Supabase. Backend juga membuat tabel jika belum ada.
4. Jangan masukkan password ke Git atau kode frontend. Simpan connection string sebagai environment variable `DATABASE_URL` di Render.

Untuk development lokal, isi `server/.env` (jangan commit file ini):

```env
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
DB_SSL=true
```

Ganti placeholder dengan connection string dari Supabase. Backend membutuhkan koneksi PostgreSQL keluar; `DB_SSL=true` mengaktifkan TLS. Struktur tabel juga tersedia di `server/schema.sql`. Saat backend dijalankan, daftar printer dari `server/printer_roster.json` disinkronkan tanpa menghapus catatan yang sudah ada.

### Deploy ke Vercel dan Render

- **Render**: Hubungkan repository GitHub atau gunakan Blueprint dari `render.yaml`. Service memakai direktori root `server`, `npm ci`, dan `npm start`. Tambahkan `DATABASE_URL` pada Environment di Render dengan connection string PostgreSQL Supabase; `DB_SSL=true` sudah didefinisikan di blueprint. SQLite maupun Persistent Disk tidak diperlukan.
- **Vercel**: Impor repository dan atur **Root Directory** ke `client`. Vercel membangun frontend menggunakan `npm run build`; aturan di `client/vercel.json` meneruskan `/api/*` ke backend Render.

Domain backend pada `client/vercel.json` harus sama dengan domain service Render. Endpoint `/api/health` digunakan Render untuk memeriksa koneksi backend dan database. Setelah deploy, periksa log Render untuk pesan bahwa PostgreSQL berhasil diinisialisasi.
