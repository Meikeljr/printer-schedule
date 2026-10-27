import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Printer,
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
  User,
  Building,
  Clock3,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
} from 'lucide-react';

const inkTypeOptions = [
  { value: 'Epson 664', models: 'L110, L120, L360' },
  { value: 'Epson 003', models: 'L3110, L3210, L3250, L3251' },
  { value: 'Brother LC400 / LC77XL', models: 'Brother MFC-J6710DW' },
];

function normalizeGroupValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getGroupKey(item) {
  return JSON.stringify([
    normalizeGroupValue(item.nama),
    normalizeGroupValue(item.departement),
    normalizeGroupValue(item.printer),
  ]);
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDaysSinceRefill(value, today = new Date()) {
  const lastDate = parseLocalDate(value);
  if (!lastDate) return null;
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((currentDate.getTime() - lastDate.getTime()) / 86400000);
}

function formatDaysSinceRefill(daysSince) {
  if (daysSince > 60) return `+${daysSince - 60} hari`;
  return `${daysSince} hari`;
}

function getOldestDaysSinceRefill(items) {
  const ages = items
    .map(item => getDaysSinceRefill(item.tanggal_terakhir))
    .filter(days => days !== null);
  return ages.length ? Math.max(...ages) : null;
}

function getRefillStatus(daysSince) {
  if (daysSince === null) return { className: 'status-neutral', label: 'Belum tercatat' };
  if (daysSince > 60) return { className: 'status-critical', label: 'Kritis' };
  if (daysSince >= 30) return { className: 'status-warning', label: 'Menipis' };
  return { className: 'status-safe', label: 'Aman' };
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getLatestUpdateDate(items) {
  return items.reduce((latest, item) => {
    if (!item.updated_at) return latest;
    const value = typeof item.updated_at === 'string'
      ? item.updated_at.trim().replace(' ', 'T')
      : item.updated_at;
    const updatedAt = new Date(value);
    if (Number.isNaN(updatedAt.getTime())) return latest;
    return !latest || updatedAt > latest ? updatedAt : latest;
  }, null);
}

function getTodayDate() {
  return formatLocalDate(new Date());
}

function getColorClass(color) {
  return `ink-${normalizeGroupValue(color).replace('cyan', 'biru').replace('yellow', 'kuning')}`;
}

export default function App() {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [printerFilter, setPrinterFilter] = useState('all');
  const [sortOption, setSortOption] = useState('nama-asc');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [refillItem, setRefillItem] = useState(null);
  const [refillDate, setRefillDate] = useState(getTodayDate());
  const [savingRefill, setSavingRefill] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    departement: '',
    printer: '',
    warna: 'Hitam',
    tanggal_terakhir: getTodayDate(),
    catatan: '',
  });

  // Excel File State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/refills');
      const resData = await response.json();

      if (response.ok && resData.success) {
        setRefills(resData.data);
        setLoadError('');
      } else {
        throw new Error(resData.message || 'Gagal mengambil data printer.');
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err);
      setLoadError(err.message || 'Gagal mengambil data dari server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!showFormModal && !showImportModal && !showHistoryModal && !refillItem) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      setShowFormModal(false);
      setShowImportModal(false);
      setShowHistoryModal(false);
      setRefillItem(null);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showFormModal, showImportModal, showHistoryModal, refillItem]);

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
  const handleQuickRefill = (item) => {
    setRefillItem(item);
    setRefillDate(getTodayDate());
  };

  const saveRefillDate = async (event) => {
    event.preventDefault();
    if (!refillItem || !refillDate) return;
    setSavingRefill(true);
    try {
      const response = await fetch(`/api/refills/${refillItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...refillItem,
          tanggal_terakhir: refillDate,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan tanggal isi ulang.');
      setRefillItem(null);
      await fetchData();
      alert('Tanggal isi ulang berhasil diperbarui.');
    } catch (err) {
      alert('Gagal meng-update: ' + err.message);
    } finally {
      setSavingRefill(false);
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
      tanggal_terakhir: getTodayDate(),
      catatan: '',
    });
  };

  const groups = Object.values(refills.reduce((grouped, item) => {
    const key = getGroupKey(item);
    if (!grouped[key]) {
      grouped[key] = {
        key,
        nama: item.nama,
        departement: item.departement,
        printer: item.printer,
        items: [],
      };
    }
    grouped[key].items.push(item);
    return grouped;
  }, {}));

  const overdueRefillCount = refills.filter((item) => {
    const daysSince = getDaysSinceRefill(item.tanggal_terakhir);
    return daysSince !== null && daysSince > 60;
  }).length;
  const latestUpdateDate = getLatestUpdateDate(refills);

  const departments = Array.from(new Set(refills.map(item => item.departement))).filter(Boolean).sort();
  const printerTypes = Array.from(new Set(refills.map(item => item.printer))).filter(Boolean).sort();
  const filteredGroups = groups.flatMap((group) => {
    const query = normalizeGroupValue(search);
    const matchesSearch = !query || [
      group.nama,
      group.departement,
      group.printer,
    ].some(value => normalizeGroupValue(value).includes(query));
    const matchesDepartment = deptFilter === 'all' || normalizeGroupValue(group.departement) === normalizeGroupValue(deptFilter);
    const matchesPrinter = printerFilter === 'all' || normalizeGroupValue(group.printer) === normalizeGroupValue(printerFilter);
    const matchingItems = group.items.filter(item => (
      colorFilter === 'all' || normalizeGroupValue(item.warna) === normalizeGroupValue(colorFilter)
    ));
    const visibleItems = overdueOnly
      ? matchingItems.filter(item => getDaysSinceRefill(item.tanggal_terakhir) > 60)
      : matchingItems;
    if (!matchesSearch || !matchesDepartment || !matchesPrinter || visibleItems.length === 0) return [];
    return [{ ...group, visibleItems }];
  }).sort((groupA, groupB) => {
    let comparison = 0;
    if (sortOption.startsWith('nama-')) {
      comparison = String(groupA.nama || '').localeCompare(String(groupB.nama || ''), 'id', { sensitivity: 'base' });
      if (!comparison) comparison = String(groupA.departement || '').localeCompare(String(groupB.departement || ''), 'id', { sensitivity: 'base' });
      if (!comparison) comparison = String(groupA.printer || '').localeCompare(String(groupB.printer || ''), 'id', { sensitivity: 'base' });
    } else {
      const ageA = getOldestDaysSinceRefill(groupA.visibleItems);
      const ageB = getOldestDaysSinceRefill(groupB.visibleItems);
      if (ageA === null || ageB === null) {
        if (ageA === ageB) return String(groupA.nama || '').localeCompare(String(groupB.nama || ''), 'id', { sensitivity: 'base' });
        return ageA === null ? 1 : -1;
      }
      comparison = ageA - ageB;
    }
    const direction = sortOption.endsWith('desc') ? -1 : 1;
    return comparison * direction;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, deptFilter, colorFilter, printerFilter, sortOption, overdueOnly]);

  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const displayedPage = Math.min(currentPage, pageCount);
  const pageGroups = filteredGroups.slice((displayedPage - 1) * pageSize, displayedPage * pageSize);

  const toggleGroup = (key) => {
    setExpandedGroups(current => ({ ...current, [key]: !current[key] }));
  };

  const sortHeaderIcon = (field) => {
    if (!sortOption.startsWith(`${field}-`)) return <ArrowDownUp size={14} />;
    return sortOption.endsWith('asc') ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const setHeaderSort = (field) => {
    setSortOption((current) => {
      if (field === 'nama') {
        return current.startsWith('nama-')
          ? (current === 'nama-asc' ? 'nama-desc' : 'nama-asc')
          : 'nama-asc';
      }
      return current.startsWith('days-')
        ? (current === 'days-desc' ? 'days-asc' : 'days-desc')
        : 'days-desc';
    });
  };

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
            <p>Kelola jenis tinta dan hitungan hari sejak isi ulang terakhir</p>
          </div>
        </div>

        <div className="header-actions">
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
            <Plus size={18} /> Tambah Data
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Ringkasan data printer">
        <article className="stat-card">
          <span className="stat-icon stat-icon-blue"><Printer size={20} /></span>
          <div><p>Total Kelompok Tinta</p><strong>{groups.length}</strong><small>Unik per PIC, departemen, dan jenis tinta</small></div>
        </article>
        <button
          type="button"
          className={`stat-card stat-card-action${overdueOnly ? ' is-active' : ''}`}
          onClick={() => setOverdueOnly(current => !current)}
          aria-pressed={overdueOnly}
          title={overdueOnly ? 'Tampilkan semua data' : 'Filter hanya tinta lebih dari 60 hari'}
        >
          <span className="stat-icon stat-icon-amber"><Clock3 size={20} /></span>
          <div>
            <p>Tinta lebih dari 60 hari</p>
            <strong>{loading ? 'Memuat' : loadError ? 'Gagal' : overdueRefillCount}</strong>
            <small>{overdueOnly ? 'Filter aktif · klik untuk menampilkan semua' : 'Klik untuk memfilter tinta kritis'}</small>
          </div>
        </button>
        <aside className="stats-info-card" aria-label="Informasi pengingat isi ulang">
          <div className="stats-info-heading">
            <span className="stat-icon stat-icon-blue"><Clock3 size={20} /></span>
            <p>Informasi pengingat</p>
          </div>
          <dl className="stats-info-list">
            <div>
              <dt>Batas pengingat isi ulang</dt>
              <dd>60 hari</dd>
            </div>
            <div>
              <dt>Terakhir diperbarui</dt>
              <dd>{latestUpdateDate ? latestUpdateDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum tersedia'}</dd>
            </div>
          </dl>
          <p className="stats-info-note">Tanggal kosong berarti riwayat isi ulang belum tercatat.</p>
        </aside>
      </section>

      {loadError && <div className="load-error" role="alert">Data gagal dimuat: {loadError}</div>}

      {/* Main Table Card */}
      <div className="main-card">
        {/* Search & Filters */}
        <div className="card-header-tools">
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Cari nama PIC, departemen, atau jenis tinta..."
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

            <select
              className="select-input"
              value={printerFilter}
              onChange={(e) => setPrinterFilter(e.target.value)}
              aria-label="Filter jenis tinta"
            >
              <option value="all">Semua Jenis Tinta</option>
              {printerTypes.map((printer) => <option key={printer} value={printer}>{printer}</option>)}
            </select>
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
                setPrinterFilter('all');
                setOverdueOnly(false);
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
          ) : filteredGroups.length === 0 ? (
            <div className="empty-state">
              <Printer className="empty-icon" />
              <p>Tidak ada kelompok tinta yang cocok dengan pencarian atau filter.</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th aria-sort={sortOption.startsWith('nama-') ? (sortOption.endsWith('asc') ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="sort-header" onClick={() => setHeaderSort('nama')}>
                      Nama PIC {sortHeaderIcon('nama')}
                    </button>
                  </th>
                  <th>Departemen</th>
                  <th>Jenis Tinta</th>
                  <th>Warna Tinta</th>
                  <th aria-sort={sortOption.startsWith('days-') ? (sortOption.endsWith('asc') ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="sort-header" onClick={() => setHeaderSort('days')}>
                      Hari Sejak Isi Ulang {sortHeaderIcon('days')}
                    </button>
                  </th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageGroups.map((group, idx) => {
                  const expanded = Boolean(expandedGroups[group.key]);
                  return (
                    <React.Fragment key={group.key}>
                    <tr className="group-row">
                      <td style={{ fontWeight: 700, color: '#334155' }}>{(displayedPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div className="pic-cell">
                          <User size={16} />
                          <strong>{group.nama}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="department-cell">
                          <Building size={15} /> {group.departement}
                        </span>
                      </td>
                      <td><span className="printer-type">{group.printer}</span></td>
                      <td>
                        <div className="color-chip-list">
                          {group.visibleItems.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className={`ink-badge color-chip ${getColorClass(item.warna)}`}
                              onClick={() => handleQuickRefill(item)}
                              title={`Catat isi ulang ${item.warna} (terakhir: ${item.tanggal_terakhir || 'belum tercatat'})`}
                            >
                              <span className="ink-dot"></span>
                              {item.warna}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="refill-age-summary">
                          {group.visibleItems.map((item) => {
                            const daysSince = getDaysSinceRefill(item.tanggal_terakhir);
                            const status = getRefillStatus(daysSince);
                            return (
                              <span
                                key={item.id}
                                className={`refill-age-badge ${status.className} ${getColorClass(item.warna)}`}
                                aria-label={`${item.warna}: ${daysSince === null ? 'belum tercatat' : formatDaysSinceRefill(daysSince)}, ${status.label}`}
                                title={`${item.warna} · ${status.label}`}
                              >
                                <span className="ink-dot" aria-hidden="true"></span>
                                <span>{daysSince === null ? 'Belum tercatat' : formatDaysSinceRefill(daysSince)}</span>
                                <small>{status.label}</small>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="action-group">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => toggleGroup(group.key)}
                            aria-expanded={expanded}
                            title={expanded ? 'Tutup detail kelompok' : 'Lihat detail kelompok'}
                          >
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="detail-row" key={`${group.key}-detail`}>
                        <td colSpan="7">
                          <div className="detail-panel">
                            <div className="detail-heading">
                              <div><strong>{group.nama}</strong><span>{group.departement} · {group.printer}</span></div>
                            </div>
                            <div className="color-detail-grid">
                              {group.visibleItems.map((item) => {
                                const daysSince = getDaysSinceRefill(item.tanggal_terakhir);
                                const status = getRefillStatus(daysSince);
                                return (
                                  <article className="color-detail-card" key={item.id}>
                                    <div className="color-detail-title">
                                      <span className={`ink-badge ${getColorClass(item.warna)}`}><span className="ink-dot"></span>{item.warna}</span>
                                    </div>
                                    <div className="color-detail-data">
                                      <span>
                                        <Clock3 size={14} />{' '}
                                        {daysSince === null
                                          ? 'Belum ada catatan isi ulang'
                                          : daysSince > 60
                                            ? `${formatDaysSinceRefill(daysSince)} dari batas pengingat isi ulang`
                                            : `${daysSince} hari sejak isi ulang terakhir`}
                                      </span>
                                      <span className={`refill-status-label ${status.className}`}>{status.label}</span>
                                    </div>
                                    <div className="action-group detail-actions">
                                      <button className="btn btn-success btn-sm" onClick={() => handleQuickRefill(item)}><RefreshCw size={13} /> Isi Ulang</button>
                                      <button className="btn btn-secondary btn-sm" onClick={() => handleShowHistory(item)} title="Riwayat isi ulang"><History size={14} /></button>
                                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)} title="Edit data warna"><Edit2 size={14} /></button>
                                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} title="Hapus data warna"><Trash2 size={14} /></button>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filteredGroups.length > 0 && (
          <div className="table-pagination">
            <span className="pagination-summary">
              Menampilkan {(displayedPage - 1) * pageSize + 1}-{Math.min(displayedPage * pageSize, filteredGroups.length)} dari {filteredGroups.length} kelompok
            </span>
            <div className="pagination-controls">
              <label className="page-size-control">
                <span>Baris per halaman</span>
                <select
                  className="select-input"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Jumlah data per halaman"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={displayedPage === 1}
                >
                  Sebelumnya
                </button>
                <span aria-live="polite">Halaman {displayedPage} dari {pageCount}</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
                  disabled={displayedPage === pageCount}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {refillItem && (
        <div className="modal-overlay">
          <div className="modal-content refill-modal" role="dialog" aria-modal="true" aria-labelledby="refill-modal-title">
            <div className="modal-header">
              <h2 id="refill-modal-title">Catat Isi Ulang</h2>
              <button className="close-btn" onClick={() => setRefillItem(null)} aria-label="Tutup">
                <X size={20} />
              </button>
            </div>
            <div className="refill-context">
              <strong>{refillItem.nama}</strong>
              <span>{refillItem.departement}</span>
              <span>{refillItem.printer} · {refillItem.warna}</span>
            </div>
            <form onSubmit={saveRefillDate}>
              <div className="form-group">
                <label htmlFor="refill-date">Tanggal isi ulang</label>
                <input
                  id="refill-date"
                  type="date"
                  className="form-input"
                  required
                  value={refillDate}
                  onChange={(event) => setRefillDate(event.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRefillItem(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={savingRefill}>
                  {savingRefill ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Input / Edit Data */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="printer-form-title">
            <div className="modal-header">
              <h2 id="printer-form-title">{editingItem ? 'Edit Data Printer' : 'Tambah Data Printer Baru'}</h2>
              <button className="close-btn" onClick={() => setShowFormModal(false)} aria-label="Tutup dialog data printer">
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
                      {option.value}: {option.models}
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
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
            <div className="modal-header">
              <h2 id="import-modal-title">Impor Data dari Excel</h2>
              <button className="close-btn" onClick={() => setShowImportModal(false)} aria-label="Tutup dialog impor">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadExcel}>
              <div
                className="upload-dropzone"
                role="button"
                tabIndex={0}
                aria-label={uploadFile ? `Pilih file Excel, saat ini ${uploadFile.name}` : 'Pilih file Excel'}
                onClick={() => fileInputRef.current.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current.click();
                  }
                }}
              >
                <UploadCloud className="upload-icon" />
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {uploadFile ? uploadFile.name : 'Klik untuk memilih file Excel (.xlsx / .xls)'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Data isi ulang: <strong>ID, Nama, Departement, Printer, Jenis Tinta, Tanggal</strong>
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
                💡 Impor hanya memperbarui tanggal dan riwayat printer yang sudah terdaftar; baris yang tidak cocok atau tidak memiliki warna akan dilewati. Kolom <strong>Printer</strong> berisi kode jenis tinta (003 atau 664), sedangkan <strong>Jenis Tinta</strong> berisi warna (Hitam, Magenta, Biru, atau Kuning). Kolom <strong>ID</strong> opsional dan tidak diimpor.
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
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
            <div className="modal-header">
              <h2 id="history-modal-title">Riwayat Isi Ulang Printer</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)} aria-label="Tutup dialog riwayat">
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
