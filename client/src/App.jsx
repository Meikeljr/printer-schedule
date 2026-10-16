import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Calendar,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  UploadCloud,
  History,
  X,
  Database,
  User,
  Building,
  Droplet
} from 'lucide-react';

const inkTypeOptions = [
  { value: 'Epson 664', models: 'L110, L120, L360' },
  { value: 'Epson 003', models: 'L3110, L3210, L3250, L3251' },
  { value: 'Brother LC400 / LC77XL', models: 'Brother MFC-J6710DW' },
];

export default function App() {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    departement: '',
    printer: '',
    warna: 'Hitam',
    tanggal_terakhir: new Date().toISOString().split('T')[0],
    catatan: '',
  });

  // Excel File State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        department: deptFilter,
        color: colorFilter,
      }).toString();

      const resData = await fetch(`/api/refills?${queryParams}`).then(r => r.json());

      if (resData.success) {
        setRefills(resData.data);
        setDbMode(resData.dbMode);
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, deptFilter, colorFilter]);

  // Handle Create / Update Data
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem ? `/api/refills/${editingItem.id}` : '/api/refills';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowFormModal(false);
        resetForm();
        fetchData();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  // Quick Refill Date Update to Today
  const handleQuickRefill = async (item) => {
    const today = new Date().toISOString().split('T')[0];
    if (window.confirm(`Konfirmasi isi ulang tinta "${item.printer}" warna (${item.warna}) untuk PIC ${item.nama} pada hari ini (${today})?`)) {
      try {
        const res = await fetch(`/api/refills/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            tanggal_terakhir: today,
            catatan: `Diisi ulang pada ${today}`,
          }),
        });
        const data = await res.json();
        if (data.success) {
          fetchData();
        }
      } catch (err) {
        alert('Gagal meng-update: ' + err.message);
      }
    }
  };

  // Delete Data
  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data isi ulang printer ini?')) {
      try {
        const res = await fetch(`/api/refills/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchData();
        }
      } catch (err) {
        alert('Gagal menghapus: ' + err.message);
      }
    }
  };

  // Fetch History
  const handleShowHistory = async (item) => {
    try {
      const res = await fetch(`/api/history/${item.id}`).then(r => r.json());
      if (res.success) {
        setHistoryData(res.data);
        setEditingItem(item);
        setShowHistoryModal(true);
      }
    } catch (err) {
      alert('Gagal memuat riwayat: ' + err.message);
    }
  };

  // Handle Excel Upload
  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Pilih file Excel terlebih dahulu!');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', uploadFile);

    try {
      const res = await fetch('/api/refills/import-excel', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowImportModal(false);
        setUploadFile(null);
        fetchData();
      } else {
        alert('Gagal mengimpor: ' + data.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan unggah: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      departement: item.departement,
      printer: item.printer,
      warna: item.warna,
      tanggal_terakhir: item.tanggal_terakhir,
      catatan: item.catatan || '',
    });
    setShowFormModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      nama: '',
      departement: '',
      printer: '',
      warna: 'Hitam',
      tanggal_terakhir: new Date().toISOString().split('T')[0],
      catatan: '',
    });
  };

  // List of Unique Departments
  const departments = Array.from(new Set(refills.map(r => r.departement))).filter(Boolean);

  return (
    <div className="app-container">
      {/* Header Section */}
      <header className="app-header">
        <div className="brand-title">
          <div className="brand-icon">
            <Printer size={28} />
          </div>
          <div>
            <h1>Sistem Isi Ulang Tinta Printer</h1>
            <p>Pencatatan isi ulang dan jumlah hari sejak pengisian terakhir</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="btn btn-secondary btn-sm" title="Mode Server Database">
            <Database size={15} /> DB: {dbMode === 'pg' ? 'PostgreSQL' : 'SQLite (Fallback)'}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <FileSpreadsheet size={18} /> Impor Excel
          </button>
          <a
            href="/api/refills/export-excel"
            className="btn btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            <Download size={18} /> Ekspor Excel
          </a>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowFormModal(true);
            }}
          >
            <Plus size={18} /> Tambah Printer
          </button>
        </div>
      </header>

      {/* Main Table Card */}
      <div className="main-card">
        {/* Search & Filters */}
        <div className="card-header-tools">
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Cari nama, departemen, atau merk printer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            {/* Dept Filter */}
            <select
              className="select-input"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Ink Color Filter */}
            <select
              className="select-input"
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
            >
              <option value="all">Semua Warna Tinta</option>
              <option value="Hitam">Hitam</option>
              <option value="Magenta">Magenta</option>
              <option value="Biru">Biru (Cyan)</option>
              <option value="Kuning">Kuning (Yellow)</option>
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setDeptFilter('all');
                setColorFilter('all');
              }}
              title="Reset Filter"
            >
              <RefreshCw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          {loading ? (
            <div className="empty-state">Memuat data...</div>
          ) : refills.length === 0 ? (
            <div className="empty-state">
              <Printer className="empty-icon" />
              <p>Tidak ada data printer ditemukan.</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama (PIC)</th>
                  <th>Departemen</th>
                  <th>Jenis Tinta Printer</th>
                  <th>Warna Tinta</th>
                  <th>Tanggal</th>
                  <th>Hari</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {refills.map((item, idx) => {
                  const warnaClass = `ink-${item.warna.toLowerCase().replace('cyan', 'biru').replace('yellow', 'kuning')}`;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: '#334155' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#0f172a' }}>
                          <User size={16} style={{ color: '#1d4ed8' }} />
                          {item.nama}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 500 }}>
                          <Building size={15} /> {item.departement}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.printer}</td>
                      <td>
                        <span className={`ink-badge ${warnaClass}`}>
                          <span className="ink-dot"></span>
                          {item.warna}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
                          <Calendar size={14} style={{ color: '#1d4ed8' }} />
                          {item.tanggal_terakhir}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>
                          {item.selisih_hari} hari
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleQuickRefill(item)}
                            title="Update tanggal isi ulang ke Hari Ini"
                          >
                            <RefreshCw size={13} /> Isi Ulang
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleShowHistory(item)}
                            title="Riwayat Isi Ulang"
                          >
                            <History size={13} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(item)}
                            title="Edit Data"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.id)}
                            title="Hapus Data"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal 1: Input / Edit Data */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Data Printer' : 'Tambah Data Printer Baru'}</h2>
              <button className="close-btn" onClick={() => setShowFormModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label>Nama PIC (Petugas / Pengguna)</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Departemen</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="Contoh: Keuangan"
                    value={formData.departement}
                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Warna Tinta</label>
                  <select
                    className="form-input"
                    value={formData.warna}
                    onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                  >
                    <option value="Hitam">Hitam</option>
                    <option value="Magenta">Magenta</option>
                    <option value="Biru">Biru (Cyan)</option>
                    <option value="Kuning">Kuning (Yellow)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Jenis Tinta Printer</label>
                <select
                  className="form-input"
                  required
                  value={formData.printer}
                  onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
                >
                  <option value="" disabled>Pilih jenis tinta printer</option>
                  {formData.printer && !inkTypeOptions.some((option) => option.value === formData.printer) && (
                    <option value={formData.printer}>{formData.printer} (data lama)</option>
                  )}
                  {inkTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} — {option.models}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tanggal Isi Ulang Terakhir</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.tanggal_terakhir}
                  onChange={(e) => setFormData({ ...formData, tanggal_terakhir: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Catatan (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Catatan pengisian..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFormModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Import Excel */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Impor Data dari Excel</h2>
              <button className="close-btn" onClick={() => setShowImportModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadExcel}>
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current.click()}
              >
                <UploadCloud className="upload-icon" />
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {uploadFile ? uploadFile.name : 'Klik untuk memilih file Excel (.xlsx / .xls)'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Format sampel: <strong>ID, Nama, Departement, Printer, Jenis Tinta, Tanggal</strong>
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', fontSize: '0.825rem' }}>
                💡 Kolom <strong>Printer</strong> berisi kode jenis tinta (003 atau 664), sedangkan <strong>Jenis Tinta</strong> berisi warna (Hitam, Magenta, Biru, atau Kuning). Kolom <strong>ID</strong> opsional dan tidak diimpor.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={uploading}
                >
                  {uploading ? 'Mengunggah...' : 'Proses Impor Excel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: History Modal */}
      {showHistoryModal && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Riwayat Isi Ulang Printer</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
              <strong>Jenis tinta:</strong> {editingItem.printer} ({editingItem.warna})<br />
              <strong>PIC:</strong> {editingItem.nama} ({editingItem.departement})
            </div>

            <div className="history-list">
              {historyData.length === 0 ? (
                <div style={{ padding: '16px', textCenter: 'center', color: 'var(--text-muted)' }}>
                  Belum ada riwayat pengisian ulang.
                </div>
              ) : (
                historyData.map((h, i) => (
                  <div key={i} className="history-item">
                    <span>
                      <strong>Tgl:</strong> {h.tanggal_refill}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Petugas: {h.nama || editingItem.nama}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
