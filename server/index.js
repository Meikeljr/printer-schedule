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

// Fungsi Bantu: Hitung Selisih Hari dan Status Pengingat (2 Bulan / 60 Hari)
function processRefillItem(item) {
  const lastDate = new Date(item.tanggal_terakhir);
  const today = new Date();
  
  // Normalisasi ke jam 00:00:00 untuk komparasi tanggal murni
  const d1 = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = d2 - d1;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Tanggal Jatuh Tempo (Tanggal Terakhir + 60 hari)
  const dueDate = new Date(d1);
  dueDate.setDate(dueDate.getDate() + 60);

  let status = 'ok'; // Aman
  let statusText = 'Aman';

  if (diffDays >= 60) {
    status = 'overdue'; // Perlu Isi Ulang (>= 2 Bulan)
    statusText = 'Perlu Isi Ulang';
  } else if (diffDays >= 45) {
    status = 'warning'; // Mendekati Tenggat (45-59 hari)
    statusText = 'Mendekati Tenggat';
  }

  return {
    ...item,
    tanggal_terakhir: item.tanggal_terakhir ? new Date(item.tanggal_terakhir).toISOString().split('T')[0] : '',
    tgl_tenggat: dueDate.toISOString().split('T')[0],
    selisih_hari: diffDays,
    sisa_hari: 60 - diffDays,
    status,
    statusText,
  };
}

// 1. GET /api/refills - Mengambil semua data isi ulang
app.get('/api/refills', async (req, res) => {
  try {
    const { search, department, color, status } = req.query;
    let sql = 'SELECT * FROM printer_refills ORDER BY tanggal_terakhir ASC';
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

    if (status && status !== 'all') {
      items = items.filter(i => i.status === status);
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

// 2. GET /api/stats - Ringkasan Statistik
app.get('/api/stats', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM printer_refills');
    const items = rows.map(processRefillItem);

    const stats = {
      total: items.length,
      overdue: items.filter(i => i.status === 'overdue').length,
      warning: items.filter(i => i.status === 'warning').length,
      ok: items.filter(i => i.status === 'ok').length,
    };

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/refills - Tambah Data Manual
app.post('/api/refills', async (req, res) => {
  try {
    const { nama, departement, printer, warna, tanggal_terakhir, catatan } = req.body;

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

// 4. PUT /api/refills/:id - Perbarui Tanggal Isi Ulang Terakhir / Data
app.put('/api/refills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, departement, printer, warna, tanggal_terakhir, catatan, updated_by } = req.body;

    // Ambil data lama
    const oldRows = await db.query('SELECT * FROM printer_refills WHERE id = $1', [id]);
    if (!oldRows || oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const oldData = oldRows[0];
    const newDate = tanggal_terakhir || new Date().toISOString().split('T')[0];
    const newName = nama || oldData.nama;
    const newDept = departement || oldData.departement;
    const newPrinter = printer || oldData.printer;
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

// 5. DELETE /api/refills/:id - Hapus Data
app.delete('/api/refills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM printer_refills WHERE id = $1', [id]);
    res.json({ success: true, message: 'Data berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. GET /api/history/:refill_id - Riwayat Isi Ulang Printer
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

// 7. POST /api/refills/import-excel - Import Data Excel
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
        for (const k of Object.keys(row)) {
          const cleanK = k.trim().toLowerCase();
          if (keys.includes(cleanK)) return row[k];
        }
        return '';
      };

      const nama = findVal(['nama', 'name', 'pic', 'petugas']);
      const departement = findVal(['departement', 'departemen', 'department', 'dept']);
      const printer = findVal(['printer', 'merk printer', 'tipe printer', 'model']);
      const warna = findVal(['warna', 'color', 'warna tinta', 'tinta']);
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

// 8. GET /api/refills/export-excel - Export Data ke Excel
app.get('/api/refills/export-excel', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM printer_refills ORDER BY tanggal_terakhir ASC');
    const items = rows.map(processRefillItem);

    const exportData = items.map((item, index) => ({
      No: index + 1,
      Nama: item.nama,
      Departement: item.departement,
      Printer: item.printer,
      Warna: item.warna,
      'Tanggal Isi Ulang Terakhir': item.tanggal_terakhir,
      'Tanggal Tenggat (2 Bulan)': item.tgl_tenggat,
      'Selisih Hari': item.selisih_hari,
      Status: item.statusText,
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
