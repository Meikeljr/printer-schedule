-- Schema PostgreSQL untuk pencatatan isi ulang printer

CREATE TABLE IF NOT EXISTS printer_refills (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    departement VARCHAR(255) NOT NULL,
    printer VARCHAR(255) NOT NULL,
    warna VARCHAR(50) NOT NULL,
    tanggal_terakhir DATE,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE printer_refills ALTER COLUMN tanggal_terakhir DROP NOT NULL;

CREATE TABLE IF NOT EXISTS refill_history (
    id SERIAL PRIMARY KEY,
    refill_id INT REFERENCES printer_refills(id) ON DELETE CASCADE,
    nama VARCHAR(255),
    tanggal_refill DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE printer_refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_history ENABLE ROW LEVEL SECURITY;
