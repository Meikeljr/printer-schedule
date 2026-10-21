-- Schema MySQL untuk pencatatan isi ulang printer

CREATE TABLE IF NOT EXISTS printer_refills (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    departement VARCHAR(255) NOT NULL,
    printer VARCHAR(255) NOT NULL,
    warna VARCHAR(50) NOT NULL,
    tanggal_terakhir DATE,
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE printer_refills ALTER COLUMN tanggal_terakhir DROP NOT NULL;

CREATE TABLE IF NOT EXISTS refill_history (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    refill_id INT UNSIGNED,
    nama VARCHAR(255),
    tanggal_refill DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refill_history_refill
        FOREIGN KEY (refill_id) REFERENCES printer_refills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
