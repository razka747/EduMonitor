'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { LineChart as LineChartIcon, Plus, Search, Trash2, Award, BookOpen, TrendingUp, ArrowUpRight } from 'lucide-react';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';

export default function GradesPage() {
  const { currentUser, grades, addGrade, deleteGrade, students, syncFromSupabase, monitoredStudent, setMonitoredStudent } = useAppStore();
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<{name: string, class: string} | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<any>('Ujian Harian');
  const [score, setScore] = useState<number | ''>('');
  const [date, setDate] = useState('');

  useEffect(() => { syncFromSupabase(); }, []);

  if (!currentUser) return null;

  const isParent = currentUser.role === 'parent';

  useEffect(() => {
    if (isParent && currentUser.childName) {
      setSelectedStudent({ name: currentUser.childName, class: currentUser.childClass || '' });
    } else if (monitoredStudent) {
      setSelectedStudent({ name: monitoredStudent.name, class: monitoredStudent.class });
    }
  }, [isParent, currentUser, monitoredStudent]);

  let displayedGrades = (grades || []).filter(g => {
    if (!selectedStudent) return false;
    return g.studentName?.trim().toLowerCase() === selectedStudent.name.trim().toLowerCase();
  });
  displayedGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Wali kelas hanya dapat melihat siswa kelasnya sendiri
  const availableStudents = (currentUser.role === 'teacher' && currentUser.homeClass)
    ? students.filter(s => s.class === currentUser.homeClass)
    : students;

  const filteredStudentsList = availableStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.class.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedStudent) { setErrorMsg('Pilih nama siswa terlebih dahulu.'); return; }
    if (score === '' || score < 0 || score > 100) { setErrorMsg('Nilai harus berupa angka 0–100.'); return; }
    setIsSubmitting(true);
    try {
      await addGrade({
        studentName: selectedStudent.name,
        studentClass: selectedStudent.class,
        subject, type,
        score: Number(score),
        date: date || new Date().toISOString().split('T')[0],
        createdBy: currentUser.id,
      });
      setSubject(''); setScore(''); setDate('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan nilai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjectsList = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'Seni Budaya', 'Pendidikan Agama', 'PJOK'];

  const avgScore = displayedGrades.length > 0
    ? Math.round(displayedGrades.reduce((a, g) => a + g.score, 0) / displayedGrades.length)
    : null;

  const getScoreColor = (s: number) =>
    s >= 85 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
    s >= 75 ? 'bg-slate-100 text-slate-800 ring-1 ring-slate-200' :
    s >= 60 ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' :
    'bg-slate-900 text-white ring-1 ring-slate-900';

  const getTypeColor = (t: string) => {
    if (t === 'Akhir Semester' || t === 'UAS') return 'bg-blue-50 text-blue-700';
    if (t === 'Tengah Semester' || t === 'UTS') return 'bg-slate-100 text-slate-800';
    return 'bg-slate-100 text-slate-600';
  };

  // Parent view
  if (isParent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
              <LineChartIcon className="w-5 h-5 text-white" />
            </div>
            Nilai Akademik {currentUser.childName}
          </h1>
          <p className="page-subtitle ml-12">Pantau perkembangan nilai akademik anak Anda</p>
        </div>

        {/* Summary mini cards */}
        {displayedGrades.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Ujian', value: displayedGrades.length, icon: BookOpen, color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Rata-rata', value: avgScore ?? '-', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Nilai Tertinggi', value: Math.max(...displayedGrades.map(g => g.score)), icon: Award, color: 'text-slate-900', bg: 'bg-slate-100' },
              { label: 'Lulus (≥75)', value: displayedGrades.filter(g => g.score >= 75).length, icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(card => (
              <div key={card.label} className="card p-4 card-interactive">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <p className="text-2xl font-black text-foreground">{card.value}</p>
                <p className="text-xs text-muted mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface-hover/50 flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm">Riwayat Nilai</h3>
            <span className="text-xs text-muted">{displayedGrades.length} catatan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="px-5 py-3 font-semibold">Tanggal</th>
                  <th className="px-5 py-3 font-semibold">Mata Pelajaran</th>
                  <th className="px-5 py-3 font-semibold">Jenis</th>
                  <th className="px-5 py-3 font-semibold text-center">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {displayedGrades.map((g) => (
                  <tr key={g.id} className="table-row animate-slide-up">
                    <td className="px-5 py-3 text-sm text-muted whitespace-nowrap">{new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">{g.subject}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${getTypeColor(g.type)}`}>{g.type}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm ${getScoreColor(g.score)}`}>
                        {g.score}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedGrades.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-muted">
                    <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Belum ada data nilai.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Admin / Teacher view
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
            <LineChartIcon className="w-5 h-5 text-white" />
          </div>
          Kelola Nilai Akademik
        </h1>
        <p className="page-subtitle ml-12">Pilih siswa dan kelola catatan nilai mereka.</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-5 min-h-0">

        {/* Student list — horizontal scroll on mobile, sidebar on desktop */}
        <div className="lg:col-span-1 card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-foreground text-sm mb-3">Daftar Siswa</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Cari siswa..." className="input-field pl-8 text-sm py-2" />
            </div>
          </div>
          {/* Mobile: horizontal scrollable chips */}
          <div className="flex lg:hidden gap-2 p-3 overflow-x-auto scrollbar-hide">
            {filteredStudentsList.map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent({ name: s.name, class: s.class }); setMonitoredStudent(s); }}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  selectedStudent?.name === s.name
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-surface border-border text-foreground hover:border-primary/30'
                }`}>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${selectedStudent?.name === s.name ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{s.name[0]}</span>
                {s.name.split(' ')[0]}
              </button>
            ))}
          </div>
          {/* Desktop: vertical list */}
          <div className="hidden lg:block flex-1 overflow-y-auto p-2 max-h-[680px]">
            {filteredStudentsList.length > 0 ? filteredStudentsList.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStudent({ name: s.name, class: s.class });
                  setMonitoredStudent(s);
                }}
                className={`w-full text-left px-3.5 py-3 rounded-2xl mb-1.5 transition-all duration-300 flex items-center gap-3.5 group relative overflow-hidden border ${
                  selectedStudent?.name === s.name
                    ? 'bg-slate-900 text-white border-transparent shadow-sm scale-[1.01]'
                    : 'bg-surface hover:bg-surface-hover/80 text-foreground border-border/60 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                  selectedStudent?.name === s.name
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate leading-tight tracking-tight">{s.name}</p>
                  <p className={`text-[11px] font-medium mt-1 ${selectedStudent?.name === s.name ? 'text-white/80' : 'text-muted'}`}>Kelas {s.class}</p>
                </div>
              </button>
            )) : (
              <p className="text-center text-xs text-muted p-4">Siswa tidak ditemukan.</p>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {!selectedStudent ? (
            <div className="flex-1 card flex flex-col items-center justify-center p-10 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4 animate-float">
                <Award className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-base font-bold text-foreground">Pilih Siswa</p>
              <p className="text-sm text-muted mt-1 text-center max-w-xs">Silakan pilih siswa dari daftar di sebelah kiri untuk mengelola nilai.</p>
            </div>
          ) : (
            <>
              {/* Mini stat bar */}
              {displayedGrades.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Rata-rata', value: avgScore ?? '-', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Lulus (≥75)', value: displayedGrades.filter(g => g.score >= 75).length, color: 'text-slate-900', bg: 'bg-slate-50', border: 'border-slate-200' },
                    { label: 'Total Ujian', value: displayedGrades.length, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
                  ].map(s => (
                    <div key={s.label} className={`card p-4 text-center ${s.bg} ${s.border} border shadow-sm transition-all duration-300`}>
                      <p className={`text-2xl font-black ${s.color} tracking-tight`}>{s.value}</p>
                      <p className="text-xs font-semibold text-muted/80 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Input form */}
              <div className="card p-6 border-slate-200 bg-surface shadow-sm">
                <h3 className="font-bold text-foreground mb-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Plus className="w-4.5 h-4.5 text-primary animate-pulse" />
                    Input Nilai: <span className="text-primary font-extrabold">{selectedStudent.name}</span>
                  </span>
                  <span className="text-xs font-bold px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/10">Kelas {selectedStudent.class}</span>
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                      <select value={subject} onChange={e => setSubject(e.target.value)} required className="input-field text-sm font-medium border-border/80 focus:ring-2 focus:ring-primary/20">
                        <option value="">Pilih Mapel</option>
                        {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="Lainnya">Lainnya...</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-500 uppercase tracking-wider">Jenis</label>
                      <select value={type} onChange={e => setType(e.target.value as any)} required className="input-field text-sm font-medium border-border/80 focus:ring-2 focus:ring-primary/20">
                        <option value="Ujian Harian">Ujian Harian</option>
                        <option value="Tengah Semester">Tengah Semester</option>
                        <option value="Awal Semester">Awal Semester</option>
                        <option value="Akhir Semester">Akhir Semester</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-500 uppercase tracking-wider">Nilai (0–100)</label>
                      <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value ? Number(e.target.value) : '')} required className="input-field text-sm font-medium border-border/80 focus:ring-2 focus:ring-primary/20" placeholder="0–100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-500 uppercase tracking-wider">Tanggal</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-field text-sm font-medium border-border/80 focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  {errorMsg && <p className="text-xs text-danger font-bold">⚠️ {errorMsg}</p>}
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all duration-300 hover:shadow-lg disabled:opacity-60">
                      {isSubmitting ? 'Menyimpan...' : <><Plus className="w-4 h-4" /> Simpan Nilai</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Grades table with mobile scroll */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-surface-hover/50 flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">Riwayat Nilai</h3>
                  <span className="text-xs text-muted">{displayedGrades.length} catatan</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface z-10 shadow-sm">
                      <tr className="text-xs text-muted">
                        <th className="px-4 py-3 font-semibold">Tanggal</th>
                        <th className="px-4 py-3 font-semibold">Mata Pelajaran</th>
                        <th className="px-4 py-3 font-semibold">Jenis</th>
                        <th className="px-4 py-3 font-semibold text-center">Nilai</th>
                        <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {displayedGrades.map(g => (
                        <tr key={g.id} className="table-row animate-slide-up">
                          <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">{new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{g.subject}</td>
                          <td className="px-4 py-3">
                            <span className={`badge ${getTypeColor(g.type)}`}>{g.type}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-xs ${getScoreColor(g.score)}`}>{g.score}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => { if (confirm(`Hapus nilai ${g.subject}?`)) deleteGrade(g.id); }}
                              className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-all inline-flex"
                              title="Hapus Nilai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {displayedGrades.length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-muted">
                          <p className="text-sm">Belum ada riwayat nilai untuk siswa ini.</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
