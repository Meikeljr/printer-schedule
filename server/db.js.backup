const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const printerRoster = require('./printer_roster.json');
require('dotenv').config();

let mode = 'pg'; // 'pg' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

const connectionString = process.env.DATABASE_URL?.trim();
const dbConfig = {
  ...(connectionString
    ? { connectionString }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'printer_refill_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
      }),
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  connectionTimeoutMillis: 2000,
};

const rosterColors = ['Hitam', 'Magenta', 'Biru', 'Kuning'];

function normalizeRosterPrinter(value) {
  const printer = String(value || '').trim();
  const normalized = printer.toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '003' || normalized === 'epson 003' || /(^|[^a-z0-9])l(3110|3210|3250|3251)([^a-z0-9]|$)/i.test(printer)) {
    return 'Epson 003';
  }
  if (normalized === '664' || normalized === 'epson 664' || /(^|[^a-z0-9])l(110|120|360)([^a-z0-9]|$)/i.test(printer)) {
    return 'Epson 664';
  }
  if (normalized === 'brother lc400 / lc77xl' || /mfc-j6710dw/i.test(printer)) {
    return 'Brother LC400 / LC77XL';
  }
  return printer;
}

async function syncPrinterRoster(roster = printerRoster) {
  const rows = await query('SELECT id, nama, departement, printer, warna FROM printer_refills');
  const existing = new Set(rows.filter(row => row.warna).map(row => [
    row.nama.trim().toLowerCase(),
    row.departement.trim().toLowerCase(),
    normalizeRosterPrinter(row.printer).toLowerCase(),
    row.warna.trim().toLowerCase(),
  ].join('|')));
  const emptyColorRows = new Map(rows.filter(row => !row.warna).map(row => [
    [
      row.nama.trim().toLowerCase(),
      row.departement.trim().toLowerCase(),
      normalizeRosterPrinter(row.printer).toLowerCase(),
    ].join('|'),
    row,
  ]));

  let changed = 0;
  for (const entry of roster) {
    const printer = normalizeRosterPrinter(entry.printer);
    const personKey = [entry.nama.trim().toLowerCase(), entry.departement.trim().toLowerCase(), printer.toLowerCase()].join('|');
    const emptyColorRow = emptyColorRows.get(personKey);

    for (const color of rosterColors) {
      const colorKey = `${personKey}|${color.toLowerCase()}`;
      if (existing.has(colorKey)) continue;

      if (color === rosterColors[0] && emptyColorRow) {
        await query('UPDATE printer_refills SET warna = $1 WHERE id = $2', [color, emptyColorRow.id]);
        emptyColorRows.delete(personKey);
      } else {
        const dateWithoutRefill = mode === 'pg' ? null : '';
        await query(
          `INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
           VALUES ($1, $2, $3, $4, $5, '')`,
          [entry.nama.trim(), entry.departement.trim(), printer, color, dateWithoutRefill]
        );
      }

      existing.add(colorKey);
      changed++;
    }
  }

  return changed;
}

// Inisialisasi Database
async function initDb() {
  // Coba PostgreSQL terlebih dahulu
  try {
    pgPool = new Pool(dbConfig);
    const client = await pgPool.connect();
    try {
      console.log('✅ Terhubung ke database PostgreSQL:', dbConfig.database || 'DATABASE_URL');

      await client.query(`
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

        CREATE TABLE IF NOT EXISTS refill_history (
          id SERIAL PRIMARY KEY,
          refill_id INT REFERENCES printer_refills(id) ON DELETE CASCADE,
          nama VARCHAR(255),
          tanggal_refill DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query('ALTER TABLE printer_refills ALTER COLUMN tanggal_terakhir DROP NOT NULL');
    } finally {
      client.release();
    }
    mode = 'pg';
    const added = await syncPrinterRoster();
    if (added) console.log(`🌱 ${added} pemilik printer ditambahkan ke PostgreSQL.`);
    return;
  } catch (err) {
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    if (process.env.DB_FALLBACK_SQLITE === 'false') {
      throw new Error(`Koneksi PostgreSQL gagal dan fallback SQLite dinonaktifkan: ${err.message}`);
    }
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
          tanggal_terakhir TEXT,
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

      sqliteDb.get('SELECT 1', async (err) => {
        if (err) return reject(err);
        try {
          const added = await syncPrinterRoster();
          if (added) console.log(`🌱 ${added} pemilik printer ditambahkan ke SQLite.`);
          console.log('✅ SQLite Database siap digunakan di:', dbPath);
          resolve();
        } catch (seedError) {
          reject(seedError);
        }
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
  syncPrinterRoster,
};
