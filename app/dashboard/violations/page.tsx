'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/app/lib/store';
import { AlertTriangle, Plus, X, Camera, Search, Filter, Trophy, Trash2 } from 'lucide-react';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';

export default function ViolationsPage() {
  const { currentUser, violations, addViolation, students, deleteViolation, monitoredStudent, setMonitoredStudent } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [violationType, setViolationType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'ringan' | 'sedang' | 'berat'>('ringan');

  // Wali kelas hanya dapat melihat siswa kelasnya sendiri
  const availableStudents = (currentUser?.role === 'teacher' && currentUser?.homeClass)
    ? students.filter(s => s.class === currentUser.homeClass)
    : students;

  const filteredStudentsForForm = availableStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 5);

  if (!currentUser) return null;

  const canAddViolation = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const isBKTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin' || currentUser.role === 'bk';

  let filteredViolations = violations;

  // Filter by selected child for teachers/admins/bk
  if (isBKTeacherOrAdmin && monitoredStudent) {
    filteredViolations = filteredViolations.filter(v => 
      v.studentName.trim().toLowerCase() === monitoredStudent.name.trim().toLowerCase()
    );
  }

  // Filter by role for parent
  if (currentUser.role === 'parent' && currentUser.childName) {
    // Orang tua hanya melihat yang sudah divalidasi
    filteredViolations = violations.filter(v => 
      v.studentName.toLowerCase() === currentUser.childName!.toLowerCase() &&
      v.status === 'validated'
    );
  }

  // Admin dan BK melihat semua, Guru melihat semua laporannya
  if (currentUser.role === 'teacher' && !monitoredStudent) {
    // Guru mungkin ingin melihat semua atau hanya laporannya, 
    // untuk sekarang biarkan melihat semua tapi dengan status
  }

  // Search filter
  if (search) {
    filteredViolations = filteredViolations.filter(v =>
      v.studentName.toLowerCase().includes(search.toLowerCase()) ||
      v.violationType.toLowerCase().includes(search.toLowerCase()) ||
      v.studentClass.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Severity filter
  if (filterSeverity) {
    filteredViolations = filteredViolations.filter(v => v.severity === filterSeverity);
  }

  // Status filter
  if (filterStatus) {
    filteredViolations = filteredViolations.filter(v => v.status === filterStatus);
  }

  // Point Calculation (for Parent view)
  const calculatePoints = () => {
    let points = 100;
    // Gunakan violations asli (bukan filtered) agar perhitungan poin selalu akurat untuk anak tersebut
    const myChildViolations = violations.filter(v => 
      currentUser.role === 'parent' && 
      v.studentName.toLowerCase() === currentUser.childName?.toLowerCase() &&
      v.status === 'validated'
    );

    myChildViolations.forEach(v => {
      if (v.severity === 'berat') points -= 50;
      else if (v.severity === 'sedang') points -= 15;
      else points -= 5;
    });

    return Math.max(0, points);
  };

  const studentPoints = calculatePoints();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addViolation({
      studentName,
      studentClass,
      violationType,
      description,
      severity,
      photo: photoPreview || undefined,
      date: new Date().toISOString().split('T')[0],
      reportedBy: currentUser.id,
    });
    // Reset form
    setStudentName('');
    setStudentSearch('');
    setStudentClass('');
    setViolationType('');
    setDescription('');
    setSeverity('ringan');
    setPhotoPreview(null);
    setShowForm(false);
  };

  const violationTypes = [
    'Terlambat', 'Bolos', 'Tidak Mengerjakan PR', 'Seragam Tidak Lengkap',
    'Berkelahi', 'Gaduh di Kelas', 'Merokok', 'Merusak Fasilitas', 'Lainnya',
  ];

  const isParentView = currentUser.role === 'parent';

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-danger" />
            Data Pelanggaran
          </h1>
          <p className="text-sm text-muted mt-1">
            {currentUser.role === 'parent'
              ? `Pelanggaran ${currentUser.childName}`
              : 'Kelola data pelanggaran siswa'
            }
          </p>
        </div>
        {canAddViolation && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Tambah Pelanggaran
          </button>
        )}
      </div>

      {/* Stats Summary Bar */}
      {!isParentView && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: filteredViolations.length, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Berat', value: filteredViolations.filter(v => v.severity === 'berat').length, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-200' },
            { label: 'Sedang', value: filteredViolations.filter(v => v.severity === 'sedang').length, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Ringan', value: filteredViolations.filter(v => v.severity === 'ringan').length, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-3 lg:p-4 text-center`}>
              <p className={`text-2xl lg:text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Parent Point Card */}
      {currentUser.role === 'parent' && (
        <div className={`p-6 rounded-3xl border-2 transition-all duration-500 ${
          studentPoints <= 20 
            ? 'bg-danger/5 border-danger shadow-lg shadow-danger/10 animate-pulse' 
            : 'bg-primary/5 border-primary/20'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                studentPoints <= 20 ? 'bg-danger' : 'bg-primary'
              }`}>
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Poin Kedisiplinan</h2>
                <p className="text-sm text-muted">Sisa poin anak Anda saat ini</p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className={`text-5xl font-black ${
                  studentPoints <= 20 ? 'text-danger' : 'text-primary'
                }`}>{studentPoints}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Sisa Poin</p>
              </div>
              
              <div className="h-12 w-px bg-border hidden md:block" />

              <div className="max-w-[200px]">
                {studentPoints === 0 ? (
                  <div className="px-4 py-2 rounded-xl bg-danger text-white text-xs font-bold animate-bounce">
                    🚨 DISARANKAN PINDAH SEKOLAH
                  </div>
                ) : studentPoints <= 20 ? (
                  <p className="text-xs font-semibold text-danger">
                    ⚠️ Peringatan Keras! Poin hampir habis. Segera bimbing anak Anda.
                  </p>
                ) : (
                  <p className="text-xs font-medium text-muted">
                    Poin akan berkurang setiap kali anak melakukan pelanggaran yang divalidasi.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Monitor Active Indicator */}
      {isBKTeacherOrAdmin && monitoredStudent && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-indigo-50 border border-indigo-200 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
            {monitoredStudent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-indigo-900">
              Filter Monitor Aktif: <span className="text-indigo-600">{monitoredStudent.name}</span>
            </p>
            <p className="text-xs text-indigo-500">Menampilkan data pelanggaran milik siswa ini saja.</p>
          </div>
          <button
            onClick={() => setMonitoredStudent(null)}
            className="p-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0"
            title="Tampilkan semua siswa"
          >
            <X className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      )}

      {/* Search & Filter - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari siswa atau pelanggaran..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none appearance-none cursor-pointer whitespace-nowrap flex-shrink-0"
        >
          <option value="">Semua Tingkat</option>
          <option value="ringan">🟡 Ringan</option>
          <option value="sedang">🟠 Sedang</option>
          <option value="berat">🔴 Berat</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-surface text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none appearance-none cursor-pointer whitespace-nowrap flex-shrink-0"
        >
          <option value="">Semua Status</option>
          <option value="pending_bk">⏳ Menunggu</option>
          <option value="validated">✅ Divalidasi</option>
          <option value="rejected">❌ Ditolak</option>
        </select>
      </div>

      {/* Violations List */}
      <div className="space-y-3">
        {filteredViolations.map((v, i) => (
          <div
            key={v.id}
            className="p-4 lg:p-5 rounded-2xl bg-surface border border-border hover:border-primary/20 hover:shadow-md transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Photo */}
              {v.photo && (
                <div className="w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={v.photo} alt="Bukti" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{v.violationType}</h3>
                    <p className="text-sm text-muted mt-0.5">
                      {v.studentName} — <span className="font-medium">{v.studentClass}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      v.severity === 'berat'
                        ? 'bg-slate-900 text-white'
                        : v.severity === 'sedang'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {v.severity.charAt(0).toUpperCase() + v.severity.slice(1)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      v.status === 'validated'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : v.status === 'rejected'
                        ? 'border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-slate-300 bg-slate-50 text-slate-600'
                    }`}>
                      {v.status === 'pending_bk' ? 'Menunggu Persetujuan' : v.status === 'validated' ? 'Valid' : 'Ditolak'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted mt-2">{v.description}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                  <p className="text-xs text-muted">
                    📅 {new Date(v.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  
                  <div className="flex gap-2 items-center">
                    {/* Admin & BK Actions */}
                    {(currentUser.role === 'bk' || currentUser.role === 'admin') && v.status === 'pending_bk' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => useAppStore.getState().validateViolation(v.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => useAppStore.getState().validateViolation(v.id, 'validated')}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                        >
                          Validasi
                        </button>
                      </div>
                    )}
                    
                    {/* Delete Action: For Admin, BK, or the reporter */}
                    {(currentUser.role === 'admin' || currentUser.role === 'bk' || currentUser.id === v.reportedBy) && (
                      <button
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus data pelanggaran ini?')) {
                            deleteViolation(v.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                        title="Hapus Pelanggaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredViolations.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-surface border border-border">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
            <p className="text-lg font-semibold text-foreground mb-1">Tidak ada data</p>
            <p className="text-sm text-muted">Belum ada pelanggaran yang tercatat</p>
          </div>
        )}
      </div>

      </div>

      {/* Add Violation Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-lg font-bold text-foreground">Tambah Pelanggaran</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-foreground mb-2">Nama Siswa</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => {
                      setStudentSearch(e.target.value);
                      setShowStudentList(true);
                      if (studentName) {
                        setStudentName('');
                        setStudentClass('');
                      }
                    }}
                    onFocus={() => setShowStudentList(true)}
                    placeholder="Ketik nama siswa..."
                    required={!studentName}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  />
                </div>
                
                {showStudentList && studentSearch && !studentName && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                    {filteredStudentsForForm.length > 0 ? (
                      filteredStudentsForForm.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setStudentName(s.name);
                            setStudentClass(s.class);
                            setStudentSearch(s.name);
                            setShowStudentList(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-surface-hover flex items-center justify-between transition-colors border-b border-border last:border-0"
                        >
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Kelas {s.class}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-4 text-center text-sm text-muted">
                        Siswa tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Kelas</label>
                <select
                  value={studentClass}
                  onChange={e => setStudentClass(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                >
                  <option value="">Pilih kelas</option>
                  {SCHOOL_CLASSES.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Jenis Pelanggaran</label>
                <select
                  value={violationType}
                  onChange={e => setViolationType(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                >
                  <option value="">Pilih jenis pelanggaran</option>
                  {violationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Tingkat</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ringan', 'sedang', 'berat'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        severity === sev
                          ? sev === 'berat'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : sev === 'sedang'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-400 bg-slate-100 text-slate-800'
                          : 'border-border text-muted hover:border-slate-400'
                      }`}
                    >
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Keterangan</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Jelaskan detail pelanggaran..."
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Foto Bukti (Opsional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors flex flex-col items-center gap-2 text-muted hover:text-primary"
                  >
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">Klik untuk upload foto</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-sm"
              >
                Simpan Pelanggaran
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
