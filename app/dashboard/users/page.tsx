'use client';

import { useAppStore } from '@/app/lib/store';
import {
  Users, Shield, GraduationCap, Search, Plus, X,
  UserCheck, UserPlus, Edit2, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Home, ChevronDown
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import type { Student } from '@/app/lib/types';

export default function UsersPage() {
  const {
    currentUser, users, createUserByAdmin,
    students, fetchStudents, addStudent, updateStudent, deleteStudent,
    assignHomeroomTeacher,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'users' | 'students'>('users');

  // Load students on mount if not loaded
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ================= USERS TAB STATE =================
  const [userSearch, setUserSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Add teacher modal state
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherClass, setTeacherClass] = useState('');

  // Assign Walikelas state
  const [assigningTeacher, setAssigningTeacher] = useState<string | null>(null); // teacherId
  const [assignClass, setAssignClass] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // ================= STUDENTS TAB STATE =================
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Add student modal state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState(SCHOOL_CLASSES[0]);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Edit student modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');

  // Delete student modal / state
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Guard: Hanya Admin yang bisa akses
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
        <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
        <p className="text-sm text-muted">Halaman ini hanya untuk administrator</p>
      </div>
    );
  }

  // Handle Add Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserByAdmin({
        name: teacherName,
        email: teacherEmail,
        role: 'teacher',
        subject: teacherSubject,
        homeClass: teacherClass || undefined
      }, teacherPassword);

      setShowAddTeacher(false);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPassword('');
      setTeacherSubject('');
      setTeacherClass('');
      showNotification('Akun guru berhasil ditambahkan!');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menambahkan guru.', 'error');
    }
  };

  // Handle Assign Walikelas
  const handleAssignHomeroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher || !assignClass) return;
    setAssignLoading(true);
    try {
      await assignHomeroomTeacher(assigningTeacher, assignClass);
      showNotification(`Walikelas berhasil ditetapkan untuk Kelas ${assignClass}!`);
      setAssigningTeacher(null);
      setAssignClass('');
    } catch (err: any) {
      showNotification(err.message || 'Gagal menetapkan walikelas.', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      showNotification('Nama siswa tidak boleh kosong.', 'error');
      return;
    }
    setIsSubmittingStudent(true);
    try {
      const res = await addStudent({
        name: newStudentName.trim(),
        class: newStudentClass
      });
      if (res) {
        showNotification(`Siswa "${newStudentName}" berhasil ditambahkan ke kelas ${newStudentClass}!`);
        setNewStudentName('');
        setShowAddStudent(false);
      } else {
        showNotification('Gagal menambahkan siswa ke database.', 'error');
      }
    } catch (err: any) {
      showNotification(err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Handle Edit Student
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentName.trim()) {
      showNotification('Nama siswa tidak boleh kosong.', 'error');
      return;
    }
    const ok = await updateStudent(editingStudent.id, {
      name: editStudentName.trim(),
      class: editStudentClass
    });
    if (ok) {
      showNotification(`Data siswa "${editStudentName}" berhasil diperbarui.`);
      setEditingStudent(null);
    } else {
      showNotification('Gagal memperbarui data siswa.', 'error');
    }
  };

  // Handle Delete Student
  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    const ok = await deleteStudent(deletingStudent.id);
    if (ok) {
      showNotification(`Siswa "${deletingStudent.name}" telah dihapus.`);
      setDeletingStudent(null);
    } else {
      showNotification('Gagal menghapus siswa.', 'error');
    }
  };

  // Filter Users
  let filteredUsers = users;
  if (userSearch) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  }
  if (filterRole) {
    filteredUsers = filteredUsers.filter(u => u.role === filterRole);
  }

  // Filter Students
  const filteredStudents = useMemo(() => {
    let list = students;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q)
      );
    }
    if (filterClass) {
      list = list.filter(s => s.class === filterClass);
    }
    return list;
  }, [students, studentSearch, filterClass]);

  // Pagination for Students
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, studentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, filterClass]);

  const roleLabel = (role: string) =>
    role === 'admin' ? 'Admin' : role === 'teacher' ? 'Guru' : role === 'bk' ? 'Guru BK' : 'Orang Tua';

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-slate-900 text-white';
      case 'teacher': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'bk': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`fixed top-5 right-5 z-[99999] px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all animate-slide-up ${
              feedback.type === 'success'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-red-600 text-white shadow-sm'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Users className="w-7 h-7 text-primary" />
              Kelola Pengguna & Data Siswa
            </h1>
            <p className="text-sm text-muted mt-1 font-medium">
              Pusat kendali akun guru, orang tua, dan database seluruh siswa sekolah.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'users' ? (
              <button
                onClick={() => setShowAddTeacher(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Guru
              </button>
            ) : (
              <button
                onClick={() => setShowAddStudent(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Tambah Siswa Baru
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Akun Pengguna ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'students'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Data Siswa ({students.length})
          </button>
        </div>

        {/* ================= TAB 1: USERS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Cari pengguna berdasarkan nama atau email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 outline-none transition-all text-sm font-medium"
                />
              </div>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none text-sm font-semibold"
              >
                <option value="">Semua Role</option>
                <option value="parent">Orang Tua</option>
                <option value="teacher">Guru</option>
                <option value="bk">Guru BK</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Grid Card Pengguna (Warna Senada dengan Halaman Lainnya) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredUsers.map((u, i) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-surface text-foreground border border-border hover:border-primary/40 hover:shadow-md transition-all animate-slide-up flex flex-col justify-between"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-foreground truncate text-[15px]">{u.name}</p>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${roleColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </div>
                      <p className="text-xs text-muted font-medium truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  {u.role === 'parent' && u.childName && (
                    <div className="mt-3.5 pt-3 border-t border-border text-xs text-foreground/80 flex items-center gap-1.5 font-medium">
                      <span className="text-muted">Anak:</span>
                      <span className="font-bold text-foreground">{u.childName}</span>
                      <span className="text-muted">({u.childClass})</span>
                    </div>
                  )}
                  {u.role === 'teacher' && (
                    <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="text-xs text-foreground/80 flex items-center gap-2 font-medium">
                        <span className="font-bold text-primary">{u.subject || 'Guru'}</span>
                        {u.homeClass && (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Home className="w-3 h-3" /> Wali Kelas {u.homeClass}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => { setAssigningTeacher(u.id); setAssignClass(u.homeClass || ''); }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors whitespace-nowrap"
                      >
                        {u.homeClass ? 'Ganti Kelas' : 'Tetapkan Walikelas'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 2: STUDENTS ================= */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Stats Overview Cards (Warna Lembut Senada) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Total Siswa Terdaftar</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {students.length.toLocaleString('id-ID')} Siswa
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Kelas Aktif</p>
                <p className="text-2xl font-black text-blue-950 mt-1">
                  {SCHOOL_CLASSES.length} Kelas (7.1 – 9.11)
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Rata-rata Siswa per Kelas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {Math.round(students.length / (SCHOOL_CLASSES.length || 1))} Siswa
                </p>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Cari nama siswa atau kelas..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 outline-none transition-all text-sm font-medium"
                />
              </div>

              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none text-sm font-semibold"
              >
                <option value="">Semua Kelas (33 Kelas)</option>
                {SCHOOL_CLASSES.map(c => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Count Indicator */}
            <div className="flex items-center justify-between text-xs text-muted font-medium px-1">
              <span>
                Menampilkan <strong className="text-foreground">{filteredStudents.length}</strong> siswa {filterClass ? `di Kelas ${filterClass}` : ''}
              </span>
              <span>
                Halaman {studentPage} dari {totalPages}
              </span>
            </div>

            {/* Students List Table (Card Senada) */}
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-slate-100/80 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-muted font-medium">
                          Tidak ada siswa yang sesuai dengan pencarian atau filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedStudents.map((s, idx) => {
                        const globalIndex = (studentPage - 1) * PAGE_SIZE + idx + 1;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-xs font-bold text-muted w-12">
                              {globalIndex}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              {s.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100/80 text-indigo-800 border border-indigo-200/60">
                                Kelas {s.class}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingStudent(s);
                                    setEditStudentName(s.name);
                                    setEditStudentClass(s.class);
                                  }}
                                  title="Edit Siswa"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingStudent(s)}
                                  title="Hapus Siswa"
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Nav */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border flex items-center justify-between text-foreground bg-slate-50/50">
                  <button
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage(p => Math.max(p - 1, 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold disabled:opacity-40 hover:bg-surface text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-bold text-foreground">{studentPage}</span>
                    <span className="text-muted">/ {totalPages}</span>
                  </div>

                  <button
                    disabled={studentPage >= totalPages}
                    onClick={() => setStudentPage(p => Math.min(p + 1, totalPages))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold disabled:opacity-40 hover:bg-surface text-foreground transition-colors"
                  >
                    Selanjutnya <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: TAMBAH GURU ================= */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-border animate-scale-in">
            <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="w-5 h-5 text-primary" />
                Tambah Akun Guru
              </h2>
              <button
                onClick={() => setShowAddTeacher(false)}
                className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  required
                  placeholder="Contoh: Ibu Rina Agustina, S.Pd"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={e => setTeacherEmail(e.target.value)}
                  required
                  placeholder="rina@school.id"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={e => setTeacherPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Mata Pelajaran</label>
                <input
                  type="text"
                  value={teacherSubject}
                  onChange={e => setTeacherSubject(e.target.value)}
                  required
                  placeholder="Contoh: Matematika / IPA"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Wali Kelas (Opsional)</label>
                <select
                  value={teacherClass}
                  onChange={e => setTeacherClass(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
                >
                  <option value="">Bukan Wali Kelas</option>
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c} value={c}>
                      Wali Kelas {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all mt-4 text-sm"
              >
                Simpan & Daftarkan Guru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TETAPKAN WALI KELAS ================= */}
      {assigningTeacher && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-md shadow-2xl border border-border animate-scale-in">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Home className="w-5 h-5 text-primary" />
                Tetapkan Wali Kelas
              </h2>
              <button
                onClick={() => { setAssigningTeacher(null); setAssignClass(''); }}
                className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignHomeroom} className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-muted font-medium">Nama Guru:</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {users.find(u => u.id === assigningTeacher)?.name || 'Guru'}
                </p>
                <p className="text-xs text-primary font-semibold mt-0.5">
                  Mata Pelajaran: {users.find(u => u.id === assigningTeacher)?.subject || '-'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilih Kelas Binaan
                </label>
                <select
                  value={assignClass}
                  onChange={e => setAssignClass(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-2">
                  Setelah disimpan, guru ini akan otomatis menjadi Wali Kelas dan langsung terhubung dengan seluruh orang tua murid di kelas tersebut (grup kelas & chat pribadi).
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setAssigningTeacher(null); setAssignClass(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !assignClass}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {assignLoading ? 'Menyimpan...' : 'Simpan & Hubungkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH SISWA BARU ================= */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-md shadow-2xl border border-border animate-scale-in">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <UserPlus className="w-5 h-5 text-primary" />
                Tambah Siswa Baru
              </h2>
              <button
                onClick={() => setShowAddStudent(false)}
                className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  required
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilih Kelas
                </label>
                <select
                  value={newStudentClass}
                  onChange={e => setNewStudentClass(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
                >
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-60"
                >
                  {isSubmittingStudent ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SISWA ================= */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-md shadow-2xl border border-border animate-scale-in">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Edit2 className="w-5 h-5 text-primary" />
                Edit Data Siswa
              </h2>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditStudent} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={e => setEditStudentName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Kelas
                </label>
                <select
                  value={editStudentClass}
                  onChange={e => setEditStudentClass(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground outline-none focus:ring-2 focus:ring-primary/30 text-sm font-semibold"
                >
                  {SCHOOL_CLASSES.map(c => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS SISWA ================= */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Hapus Siswa?</h3>
            <p className="text-xs text-muted mt-1.5 leading-relaxed font-medium">
              Anda yakin ingin menghapus data siswa <strong className="text-foreground">{deletingStudent.name}</strong> (Kelas {deletingStudent.class})? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-600/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
