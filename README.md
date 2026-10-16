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

1. **Jumlah Hari Sejak Isi Ulang**: Menampilkan jumlah hari sejak tinta terakhir diisi ulang, tanpa pengingat atau tenggat.
2. **Daftar Pemilik Printer**: Daftar nama, departemen, jenis tinta, serta warna Hitam, Magenta, Biru, dan Kuning sesuai `Data_printer.xlsx` dimuat saat backend berjalan; tanggal awal kosong sampai tombol **"Isi Ulang"** ditekan.
3. **Pembaruan Isi Ulang Cepat**: Tombol **"Isi Ulang"** memperbarui tanggal ke hari ini dan mencatat riwayat.
4. **Impor Data Excel**: Pengunggahan data pengisian dengan format `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal`, atau data roster tanpa warna/tanggal.
5. **Ekspor Laporan Excel**: Mengunduh catatan pengisian dan jumlah hari sejak pengisian terakhir dalam format `.xlsx`.
6. **Pencarian & Multi-Filter**: Filter data berdasarkan kata kunci, Departemen, dan Warna Tinta.
7. **Dukungan Dual Database**: Mendukung koneksi PostgreSQL bawaan, serta dilengkapi fitur **Auto-Fallback SQLite** apabila PostgreSQL lokal belum dinyalakan.

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

File aktivitas isi ulang dengan kolom `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal` juga dapat diimpor; kolom `Printer` berisi kode tinta dan `Jenis Tinta` berisi warna.

---

## 🗄️ Konfigurasi PostgreSQL

Koneksi database PostgreSQL diatur pada file `server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=printer_refill_db
```
Skema tabel PostgreSQL juga telah disertakan di `server/schema.sql`.
