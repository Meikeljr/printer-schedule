-- Schema PostgreSQL untuk Sistem Pengingat Isi Ulang Printer

CREATE TABLE IF NOT EXISTS printer_refills (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    departement VARCHAR(255) NOT NULL,
    printer VARCHAR(255) NOT NULL,
    warna VARCHAR(50) NOT NULL,
    tanggal_terakhir DATE NOT NULL,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refill_history (
    id SERIAL PRIMARY KEY,
    refill_id INT REFERENCES printer_refills(id) ON DELETE CASCADE,
    nama VARCHAR(255),
    tanggal_refill DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data Sampel Awal (jika tabel kosong)
INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
SELECT 'Budi Santoso', 'Keuangan', 'Epson L3110', 'Hitam', CURRENT_DATE - INTERVAL '65 days', 'Sudah 65 hari (Perlu Isi Ulang)'
WHERE NOT EXISTS (SELECT 1 FROM printer_refills);

INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
SELECT 'Siti Rahma', 'HRD', 'Canon Pixma G2010', 'Magenta', CURRENT_DATE - INTERVAL '50 days', 'Sudah 50 hari (Mendekati Tenggat)'
WHERE NOT EXISTS (SELECT 1 FROM printer_refills WHERE printer = 'Canon Pixma G2010' AND warna = 'Magenta');

INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
SELECT 'Agus Pratama', 'IT Support', 'HP Smart Tank 515', 'Biru', CURRENT_DATE - INTERVAL '15 days', 'Sudah 15 hari (Aman)'
WHERE NOT EXISTS (SELECT 1 FROM printer_refills WHERE printer = 'HP Smart Tank 515' AND warna = 'Biru');

INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
SELECT 'Dewi Lestari', 'Pemasaran', 'Epson L3150', 'Kuning', CURRENT_DATE - INTERVAL '70 days', 'Sudah 70 hari (Perlu Isi Ulang)'
WHERE NOT EXISTS (SELECT 1 FROM printer_refills WHERE printer = 'Epson L3150' AND warna = 'Kuning');
