# Aplikasi Web Pencatatan Isi Ulang Tinta Printer

Aplikasi web berbasis **React, Node.js (Express), dan MySQL/MariaDB** untuk mencatat pengisian ulang tinta printer dan menampilkan jumlah hari sejak pengisian terakhir berdasarkan data Excel. Impor Excel mengikuti format sampel dengan kolom:
- **nama** (Petugas / PIC)
- **departement** (Departemen)
- **printer** (Kode jenis tinta, misalnya `003` atau `664`)
- **jenis tinta** (Warna tinta: Hitam, Magenta, Biru, atau Kuning)
- **tanggal** (Tanggal pengisian terakhir)
- **ID** (Opsional; diabaikan saat impor)

---

## 🌟 Fitur Utama

1. **Hari Sejak Isi Ulang**: Menampilkan hari sejak isi ulang untuk setiap warna tinta dengan status Aman (<30 hari), Menipis (30-60 hari), Kritis (>60 hari), atau Belum tercatat. Setelah 60 hari, angka ditampilkan sebagai tambahan hari: hari ke-61 menjadi `+1`, hari ke-62 menjadi `+2`, dan seterusnya.
2. **Daftar Pemilik Printer**: Daftar nama, departemen, jenis tinta, serta warna Hitam, Magenta, Biru, dan Kuning sesuai `Data_printer.xlsx` dimuat saat backend berjalan; tanggal awal kosong sampai tombol **"Isi Ulang"** ditekan.
3. **Dashboard per Kelompok Tinta**: Menampilkan satu baris per kombinasi PIC, departemen, dan jenis tinta; tanggal setiap warna tetap terpisah dan bisa dilihat atau diperbarui pada detail.
4. **Pembaruan Isi Ulang**: Tombol **"Isi Ulang"** memperbarui tanggal yang dipilih dan mencatat riwayat.
5. **Impor Data Excel**: Pengunggahan data pengisian dengan format `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal`; impor hanya memperbarui tanggal dan riwayat data printer yang sudah terdaftar, tidak menambahkan nama/printer baru. Baris roster tanpa warna atau data yang tidak cocok akan dilewati.
6. **Ekspor Laporan Excel**: Mengunduh detail seluruh warna dalam format `.xlsx`.
7. **Pencarian, Filter & Pengurutan**: Filter berdasarkan kata kunci, Departemen, jenis tinta, dan warna; urutkan berdasarkan nama PIC atau usia isi ulang. Kartu tinta lebih dari 60 hari menjadi filter cepat.
8. **Ringkasan Dashboard & Pagination**: Menampilkan jumlah kelompok tinta unik dan jumlah catatan warna tinta yang sudah lebih dari 60 hari sejak isi ulang terakhir, dengan pilihan 10, 25, atau 50 kelompok per halaman.
9. **Database MySQL/MariaDB**: Backend menyimpan data pada database MySQL/MariaDB di server yang dikonfigurasi.

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

## 🗄️ Konfigurasi MySQL/MariaDB di server pribadi

1. Pasang MySQL atau MariaDB di server dan buat database serta akun aplikasi. Contoh perintah di konsol MySQL (ganti nama dan password sesuai kebutuhan):

```sql
CREATE DATABASE printer_refill_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER 'printer_app'@'<ALAMAT_SERVER_BACKEND>'
  IDENTIFIED BY '<PASSWORD_KUAT>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES
  ON printer_refill_db.* TO 'printer_app'@'<ALAMAT_SERVER_BACKEND>';
FLUSH PRIVILEGES;
```

`<ALAMAT_SERVER_BACKEND>` adalah host/IP mesin backend yang diizinkan mengakses MySQL. Jika backend dan database berada pada mesin yang sama, gunakan `localhost`. Simpan konfigurasi berikut di `server/.env` (jangan commit file ini):

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=printer_refill_db
DB_USER=printer_app
DB_PASSWORD=<PASSWORD_KUAT>
DB_SSL=false
```

Sesuaikan `DB_HOST` ke alamat server MySQL jika backend dan database terpisah. Aktifkan `DB_SSL=true` bila server MySQL dikonfigurasi dengan TLS dan sertifikat yang dipercaya. Jangan membuka port MySQL ke internet umum; batasi akses dengan firewall ke server backend atau jaringan privat/VPN. Jalankan `server/schema.sql` setelah membuat database, atau biarkan backend membuat tabel saat pertama kali dijalankan. Backend juga menyelaraskan roster dari `server/printer_roster.json`.

Backend memerlukan Node.js, lalu bisa dipasang dan dijalankan di server seperti berikut:

```bash
cd server
npm ci
npm start
```

Untuk akses dari komputer lain, letakkan backend di balik reverse proxy HTTPS (misalnya Nginx) dan arahkan `/api/` ke port 5000. Frontend harus disajikan dari server atau domain yang sama dan meneruskan permintaan `/api/` ke backend. Jangan mengekspos port backend atau database secara langsung ke internet tanpa pengamanan.

Mengganti driver dan skema **tidak memindahkan data PostgreSQL yang sudah ada**. Jika ingin mempertahankan data lama, ekspor dan migrasikan data ke MySQL/MariaDB secara terpisah, lalu verifikasi sebelum mengalihkan aplikasi ke database baru.

### Deploy ke Vercel dan Render

- **Server pribadi**: Letakkan frontend dan backend pada server/domain yang dapat diakses pengguna. Konfigurasikan reverse proxy HTTPS untuk meneruskan `/api/` ke backend; jika memakai domain atau server berbeda, atur proxy frontend agar menunjuk ke backend tersebut.
- **Render (opsional)**: Blueprint `render.yaml` menyiapkan backend. Atur `DB_HOST`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD` agar Render dapat menjangkau server MySQL. Database yang hanya bisa diakses dalam jaringan lokal tidak dapat dijangkau Render.
- **Vercel**: Konfigurasi `client/vercel.json` yang ada masih mengarah ke backend Render lama. Untuk memakai server pribadi, ubah tujuan proxy tersebut ke alamat HTTPS backend yang dapat dijangkau Vercel. Backend yang hanya tersedia di jaringan lokal tidak dapat diakses Vercel.

Endpoint `/api/health` memeriksa koneksi backend dan database. Pastikan firewall server hanya membuka port yang diperlukan dan database hanya menerima koneksi dari host backend.
