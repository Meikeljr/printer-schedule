const mysql = require('mysql2/promise');
const printerRoster = require('./printer_roster.json');
require('dotenv').config();

let pool = null;

function getDbConfig() {
  const connectionString = process.env.DATABASE_URL?.trim();
  let config;

  if (connectionString) {
    const url = new URL(connectionString);
    if (!['mysql:', 'mysql2:'].includes(url.protocol)) {
      throw new Error('DATABASE_URL harus menggunakan protokol mysql:// atau mysql2://.');
    }

    config = {
      host: url.hostname,
      port: Number.parseInt(url.port || '3306', 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\/+/, '')),
    };
  } else {
    config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'printer_refill_db',
    };
  }

  if (!config.user || !config.password || !config.database) {
    throw new Error('DB_USER, DB_PASSWORD, dan DB_NAME wajib dikonfigurasi.');
  }

  return {
    ...config,
    ...(process.env.DB_SSL === 'true' ? { ssl: {} } : {}),
    waitForConnections: true,
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    connectTimeout: 5000,
    dateStrings: true,
  };
}

const rosterColors = ['Hitam', 'Magenta', 'Biru', 'Kuning'];

function normalizeRosterPrinter(value) {
  const printer = String(value || '').trim();
  if (!printer) return '';

  const normalized = printer.toLowerCase().replace(/\s+/g, ' ').replace(/[_-]+/g, ' ').trim();

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
    normalized === 'brother lc400 lc77xl' ||
    normalized === 'lc400' ||
    normalized === 'lc77xl' ||
    normalized === 'brother mfc j6710dw' ||
    normalized === 'mfc j6710dw' ||
    /(^|[^a-z0-9])mfc[- ]?j\s*6710dw([^a-z0-9]|$)/i.test(printer) ||
    /(^|[^a-z0-9])lc(?:400|77xl)([^a-z0-9]|$)/i.test(printer)
  ) {
    return 'Brother LC400 / LC77XL';
  }

  return printer;
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database MySQL belum diinisialisasi.');
  }

  const [result] = await pool.execute(text, params);
  return result;
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
          'UPDATE printer_refills SET warna = ? WHERE id = ?',
          [color, emptyColorRow.id]
        );
        emptyColorRows.delete(personKey);
      } else {
        await query(
          `INSERT INTO printer_refills
            (nama, departement, printer, warna, tanggal_terakhir, catatan)
           VALUES (?, ?, ?, ?, ?, '')`,
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
    throw new Error('Database MySQL sudah diinisialisasi.');
  }

  pool = mysql.createPool(getDbConfig());

  try {
    await pool.query('SELECT 1');
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refill_history (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        refill_id INT UNSIGNED,
        nama VARCHAR(255),
        tanggal_refill DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_refill_history_refill
          FOREIGN KEY (refill_id) REFERENCES printer_refills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const added = await syncPrinterRoster();
    if (added) console.log(`🌱 ${added} data printer baru ditambahkan.`);
    console.log('✅ MySQL berhasil diinisialisasi.');
  } catch (error) {
    await pool.end();
    pool = null;
    throw new Error(`Gagal menginisialisasi MySQL: ${error.message}`);
  }
}

module.exports = {
  initDb,
  query,
  syncPrinterRoster,
  normalizeRosterPrinter,
};
