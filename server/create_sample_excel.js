const XLSX = require('xlsx');
const path = require('path');

const sampleData = [
  { ID: 'PMK-1', Nama: 'Budi Santoso', Departement: 'Keuangan', Printer: '664', 'Jenis Tinta': 'Hitam', Tanggal: '2026-07-15' },
  { ID: 'PMK-2', Nama: 'Siti Rahma', Departement: 'HRD', Printer: '664', 'Jenis Tinta': 'Magenta', Tanggal: '2026-08-10' },
  { ID: 'PMK-3', Nama: 'Agus Pratama', Departement: 'IT Support', Printer: '003', 'Jenis Tinta': 'Biru', Tanggal: '2026-09-20' },
  { ID: 'PMK-4', Nama: 'Dewi Lestari', Departement: 'Pemasaran', Printer: '003', 'Jenis Tinta': 'Kuning', Tanggal: '2026-07-01' },
  { ID: 'PMK-5', Nama: 'Rudi Hermawan', Departement: 'Operasional', Printer: '003', 'Jenis Tinta': 'Hitam', Tanggal: '2026-09-25' },
  { ID: 'PMK-6', Nama: 'Nina Kartika', Departement: 'Gudang', Printer: '664', 'Jenis Tinta': 'Magenta', Tanggal: '2026-07-20' },
  { ID: 'PMK-7', Nama: 'Hendra Gunawan', Departement: 'Keuangan', Printer: '664', 'Jenis Tinta': 'Kuning', Tanggal: '2026-08-01' }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Printer');

const outputPath = path.join(__dirname, '..', 'sample_printer_data.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log('✅ File sampel Excel berhasil dibuat di:', outputPath);
