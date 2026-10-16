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
2. **Pembaruan Isi Ulang Cepat**: Tombol **"Isi Ulang"** untuk memperbarui tanggal pengisian ke hari ini secara instan & mencatat riwayat pemeliharaan.
3. **Impor Data Excel**: Pengunggahan file Excel `.xlsx` / `.xls` sesuai format `ID, Nama, Departement, Printer, Jenis Tinta, Tanggal`. Kolom `Printer` berisi kode tinta dan `Jenis Tinta` berisi warna.
4. **Ekspor Laporan Excel**: Mengunduh catatan pengisian dan jumlah hari sejak pengisian terakhir dalam format `.xlsx`.
5. **Pencarian & Multi-Filter**: Filter data berdasarkan kata kunci, Departemen, dan Warna Tinta.
6. **Dukungan Dual Database**: Mendukung koneksi PostgreSQL bawaan, serta dilengkapi fitur **Auto-Fallback SQLite** apabila PostgreSQL lokal belum dinyalakan.

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

File sampel Excel yang menjadi acuan format impor:
```text
C:\Users\Meikel\Documents\Printer\Sampel_data_printer.xlsx
```
Kolom `Printer` berisi kode `003` atau `664`, sedangkan `Jenis Tinta` berisi warna tinta. Kolom `ID` diabaikan saat impor.

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
