'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { Trophy, Plus, X, Search, Trash2, Medal, Star } from 'lucide-react';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';


export default function AchievementsPage() {
  const { currentUser, achievements, addAchievement, deleteAchievement, students, syncFromSupabase, monitoredStudent, setMonitoredStudent } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'akademik' | 'olahraga' | 'seni' | 'lainnya'>('akademik');

  // Wali kelas hanya dapat melihat siswa kelasnya sendiri
  const availableStudents = (currentUser?.role === 'teacher' && currentUser?.homeClass)
    ? students.filter(s => s.class === currentUser.homeClass)
    : students;

  const filteredStudentsForForm = availableStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 5);

  // Fetch data terbaru dari Supabase setiap kali halaman dibuka
  useEffect(() => {
    syncFromSupabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) return null;

  const [filterCategory, setFilterCategory] = useState('');

  const canAdd = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const canDelete = currentUser.role === 'admin';
  const isBKTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin' || currentUser.role === 'bk';

  let filtered = achievements;

  if (isBKTeacherOrAdmin && monitoredStudent) {
    const mn = monitoredStudent.name.trim().toLowerCase();
    filtered = achievements.filter(a => a.studentName.trim().toLowerCase() === mn);
  } else if (currentUser.role === 'parent' && currentUser.childName) {
    const parentChildName = currentUser.childName.trim().toLowerCase();
    filtered = achievements.filter(a => {
      const achievementStudentName = a.studentName.trim().toLowerCase();
      return achievementStudentName.includes(parentChildName) || parentChildName.includes(achievementStudentName);
    });
  }
  if (search) {
    filtered = filtered.filter(a => a.studentName.toLowerCase().includes(search.toLowerCase()) || a.title.toLowerCase().includes(search.toLowerCase()));
  }
  if (filterCategory) {
    filtered = filtered.filter(a => a.category === filterCategory);
  }

  const categoryStats = [
    { key: '', label: 'Semua', emoji: '🏆', count: achievements.length },
    { key: 'akademik', label: 'Akademik', emoji: '📚', count: achievements.filter(a => a.category === 'akademik').length },
    { key: 'olahraga', label: 'Olahraga', emoji: '⚽', count: achievements.filter(a => a.category === 'olahraga').length },
    { key: 'seni', label: 'Seni', emoji: '🎨', count: achievements.filter(a => a.category === 'seni').length },
    { key: 'lainnya', label: 'Lainnya', emoji: '⭐', count: achievements.filter(a => a.category === 'lainnya').length },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await addAchievement({ studentName, studentClass, title, description, date: new Date().toISOString().split('T')[0], category });
      setStudentName(''); setStudentClass(''); setTitle(''); setDescription(''); setCategory('akademik'); setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan prestasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, achTitle: string) => {
    if (!confirm(`Hapus prestasi "${achTitle}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteAchievement(id);
    } catch (err: any) {
      alert('Gagal menghapus prestasi: ' + (err.message || 'Unknown error'));
    }
  };

  const categoryEmoji = (cat: string) => cat === 'akademik' ? '📚' : cat === 'olahraga' ? '⚽' : cat === 'seni' ? '🎨' : '⭐';
  const categoryColors = (cat: string) => cat === 'akademik' ? 'bg-blue-50 text-blue-700 border-blue-100' : cat === 'olahraga' ? 'bg-slate-100 text-slate-700 border-slate-200' : cat === 'seni' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Trophy className="w-6 h-6 text-slate-800" />Prestasi Siswa</h1>
          <p className="text-sm text-muted mt-1">{currentUser.role === 'parent' ? `Prestasi ${currentUser.childName}` : 'Kelola data prestasi siswa'}</p>
        </div>
        {canAdd && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold hover:shadow-sm transition-all">
            <Plus className="w-5 h-5" />Tambah Prestasi
          </button>
        )}
      </div>

      {/* Mode Monitor Active Indicator */}
      {isBKTeacherOrAdmin && monitoredStudent && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-50 border border-blue-200 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
            {monitoredStudent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">
              Filter Monitor Aktif: <span className="text-blue-600">{monitoredStudent.name}</span>
            </p>
            <p className="text-xs text-slate-500">Menampilkan data prestasi milik siswa ini saja.</p>
          </div>
          <button
            onClick={() => setMonitoredStudent(null)}
            className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
            title="Tampilkan semua siswa"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Search + Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari prestasi atau nama siswa..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
        </div>
        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categoryStats.map(cat => (
            <button key={cat.key} onClick={() => setFilterCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                filterCategory === cat.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-surface border-border text-muted hover:border-slate-300 hover:text-foreground'
              }`}>
              <span>{cat.emoji}</span>{cat.label}
              <span className={`ml-0.5 text-[10px] ${filterCategory === cat.key ? 'text-white/70' : 'text-muted'}`}>({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a, i) => (
          <div key={a.id} className="p-5 rounded-2xl bg-surface border border-border hover:border-slate-300 hover:shadow-sm transition-all duration-300 animate-slide-up group" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">{categoryEmoji(a.category)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground leading-tight">{a.title}</h3>
                  {canDelete && (
                    <button onClick={() => handleDelete(a.id, a.title)}
                      className="p-1.5 rounded-lg text-muted hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" title="Hapus prestasi">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5">{a.studentName}</p>
                <p className="text-xs text-muted">{a.studentClass}</p>
                <p className="text-sm text-muted mt-2 line-clamp-2 leading-snug">{a.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${categoryColors(a.category)}`}>{a.category.charAt(0).toUpperCase() + a.category.slice(1)}</span>
                  <span className="text-xs text-muted">📅 {new Date(a.date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl bg-surface border border-border">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
          <p className="text-lg font-semibold text-foreground mb-1">Belum ada prestasi</p>
        </div>
      )}

      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-lg font-bold">Tambah Prestasi</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-surface-hover"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold mb-2">Nama Siswa</label>
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
              
              <div><label className="block text-sm font-semibold mb-2">Kelas</label>
                <select value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none">
                  <option value="">Pilih kelas</option>
                  {SCHOOL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-semibold mb-2">Judul Prestasi</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Juara 1 Olimpiade..." className="w-full px-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div><label className="block text-sm font-semibold mb-2">Kategori</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['akademik','olahraga','seni','lainnya'] as const).map(cat => (
                    <button key={cat} type="button" onClick={() => setCategory(cat)} className={`py-2 rounded-xl border text-xs font-semibold transition-all ${category === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted'}`}>
                      {categoryEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm font-semibold mb-2">Keterangan</label><textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} placeholder="Detail prestasi..." className="w-full px-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none resize-none" /></div>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</>
                ) : 'Simpan Prestasi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
