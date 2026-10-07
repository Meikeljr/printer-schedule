import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
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

export default function App() {
  const [refills, setRefills] = useState([]);
  const [stats, setStats] = useState({ total: 0, overdue: 0, warning: 0, ok: 0 });
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
        status: statusFilter,
      }).toString();

      const [resData, resStats] = await Promise.all([
        fetch(`/api/refills?${queryParams}`).then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ]);

      if (resData.success) {
        setRefills(resData.data);
        setDbMode(resData.dbMode);
      }
      if (resStats.success) {
        setStats(resStats.stats);
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, deptFilter, colorFilter, statusFilter]);

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
    if (window.confirm(`Konfirmasi isi ulang printer "${item.printer}" warna (${item.warna}) untuk PIC ${item.nama} pada hari ini (${today})?`)) {
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
            <p>Jadwal, Pengingat 2 Bulan, & Riwayat Pemeliharaan Tinta Printer</p>
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

      {/* Reminder Alert Banner (If Overdue printers exist) */}
      {stats.overdue > 0 && (
        <div className="reminder-banner">
          <div className="banner-content">
            <AlertTriangle className="banner-icon" size={26} />
            <div>
              <div className="banner-title">
                Pengingat Isi Ulang: {stats.overdue} Tinta Printer Perlu Segera Diisi Ulang!
              </div>
              <div className="banner-desc">
                Sudah lebih dari 2 bulan (60 hari) sejak pengisian tinta terakhir. Harap periksa daftar di bawah.
              </div>
            </div>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setStatusFilter('overdue')}
          >
            Lihat Printer Perlu Refill
          </button>
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Total Tinta Printer</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-icon-bg icon-blue">
            <Printer size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setStatusFilter('overdue')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Perlu Refill (&ge; 60 Hari)</h3>
            <div className="stat-value" style={{ color: '#f43f5e' }}>{stats.overdue}</div>
          </div>
          <div className="stat-icon-bg icon-red">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setStatusFilter('warning')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Mendekati (45-59 Hari)</h3>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.warning}</div>
          </div>
          <div className="stat-icon-bg icon-amber">
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card" onClick={() => setStatusFilter('ok')} style={{ cursor: 'pointer' }}>
          <div className="stat-info">
            <h3>Kondisi Aman (&lt; 45 Hari)</h3>
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.ok}</div>
          </div>
          <div className="stat-icon-bg icon-emerald">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

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

            {/* Status Filter */}
            <select
              className="select-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status Tenggat</option>
              <option value="overdue">🔴 Perlu Refill (&ge; 60 Hari)</option>
              <option value="warning">🟡 Mendekati (45-59 Hari)</option>
              <option value="ok">🟢 Aman (&lt; 45 Hari)</option>
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setDeptFilter('all');
                setColorFilter('all');
                setStatusFilter('all');
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
                  <th>Merk / Tipe Printer</th>
                  <th>Warna Tinta</th>
                  <th>Tgl Terakhir Isi</th>
                  <th>Tenggat (2 Bulan)</th>
                  <th>Status Pengingat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {refills.map((item, idx) => {
                  const warnaClass = `ink-${item.warna.toLowerCase().replace('cyan', 'biru').replace('yellow', 'kuning')}`;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <User size={16} style={{ color: 'var(--accent-blue)' }} />
                          {item.nama}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                          <Building size={15} /> {item.departement}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{item.printer}</td>
                      <td>
                        <span className={`ink-badge ${warnaClass}`}>
                          <span className="ink-dot"></span>
                          {item.warna}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {item.tanggal_terakhir}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {item.tgl_tenggat}
                        </span>
                      </td>
                      <td>
                        {item.status === 'overdue' && (
                          <span className="status-badge status-overdue">
                            <AlertTriangle size={14} />
                            Perlu Refill ({item.selisih_hari} Hari)
                          </span>
                        )}
                        {item.status === 'warning' && (
                          <span className="status-badge status-warning">
                            <Clock size={14} />
                            Mendekati ({item.selisih_hari} Hari)
                          </span>
                        )}
                        {item.status === 'ok' && (
                          <span className="status-badge status-ok">
                            <CheckCircle size={14} />
                            Aman ({item.selisih_hari} Hari)
                          </span>
                        )}
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
                <label>Merk / Tipe Printer</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Contoh: Epson L3110 / Canon G2010"
                  value={formData.printer}
                  onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
                />
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
                  Gunakan variabel kolom: <strong>nama, departement, printer, warna, tanggal</strong>
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
                💡 <strong>Petunjuk Sampel File Excel:</strong><br />
                File sampel telah disediakan di folder sistem Anda: <br />
                <code>C:\Users\Meikel\Documents\Printer\sample_printer_data.xlsx</code>
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
              <strong>Printer:</strong> {editingItem.printer} ({editingItem.warna})<br />
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
