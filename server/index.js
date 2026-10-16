const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const inkTypeByModel = [
  { inkType: 'Epson 664', models: ['L110', 'L120', 'L360'] },
  { inkType: 'Epson 003', models: ['L3110', 'L3210', 'L3250', 'L3251'] },
  { inkType: 'Brother LC400 / LC77XL', models: ['MFC-J6710DW'] },
];

function normalizeInkType(value) {
  const printer = String(value || '').trim();
  const normalized = printer.toLowerCase().replace(/\s+/g, ' ');
  const matchingType = inkTypeByModel.find(({ inkType, models }) =>
    inkType.toLowerCase() === normalized ||
    inkType.toLowerCase().endsWith(` ${normalized}`) ||
    (/^\d{1,3}$/.test(normalized) && inkType.toLowerCase().endsWith(` ${normalized.padStart(3, '0')}`)) ||
    models.some(model => new RegExp(`(^|[^a-z0-9])${model}([^a-z0-9]|$)`, 'i').test(printer))
  );

  return matchingType ? matchingType.inkType : printer;
}

app.use(cors());
app.use(express.json());

// Konfigurasi Multer untuk Unggah File Excel
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx, .xls, .csv) yang diperbolehkan!'));
    }
  },
});

// Fungsi Bantu: Hitung jumlah hari sejak isi ulang terakhir
function processRefillItem(item) {
  const lastDate = new Date(item.tanggal_terakhir);
  const today = new Date();
  
  // Normalisasi ke jam 00:00:00 untuk komparasi tanggal murni
  const d1 = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = d2 - d1;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    ...item,
    printer: normalizeInkType(item.printer),
    tanggal_terakhir: item.tanggal_terakhir ? new Date(item.tanggal_terakhir).toISOString().split('T')[0] : '',
    selisih_hari: diffDays,
  };
}

