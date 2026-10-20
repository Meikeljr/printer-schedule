const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const printerRoster = require('./printer_roster.json');

let sqliteDb = null;

const dbPath = path.resolve(__dirname, process.env.SQLITE_DB_PATH || 'printer_database.sqlite');

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

// Helper untuk menjalankan query SQLite
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

// Helper untuk mengambil banyak baris
function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Helper untuk mengambil satu baris
function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Sinkronisasi daftar printer dari printer_roster.json
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
        row.warna.trim().toLowerCase()
      ].join('|'))
  );

  const emptyColorRows = new Map(
    rows
      .filter(row => !row.warna)
      .map(row => [
        [
          row.nama.trim().toLowerCase(),
          row.departement.trim().toLowerCase(),
          normalizeRosterPrinter(row.printer).toLowerCase()
        ].join('|'),
        row
      ])
  );

  let changed = 0;

  for (const entry of roster) {
    const printer = normalizeRosterPrinter(entry.printer);

    const personKey = [
      entry.nama.trim().toLowerCase(),
      entry.departement.trim().toLowerCase(),
      printer.toLowerCase()
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
          [
            entry.nama.trim(),
            entry.departement.trim(),
            printer,
            color,
            null
          ]
        );
      }

      existing.add(colorKey);
      changed++;
    }
  }

  return changed;
}

// Inisialisasi SQLite secara langsung
async function initDb() {
  if (sqliteDb) {
    throw new Error('Database SQLite sudah diinisialisasi.');
  }

  sqliteDb = new sqlite3.Database(dbPath);

  try {
    await runSql('PRAGMA foreign_keys = ON');

    await runSql(`
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

    await runSql(`
      CREATE TABLE IF NOT EXISTS refill_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        refill_id INTEGER,
        nama TEXT,
        tanggal_refill TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (refill_id)
          REFERENCES printer_refills(id)
          ON DELETE CASCADE
      )
    `);

    // Pastikan database dapat dibaca
    await getSql('SELECT 1');

    // Tambahkan printer yang belum terdaftar tanpa menghapus data lama
    const added = await syncPrinterRoster();

    if (added) {
      console.log(`🌱 ${added} data printer baru ditambahkan.`);
    }

    console.log('✅ SQLite berhasil diinisialisasi.');
    console.log('📁 Lokasi database:', dbPath);
  } catch (err) {
    await new Promise(resolve => {
      sqliteDb.close(() => resolve());
    });

    sqliteDb = null;

    throw new Error(`Gagal menginisialisasi SQLite: ${err.message}`);
  }
}

// Wrapper query untuk mempertahankan kompatibilitas dengan backend
async function query(text, params = []) {
  if (!sqliteDb) {
    throw new Error('Database SQLite belum diinisialisasi.');
  }

  const sqlText = text.replace(/\$\d+/g, '?');
  const normalizedSql = sqlText.trim().toUpperCase();

  if (/^(SELECT|PRAGMA|WITH)\b/.test(normalizedSql)) {
    return allSql(sqlText, params);
  }

  const result = await runSql(sqlText, params);

  return [{
    id: result.id,
    changes: result.changes
  }];
}

module.exports = {
  initDb,
  query,
  syncPrinterRoster
};