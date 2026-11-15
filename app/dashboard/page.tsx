'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import {
  AlertTriangle, Trophy, Calendar, MessageCircle,
  TrendingUp, TrendingDown, Users, Clock, ArrowUpRight,
  Sparkles, BookOpen, CheckCircle2, Search, X, ChevronDown,
  UserSquare2, Plus, Bell, FileText, ScanSearch,
} from 'lucide-react';
import Link from 'next/link';
import PerformanceChart from '@/app/components/PerformanceChart';
import GradeChart from '@/app/components/GradeChart';
import type { Student } from '@/app/lib/types';

// ── Student Monitor Picker ──────────────────────────────────────────
function StudentPicker({
  students,
  selected,
  onSelect,
}: {
  students: Student[];
  selected: Student | null;
  onSelect: (s: Student | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 288) });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.class.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/15 transition-all duration-200 min-w-[220px]"
      >
        <UserSquare2 className="w-4 h-4 text-indigo-300 flex-shrink-0" />
        <span className="text-sm font-semibold flex-1 text-left truncate">
          {selected ? selected.name : 'Pilih Siswa untuk Monitor'}
        </span>
        {selected && (
          <span className="text-[10px] text-white/70 font-medium bg-white/15 px-1.5 py-0.5 rounded">
            {selected.class}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-white/60 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Fixed dropdown — tidak terpotong overflow:hidden hero banner */}
      {open && (
        <div
          ref={dropdownRef}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in"
        >
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari nama atau kelas..."
                className="w-full pl-8 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 rounded-lg border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Reset */}
          {selected && (
            <button
              onClick={() => { onSelect(null); setOpen(false); setQuery(''); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-b border-slate-100"
            >
              <X className="w-3.5 h-3.5" />
              Tampilkan Semua Siswa
            </button>
          )}

          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Siswa tidak ditemukan</p>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onSelect(s); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0 ${selected?.id === s.id ? 'bg-indigo-50/60' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${selected?.id === s.id ? 'text-indigo-600' : 'text-slate-800'}`}>{s.name}</p>
                    <p className="text-xs text-slate-400">Kelas {s.class}</p>
                  </div>
                  {selected?.id === s.id && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, violations, achievements, appointments, notifications, grades, students, monitoredStudent, setMonitoredStudent } = useAppStore();

  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  // Wali kelas hanya dapat memonitor siswa dari kelasnya sendiri
  const availableStudents = useMemo(() => {
    if (currentUser?.role === 'teacher' && currentUser?.homeClass) {
      return students.filter(s => s.class === currentUser.homeClass);
    }
    return students;
  }, [students, currentUser]);

  const stats = useMemo(() => {
    if (!currentUser) return null;

    let studentViolations = violations;
    let studentAchievements = achievements;
    let userAppointments = appointments;
    let userNotifications = notifications.filter(n => n.targetUserId === currentUser.id);
    let studentGrades = grades;

    if (currentUser.role === 'parent' && currentUser.childName) {
      const cn = currentUser.childName.trim().toLowerCase();
      studentViolations = violations.filter(v => v.studentName.trim().toLowerCase().includes(cn) || cn.includes(v.studentName.trim().toLowerCase()));
      studentAchievements = achievements.filter(a => a.studentName.trim().toLowerCase().includes(cn) || cn.includes(a.studentName.trim().toLowerCase()));
      userAppointments = appointments.filter(a => a.parentId === currentUser.id);
      studentGrades = grades.filter(g => g.studentName.trim().toLowerCase().includes(cn) || cn.includes(g.studentName.trim().toLowerCase()));
    } else if (isAdminOrTeacher && monitoredStudent) {
      // Filter by selected student
      const mn = monitoredStudent.name.trim().toLowerCase();
      studentViolations = violations.filter(v => v.studentName.trim().toLowerCase() === mn);
      studentAchievements = achievements.filter(a => a.studentName.trim().toLowerCase() === mn);
      studentGrades = grades.filter(g => g.studentName.trim().toLowerCase() === mn);
      if (currentUser.role === 'teacher') {
        userAppointments = appointments.filter(a => a.teacherId === currentUser.id);
      }
    } else if (currentUser.role === 'teacher') {
      studentViolations = violations.filter(v => v.reportedBy === currentUser.id);
      userAppointments = appointments.filter(a => a.teacherId === currentUser.id);
    }

    return {
      violations: studentViolations,
      achievements: studentAchievements,
      appointments: userAppointments,
      notifications: userNotifications,
      totalViolations: studentViolations.length,
      totalAchievements: studentAchievements.length,
      pendingAppointments: userAppointments.filter(a => a.status === 'pending').length,
      unreadNotifications: userNotifications.filter(n => !n.read).length,
      grades: studentGrades,
    };
  }, [currentUser, violations, achievements, appointments, notifications, grades, monitoredStudent, isAdminOrTeacher]);

  if (!currentUser || !stats) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 15 ? '🌤️' : hour < 18 ? '🌅' : '🌙';

  const avgGrade = stats.grades.length > 0
    ? Math.round(stats.grades.reduce((a, g) => a + g.score, 0) / stats.grades.length)
    : null;

  const statCards = [
    { label: 'Pelanggaran', value: stats.totalViolations, icon: AlertTriangle, href: '/dashboard/violations', desc: 'Total tercatat', trend: currentUser.role === 'parent' ? (stats.totalViolations > 3 ? 'up' : 'down') : null },
    { label: 'Prestasi Siswa', value: stats.totalAchievements, icon: Trophy, href: '/dashboard/achievements', desc: 'Diraih siswa', trend: currentUser.role === 'parent' ? 'up' : null },
    { label: 'Janji Temu', value: stats.pendingAppointments, icon: Calendar, href: '/dashboard/appointments', desc: 'Menunggu konfirmasi', trend: null },
    { label: 'Notifikasi', value: stats.unreadNotifications, icon: MessageCircle, href: '/dashboard/notifications', desc: 'Pesan & info baru', trend: null },
  ];

  const monitorLabel = monitoredStudent
    ? monitoredStudent.name
    : isAdminOrTeacher ? 'Semua Siswa' : currentUser.childName ?? 'siswa';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 lg:p-8 text-white shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/10 text-xs font-medium text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sistem Aktif
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {greetingEmoji} {greeting}, <span className="text-slate-300">{currentUser.name.split(' ')[0]}</span>!
            </h1>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              {currentUser.role === 'parent'
                ? `Pantau kehadiran, nilai, dan rekam prestasi ${currentUser.childName} di kelas ${currentUser.childClass} secara real-time.`
                : currentUser.role === 'teacher'
                ? 'Kelola presensi, penilaian, serta monitoring perkembangan siswa di kelas Anda.'
                : 'Kelola seluruh aktivitas monitoring dan administrasi EduMonitor dari satu pusat kendali.'}
            </p>

            {/* Student picker for admin/teacher */}
            {isAdminOrTeacher && (
              <div className="pt-2">
                <StudentPicker
                  students={availableStudents}
                  selected={monitoredStudent}
                  onSelect={setMonitoredStudent}
                />
                {monitoredStudent && (
                  <p className="text-xs text-slate-400 mt-2 ml-1">
                    Menampilkan data siswa: <span className="text-white font-semibold">{monitoredStudent.name}</span> · Kelas {monitoredStudent.class}
                  </p>
                )}
              </div>
            )}

            {/* Parent child info */}
            {currentUser.role === 'parent' && currentUser.childName && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mt-2 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-200">{currentUser.childName}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{currentUser.childClass}</span>
              </div>
            )}
          </div>

          {/* Quick stats pills */}
          <div className="flex flex-wrap gap-2.5 lg:flex-col lg:items-end">
            {avgGrade !== null && (
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-200">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Rata-rata Nilai</p>
                  <p className="text-base font-bold text-white">{avgGrade}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Prestasi Terdata</p>
                <p className="text-base font-bold text-white">{stats.totalAchievements}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitor indicator bar (for teacher/admin when student selected) */}
      {isAdminOrTeacher && monitoredStudent && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 animate-fade-in">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">
            {monitoredStudent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800">
              Mode Monitor Aktif: <span className="text-slate-900">{monitoredStudent.name}</span>
            </p>
            <p className="text-[11px] text-slate-500">Kelas {monitoredStudent.class} · Seluruh statistik dan riwayat difilter untuk siswa ini</p>
          </div>
          <button
            onClick={() => setMonitoredStudent(null)}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
            title="Hapus filter siswa"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all">
                <stat.icon className="w-4 h-4 lg:w-5 lg:h-5" />
              </div>
              <div className="flex flex-col items-end gap-1">
                {stat.trend && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold ${stat.trend === 'up' ? 'text-rose-600' : 'text-slate-600'}`}>
                    {stat.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </div>
                )}
                <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-200" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-700 mt-1">{stat.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden lg:block">{stat.desc}</p>
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ...(isAdminOrTeacher ? [{ label: 'Catat Pelanggaran', icon: AlertTriangle, href: '/dashboard/violations' }] : []),
          { label: 'Kirim Pesan', icon: MessageCircle, href: '/dashboard/chat' },
          { label: 'Janji Temu', icon: Calendar, href: '/dashboard/appointments' },
          { label: 'Notifikasi', icon: Bell, href: '/dashboard/notifications' },
          ...(isAdminOrTeacher ? [{ label: 'Pemeriksa Ujian', icon: ScanSearch, href: '/dashboard/exam-checker' }] : []),
          ...(!isAdminOrTeacher ? [{ label: 'Lihat Nilai', icon: BookOpen, href: '/dashboard/grades' }] : []),
          { label: 'Izin & Absensi', icon: FileText, href: '/dashboard/permits' },
        ].slice(0, 4).map((action, i) => (
          <Link key={i} href={action.href}
            className="flex flex-col items-center justify-center gap-2 p-3 lg:p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all">
              <action.icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-center text-slate-700 leading-tight">{action.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Performance Chart ── */}
      <PerformanceChart violations={stats.violations} achievements={stats.achievements} />

      {/* ── Grade Chart ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <BookOpen className="w-4 h-4" />
              </div>
              Dasbor Nilai Transparan
            </h2>
            <p className="text-xs text-muted mt-1 ml-10">
              {isAdminOrTeacher && monitoredStudent
                ? `Nilai akademik ${monitoredStudent.name} per mata pelajaran`
                : `Grafik perkembangan akademik ${currentUser.role === 'parent' ? 'anak Anda' : 'siswa'} per mata pelajaran`}
            </p>
          </div>
          {currentUser.role !== 'parent' && (
            <Link
              href="/dashboard/grades"
              className="group flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-primary/8 text-primary hover:bg-primary hover:text-white transition-all duration-200"
            >
              Kelola Nilai
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          )}
        </div>

        {isAdminOrTeacher && !monitoredStudent && stats.grades.length === 0 ? (
          <div className="empty-state h-[200px]">
            <UserSquare2 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">Pilih siswa untuk melihat grafik nilai</p>
            <p className="text-xs opacity-60 mt-1">Gunakan tombol "Pilih Siswa untuk Monitor" di atas</p>
          </div>
        ) : (
          <GradeChart grades={stats.grades} studentName={monitoredStudent?.name ?? currentUser.childName} />
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">

        {/* Violations */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-red-500" />
              </div>
              Pelanggaran Terbaru
              {monitoredStudent && <span className="text-xs font-normal text-muted">— {monitoredStudent.name}</span>}
            </h3>
            <Link href="/dashboard/violations" className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors">
              Lihat Semua <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {stats.violations.slice(0, 4).map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-all duration-200 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 pulse-dot ${v.severity === 'berat' ? 'bg-danger' : v.severity === 'sedang' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{v.violationType}</p>
                  <p className="text-xs text-muted truncate">{v.studentName} · {v.studentClass}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge text-[10px] ${v.severity === 'berat' ? 'bg-red-50 text-red-600' : v.severity === 'sedang' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-700'}`}>{v.severity}</span>
                  <p className="text-[10px] text-muted mt-1">{new Date(v.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
            {stats.violations.length === 0 && (
              <div className="empty-state py-8">
                <AlertTriangle className="w-7 h-7 mb-2 opacity-20" />
                <p className="text-sm font-medium">{monitoredStudent ? `${monitoredStudent.name} belum ada pelanggaran` : 'Belum ada pelanggaran'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </div>
              Prestasi Terbaru
              {monitoredStudent && <span className="text-xs font-normal text-muted">— {monitoredStudent.name}</span>}
            </h3>
            <Link href="/dashboard/achievements" className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors">
              Lihat Semua <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {stats.achievements.slice(0, 4).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover transition-all duration-200 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center text-lg flex-shrink-0">
                  {a.category === 'akademik' ? '📚' : a.category === 'olahraga' ? '⚽' : a.category === 'seni' ? '🎨' : '⭐'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted truncate">{a.studentName} · {a.studentClass}</p>
                </div>
                <p className="text-[10px] text-muted flex-shrink-0">{new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
              </div>
            ))}
            {stats.achievements.length === 0 && (
              <div className="empty-state py-8">
                <Trophy className="w-7 h-7 mb-2 opacity-20" />
                <p className="text-sm font-medium">{monitoredStudent ? `${monitoredStudent.name} belum ada prestasi` : 'Belum ada prestasi'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
