# Aplikasi Web Pencatatan Isi Ulang Tinta Printer

Aplikasi web berbasis **React, Node.js (Express), dan SQLite** untuk mencatat pengisian ulang tinta printer dan menampilkan jumlah hari sejak pengisian terakhir berdasarkan data Excel. Data disimpan pada `server/printer_database.sqlite`. Impor Excel mengikuti format sampel dengan kolom:
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
9. **Database SQLite**: Backend menggunakan SQLite langsung tanpa memerlukan server database terpisah. Lokasi file dapat diatur melalui `SQLITE_DB_PATH`.

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

## 🗄️ Konfigurasi SQLite

Backend membuat tabel yang diperlukan secara otomatis dan menyimpan data di `server/printer_database.sqlite`. Salin `server/.env.example` menjadi `server/.env` jika ingin mengatur lokasi file database:

```env
PORT=5000
SQLITE_DB_PATH=printer_database.sqlite
```

`SQLITE_DB_PATH` dapat berupa path absolut atau path relatif terhadap direktori `server`. Struktur tabel juga tersedia di `server/schema.sql`. Saat backend dijalankan, daftar printer dari `server/printer_roster.json` disinkronkan tanpa menghapus catatan yang sudah ada.

### Deploy ke Vercel dan Render

- **Render**: Hubungkan repository GitHub. Blueprint `render.yaml` membuat backend dengan direktori root `server`. SQLite menyimpan data dalam file lokal; filesystem service hosting bisa bersifat sementara. Untuk mempertahankan data saat deploy/restart, atur persistent disk pada hosting dan arahkan `SQLITE_DB_PATH` ke file pada disk tersebut.
- **Vercel**: Impor repository dan atur **Root Directory** ke `client`. Vercel membangun frontend menggunakan `npm run build`; aturan di `client/vercel.json` meneruskan `/api/*` ke backend Render.

Domain backend pada `client/vercel.json` harus sama dengan domain service Render. Endpoint `/api/health` digunakan Render untuk memeriksa koneksi backend dan database.
