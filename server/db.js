const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let mode = 'pg'; // 'pg' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'printer_refill_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  connectionTimeoutMillis: 2000,
};

// Inisialisasi Database
async function initDb() {
  // Coba PostgreSQL terlebih dahulu
  try {
    pgPool = new Pool(dbConfig);
    const client = await pgPool.connect();
    console.log('✅ Terhubung ke database PostgreSQL:', dbConfig.database);
    
    // Inisialisasi Tabel PostgreSQL
    await client.query(`
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
    `);
    
    // Tambah data awal jika masih kosong
    const countRes = await client.query('SELECT COUNT(*) FROM printer_refills');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      const today = new Date();
      const formatDate = (daysAgo) => {
        const d = new Date(today);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      await client.query(`
        INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan) VALUES
        ('Budi Santoso', 'Keuangan', 'Epson L3110', 'Hitam', '${formatDate(65)}', 'Terakhir isi 65 hari lalu'),
        ('Siti Rahma', 'HRD', 'Canon Pixma G2010', 'Magenta', '${formatDate(50)}', 'Terakhir isi 50 hari lalu'),
        ('Agus Pratama', 'IT Support', 'HP Smart Tank 515', 'Biru', '${formatDate(15)}', 'Terakhir isi 15 hari lalu'),
        ('Dewi Lestari', 'Pemasaran', 'Epson L3150', 'Kuning', '${formatDate(75)}', 'Terakhir isi 75 hari lalu');
      `);
      console.log('🌱 Data awal (seed) berhasil ditambahkan ke PostgreSQL.');
    }
    client.release();
    mode = 'pg';
    return;
  } catch (err) {
    console.warn('⚠️ Gagal terhubung ke PostgreSQL (' + err.message + '). Menggunakan SQLite lokal sebagai fallback...');
  }

  // Fallback SQLite jika PostgreSQL tidak aktif
  mode = 'sqlite';
  const dbPath = path.join(__dirname, 'printer_database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    sqliteDb.serialize(() => {
      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS printer_refills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nama TEXT NOT NULL,
          departement TEXT NOT NULL,
          printer TEXT NOT NULL,
          warna TEXT NOT NULL,
          tanggal_terakhir TEXT NOT NULL,
          catatan TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS refill_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          refill_id INTEGER,
          nama TEXT,
          tanggal_refill TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (refill_id) REFERENCES printer_refills(id) ON DELETE CASCADE
        )
      `);

      sqliteDb.get('SELECT COUNT(*) as count FROM printer_refills', (err, row) => {
        if (!err && row.count === 0) {
          const today = new Date();
          const formatDate = (daysAgo) => {
            const d = new Date(today);
            d.setDate(d.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
          };

          const stmt = sqliteDb.prepare(`
            INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run('Budi Santoso', 'Keuangan', 'Epson L3110', 'Hitam', formatDate(65), 'Terakhir isi 65 hari lalu (Perlu Refill)');
          stmt.run('Siti Rahma', 'HRD', 'Canon Pixma G2010', 'Magenta', formatDate(50), 'Terakhir isi 50 hari lalu (Mendekati)');
          stmt.run('Agus Pratama', 'IT Support', 'HP Smart Tank 515', 'Biru', formatDate(15), 'Terakhir isi 15 hari lalu (Aman)');
          stmt.run('Dewi Lestari', 'Pemasaran', 'Epson L3150', 'Kuning', formatDate(75), 'Terakhir isi 75 hari lalu (Perlu Refill)');
          stmt.finalize();
          console.log('🌱 Data awal (seed) berhasil ditambahkan ke SQLite.');
        }
        console.log('✅ SQLite Database siap digunakan di:', dbPath);
        resolve();
      });
    });
  });
}

// Wrapper query abstrak untuk PostgreSQL & SQLite
async function query(text, params = []) {
  if (mode === 'pg') {
    const res = await pgPool.query(text, params);
    return res.rows;
  } else {
    // Transformasi sintaks $1, $2 ke ? untuk SQLite jika ada
    let sqlText = text.replace(/\$\d+/g, '?');
    
    // SQLite query
    return new Promise((resolve, reject) => {
      const isSelect = sqlText.trim().toUpperCase().startsWith('SELECT');
      if (isSelect) {
        sqliteDb.all(sqlText, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        sqliteDb.run(sqlText, params, function (err) {
          if (err) reject(err);
          else resolve([{ id: this.lastID, changes: this.changes }]);
        });
      }
    });
  }
}

function getMode() {
  return mode;
}

module.exports = {
  initDb,
  query,
  getMode,
};
