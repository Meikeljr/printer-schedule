# Aplikasi Web Manajemen & Pengingat Isi Ulang Tinta Printer

Aplikasi web modern berbasis **React, Node.js (Express), dan PostgreSQL** untuk memantau, mengelola, dan memberikan pengingat otomatis 2 bulan (60 hari) untuk pengisian ulang tinta printer berdasarkan data Excel dengan variabel:
- **nama** (Petugas / PIC)
- **departement** (Departemen)
- **printer** (Merk / Tipe Printer)
- **warna** (Hitam, Magenta, Biru/Cyan, Kuning/Yellow)
- **tanggal** (Tanggal pengisian terakhir)

---

## 🌟 Fitur Utama

1. **Dashboard Statistik & Status Pengingat**:
   - **Perlu Refill (Merah)**: $\ge$ 60 Hari (2 Bulan) dari pengisian terakhir.
   - **Mendekati Tenggat (Kuning)**: 45 – 59 Hari.
   - **Aman (Hijau)**: $< 45$ Hari.
2. **Pengingat Otomatis 2 Bulan**: Banner peringatan otomatis muncul jika ada printer yang telah melewati tenggat 2 bulan.
3. **Pembaruan Isi Ulang Cepat**: Tombol **"Isi Ulang Sekarang"** untuk memperbarui tanggal pengisian ke hari ini secara instan & mencatat riwayat pemeliharaan.
4. **Impor Data Excel**: Pengunggahan file Excel `.xlsx` / `.xls` dengan kolom `nama, departement, printer, warna, tanggal`.
5. **Ekspor Laporan Excel**: Mengunduh seluruh status dan riwayat ke dalam format file Excel `.xlsx`.
6. **Pencarian & Multi-Filter**: Filter data berdasarkan kata kunci, Departemen, Warna Tinta, dan Status Tenggat.
7. **Dukungan Dual Database**: Mendukung koneksi PostgreSQL bawaan, serta dilengkapi fitur **Auto-Fallback SQLite** apabila PostgreSQL lokal belum dinyalakan.

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

File sampel Excel siap pakai telah disiapkan di lokasi berikut:
```text
C:\Users\Meikel\Documents\Printer\sample_printer_data.xlsx
```
Anda dapat langsung menguji fitur **Impor Excel** pada aplikasi web menggunakan file sampel ini.

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
