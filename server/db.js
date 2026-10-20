const { Pool } = require('pg');
const printerRoster = require('./printer_roster.json');
require('dotenv').config();

let pool = null;

const connectionString = process.env.DATABASE_URL?.trim();
const dbConfig = {
  ...(connectionString
    ? { connectionString }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'printer_refill_db',
        password: process.env.DB_PASSWORD || 'postgres',
        port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      }),
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  connectionTimeoutMillis: 5000,
};

const rosterColors = ['Hitam', 'Magenta', 'Biru', 'Kuning'];

function normalizeRosterPrinter(value) {
  const printer = String(value || '').trim();
  const normalized = printer.toLowerCase().replace(/\s+/g, ' ');

  if (
    normalized === '003' ||
    normalized === 'epson 003' ||
    /(^|[^a-z0-9])l(3110|3210|3250|3251)([^a-z0-9]|$)/i.test(printer)
  ) {
    return 'Epson 003';
  }

  if (
    normalized === '664' ||
    normalized === 'epson 664' ||
    /(^|[^a-z0-9])l(110|120|360)([^a-z0-9]|$)/i.test(printer)
  ) {
    return 'Epson 664';
  }

  if (
    normalized === 'brother lc400 / lc77xl' ||
    /mfc-j6710dw/i.test(printer)
  ) {
    return 'Brother LC400 / LC77XL';
  }

  return printer;
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database PostgreSQL belum diinisialisasi.');
  }

  const result = await pool.query(text, params);
  return result.rows;
}

async function syncPrinterRoster(roster = printerRoster) {
  const rows = await query(
    'SELECT id, nama, departement, printer, warna FROM printer_refills'
  );

  const existing = new Set(
    rows
      .filter(row => row.warna)
      .map(row => [
        row.nama.trim().toLowerCase(),
        row.departement.trim().toLowerCase(),
        normalizeRosterPrinter(row.printer).toLowerCase(),
        row.warna.trim().toLowerCase(),
      ].join('|'))
  );

  const emptyColorRows = new Map(
    rows
      .filter(row => !row.warna)
      .map(row => [
        [
          row.nama.trim().toLowerCase(),
          row.departement.trim().toLowerCase(),
          normalizeRosterPrinter(row.printer).toLowerCase(),
        ].join('|'),
        row,
      ])
  );

  let changed = 0;

  for (const entry of roster) {
    const printer = normalizeRosterPrinter(entry.printer);
    const personKey = [
      entry.nama.trim().toLowerCase(),
      entry.departement.trim().toLowerCase(),
      printer.toLowerCase(),
    ].join('|');
    const emptyColorRow = emptyColorRows.get(personKey);

    for (const color of rosterColors) {
      const colorKey = `${personKey}|${color.toLowerCase()}`;
      if (existing.has(colorKey)) continue;

      if (color === rosterColors[0] && emptyColorRow) {
        await query(
          'UPDATE printer_refills SET warna = $1 WHERE id = $2',
          [color, emptyColorRow.id]
        );
        emptyColorRows.delete(personKey);
      } else {
        await query(
          `INSERT INTO printer_refills
            (nama, departement, printer, warna, tanggal_terakhir, catatan)
           VALUES ($1, $2, $3, $4, $5, '')`,
          [entry.nama.trim(), entry.departement.trim(), printer, color, null]
        );
      }

      existing.add(colorKey);
      changed++;
    }
  }

  return changed;
}

async function initDb() {
  if (pool) {
    throw new Error('Database PostgreSQL sudah diinisialisasi.');
  }

  pool = new Pool(dbConfig);
  pool.on('error', error => {
    console.error('Koneksi PostgreSQL idle mengalami kesalahan:', error);
  });

  try {
    await pool.query('SELECT 1');
    await pool.query(`
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
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refill_history (
        id SERIAL PRIMARY KEY,
        refill_id INT REFERENCES printer_refills(id) ON DELETE CASCADE,
        nama VARCHAR(255),
        tanggal_refill DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      'ALTER TABLE printer_refills ALTER COLUMN tanggal_terakhir DROP NOT NULL'
    );

    const added = await syncPrinterRoster();
    if (added) console.log(`🌱 ${added} data printer baru ditambahkan.`);
    console.log('✅ PostgreSQL berhasil diinisialisasi.');
  } catch (error) {
    await pool.end();
    pool = null;
    throw new Error(`Gagal menginisialisasi PostgreSQL: ${error.message}`);
  }
}

module.exports = {
  initDb,
  query,
  syncPrinterRoster,
};
