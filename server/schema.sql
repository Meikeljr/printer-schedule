-- Schema SQLite untuk pencatatan isi ulang printer

CREATE TABLE IF NOT EXISTS printer_refills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    departement TEXT NOT NULL,
    printer TEXT NOT NULL,
    warna TEXT NOT NULL,
    tanggal_terakhir TEXT,
    catatan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refill_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refill_id INTEGER REFERENCES printer_refills(id) ON DELETE CASCADE,
    nama TEXT,
    tanggal_refill TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