// 1. GET /api/refills - Mengambil semua data isi ulang
app.get('/api/refills', async (req, res) => {
  try {
    const { search, department, color } = req.query;
    const sql = 'SELECT * FROM printer_refills ORDER BY tanggal_terakhir ASC';
    const rows = await db.query(sql);

    let items = rows.map(processRefillItem);

    // Filter di memori untuk fleksibilitas maksimal
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        i =>
          i.nama.toLowerCase().includes(q) ||
          i.departement.toLowerCase().includes(q) ||
          i.printer.toLowerCase().includes(q)
      );
    }

    if (department && department !== 'all') {
      items = items.filter(i => i.departement.toLowerCase() === department.toLowerCase());
    }

    if (color && color !== 'all') {
      items = items.filter(i => i.warna.toLowerCase() === color.toLowerCase());
    }

    res.json({
      success: true,
      data: items,
      dbMode: db.getMode(),
    });
  } catch (err) {
    console.error('Error GET /api/refills:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/refills - Tambah Data Manual
app.post('/api/refills', async (req, res) => {
  try {
    const { nama, departement, warna, tanggal_terakhir, catatan } = req.body;
    const printer = normalizeInkType(req.body.printer);

    if (!nama || !departement || !printer || !warna || !tanggal_terakhir) {
      return res.status(400).json({
        success: false,
        message: 'Variabel nama, departement, printer, warna, dan tanggal_terakhir wajib diisi!',
      });
    }

    const mode = db.getMode();
    let insertId = null;

    if (mode === 'pg') {
      const sql = `
        INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `;
      const result = await db.query(sql, [nama, departement, printer, warna, tanggal_terakhir, catatan || '']);
      insertId = result[0].id;
      
      // Catat ke riwayat
      await db.query('INSERT INTO refill_history (refill_id, nama, tanggal_refill) VALUES ($1, $2, $3)', [
        insertId,
        nama,
        tanggal_terakhir,
      ]);
    } else {
      const sql = `
        INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      const result = await db.query(sql, [nama, departement, printer, warna, tanggal_terakhir, catatan || '']);
      insertId = result[0].id;

      await db.query('INSERT INTO refill_history (refill_id, nama, tanggal_refill) VALUES ($1, $2, $3)', [
        insertId,
        nama,
        tanggal_terakhir,
      ]);
    }

    res.json({
      success: true,
      message: 'Data isi ulang printer berhasil ditambahkan!',
      id: insertId,
    });
  } catch (err) {
    console.error('Error POST /api/refills:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. PUT /api/refills/:id - Perbarui Tanggal Isi Ulang Terakhir / Data
app.put('/api/refills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, departement, warna, tanggal_terakhir, catatan, updated_by } = req.body;

    // Ambil data lama
    const oldRows = await db.query('SELECT * FROM printer_refills WHERE id = $1', [id]);
    if (!oldRows || oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const oldData = oldRows[0];
    const newDate = tanggal_terakhir || new Date().toISOString().split('T')[0];
    const newName = nama || oldData.nama;
    const newDept = departement || oldData.departement;
    const newPrinter = normalizeInkType(req.body.printer) || oldData.printer;
    const newWarna = warna || oldData.warna;
    const newCatatan = catatan !== undefined ? catatan : oldData.catatan;

    const sql = `
      UPDATE printer_refills 
      SET nama = $1, departement = $2, printer = $3, warna = $4, tanggal_terakhir = $5, catatan = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `;
    await db.query(sql, [newName, newDept, newPrinter, newWarna, newDate, newCatatan, id]);

    // Tambah entri ke riwayat jika tanggal berubah atau diperbarui
    await db.query('INSERT INTO refill_history (refill_id, nama, tanggal_refill) VALUES ($1, $2, $3)', [
      id,
      updated_by || newName,
      newDate,
    ]);

    res.json({
      success: true,
      message: 'Tanggal isi ulang printer berhasil diperbarui!',
    });
  } catch (err) {
    console.error('Error PUT /api/refills/:id:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. DELETE /api/refills/:id - Hapus Data
app.delete('/api/refills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM printer_refills WHERE id = $1', [id]);
    res.json({ success: true, message: 'Data berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET /api/history/:refill_id - Riwayat Isi Ulang Printer
app.get('/api/history/:refill_id', async (req, res) => {
  try {
    const { refill_id } = req.params;
    const rows = await db.query(
      'SELECT * FROM refill_history WHERE refill_id = $1 ORDER BY tanggal_refill DESC, created_at DESC',
      [refill_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper parsing tanggal Excel
function parseExcelDate(excelDate) {
  if (!excelDate) return new Date().toISOString().split('T')[0];

  if (excelDate instanceof Date) {
    return excelDate.toISOString().split('T')[0];
  }

  if (typeof excelDate === 'number') {
    // Tanggal serial Excel (misal 45200)
    const dateObj = XLSX.SSF.parse_date_code(excelDate);
    if (dateObj) {
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (typeof excelDate === 'string') {
    // Coba format DD/MM/YYYY atau YYYY-MM-DD
    const parts = excelDate.trim().split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const d = new Date(excelDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  return new Date().toISOString().split('T')[0];
}

// 6. POST /api/refills/import-excel - Import Data Excel
app.post('/api/refills/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Harap unggah file Excel!' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let countAdded = 0;

    for (const row of rawData) {
      // Cari nama kolom yang cocok (toleransi huruf besar/kecil & variasi nama kolom)
      const findVal = (keys) => {
        for (const key of keys) {
          const matchingKey = Object.keys(row).find(k => k.trim().toLowerCase() === key);
          if (matchingKey !== undefined) return row[matchingKey];
        }
        return '';
      };

      const nama = findVal(['nama', 'name', 'pic', 'petugas']);
      const departement = findVal(['departement', 'departemen', 'department', 'dept']);
      const printerValue = findVal([
        'printer',
        'jenis printer',
        'jenis_printer',
        'jenis tinta',
        'jenis_tinta',
        'jenis tinta printer',
        'tipe tinta',
        'tipe tinta printer',
        'ink type',
        'merk printer',
        'tipe printer',
        'model',
      ]);
      const printer = normalizeInkType(printerValue);
      const explicitColor = findVal(['warna', 'color', 'warna tinta', 'warna_tinta']);
      const warna = explicitColor || (
        Object.keys(row).some(key => ['printer', 'jenis printer', 'jenis_printer'].includes(key.trim().toLowerCase()))
          ? findVal(['jenis tinta', 'jenis_tinta', 'tinta'])
          : ''
      );
      const rawTanggal = findVal(['tanggal', 'date', 'tanggal_terakhir', 'tgl_isi_ulang', 'tgl terakhir']);
      const catatan = findVal(['catatan', 'notes', 'keterangan']) || 'Diimpor dari Excel';

      if (nama && printer && warna) {
        const tanggal = parseExcelDate(rawTanggal);
        const mode = db.getMode();
        let insertId = null;

        if (mode === 'pg') {
          const resIns = await db.query(
            `INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [nama, departement || 'General', printer, warna, tanggal, catatan]
          );
          insertId = resIns[0].id;
        } else {
          const resIns = await db.query(
            `INSERT INTO printer_refills (nama, departement, printer, warna, tanggal_terakhir, catatan)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [nama, departement || 'General', printer, warna, tanggal, catatan]
          );
          insertId = resIns[0].id;
        }

        await db.query('INSERT INTO refill_history (refill_id, nama, tanggal_refill) VALUES ($1, $2, $3)', [
          insertId,
          nama,
          tanggal,
        ]);
        countAdded++;
      }
    }

    // Hapus file temporary
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Berhasil mengimpor ${countAdded} data dari file Excel!`,
      count: countAdded,
    });
  } catch (err) {
    console.error('Error import excel:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Gagal memproses file Excel: ' + err.message });
  }
});

// 7. GET /api/refills/export-excel - Export Data ke Excel
app.get('/api/refills/export-excel', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM printer_refills ORDER BY tanggal_terakhir ASC');
    const items = rows.map(processRefillItem);

    const exportData = items.map((item, index) => ({
      No: index + 1,
      Nama: item.nama,
      Departement: item.departement,
      'Jenis Tinta Printer': item.printer,
      Warna: item.warna,
      'Tanggal Isi Ulang Terakhir': item.tanggal_terakhir,
      'Hari Sejak Isi Ulang': item.selisih_hari,
      Catatan: item.catatan || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Isi Ulang Printer');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Isi_Ulang_Printer.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Inisialisasi Database dan Jalankan Server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server Backend berjalan di http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Terjadi kesalahan saat inisialisasi database:', err);
});
