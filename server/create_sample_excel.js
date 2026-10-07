const XLSX = require('xlsx');
const path = require('path');

const sampleData = [
  { nama: 'Budi Santoso', departement: 'Keuangan', printer: 'Epson L3110', warna: 'Hitam', tanggal: '2026-07-15' },
  { nama: 'Siti Rahma', departement: 'HRD', printer: 'Canon Pixma G2010', warna: 'Magenta', tanggal: '2026-08-10' },
  { nama: 'Agus Pratama', departement: 'IT Support', printer: 'HP Smart Tank 515', warna: 'Biru', tanggal: '2026-09-20' },
  { nama: 'Dewi Lestari', departement: 'Pemasaran', printer: 'Epson L3150', warna: 'Kuning', tanggal: '2026-07-01' },
  { nama: 'Rudi Hermawan', departement: 'Operasional', printer: 'Epson L3210', warna: 'Hitam', tanggal: '2026-09-25' },
  { nama: 'Nina Kartika', departement: 'Gudang', printer: 'Brother DCP-T520W', warna: 'Magenta', tanggal: '2026-07-20' },
  { nama: 'Hendra Gunawan', departement: 'Keuangan', printer: 'Canon G3010', warna: 'Kuning', tanggal: '2026-08-01' }
];

const worksheet = XLSX.utils.json_to_sheet(sampleData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Printer');

const outputPath = path.join(__dirname, '..', 'sample_printer_data.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log('✅ File sampel Excel berhasil dibuat di:', outputPath);
