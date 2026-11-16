'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';
import type { UserRole } from '@/app/lib/types';
import {
  Eye, EyeOff, LogIn, GraduationCap, ArrowRight, UserPlus,
  Shield, Search, Sparkles, Bell, BarChart3, MessageSquare,
  Star, CheckCircle, ChevronRight, ChevronDown, X, Users,
  BookOpen, ClipboardCheck, ArrowDown, ArrowUpRight, Check, Calendar,
  Bot, FileSpreadsheet, Sun, Moon
} from 'lucide-react';
import { useTheme } from '@/app/lib/theme';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import { createPortal } from 'react-dom';
import { DEMO_TEACHER_ACCOUNTS, isDemoUser } from '@/app/lib/demoLimit';

function AnimatedCounter({ target, suffix = '', duration = 1800 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
          else setCount(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{count.toLocaleString('id-ID')}{suffix}</span>;
}

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login, register, resetPassword, updatePassword, checkSession, fetchStudents, addStudent } = useAppStore();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  // States untuk fitur Lupa Password
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // States untuk fitur Setel Ulang Password (klik link dari email)
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Deteksi token recovery dari hash URL Supabase
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        setIsResetMode(true);
      }
    }
  }, []);

  const isGoogleEmail = (email: string) => {
    const lower = email.toLowerCase().trim();
    if (!lower) return false;
    return lower.endsWith('@gmail.com') || lower.endsWith('@school.id') || lower.endsWith('@edu.id');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isDemoUser({ email: forgotEmail })) {
      setError('Akun demo tidak dapat melakukan reset kata sandi.');
      return;
    }
    if (!isGoogleEmail(forgotEmail)) {
      setError('Harap masukkan alamat email Google (@gmail.com atau @school.id) yang valid.');
      return;
    }
    setLoading(true);
    try {
      const ok = await resetPassword(forgotEmail);
      if (ok) {
        setForgotSuccess(true);
      } else {
        setError('Gagal mengirim email reset. Pastikan email terdaftar di sistem.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (currentUser && isDemoUser(currentUser)) {
      setError('Akun demo tidak dapat mengganti kata sandi.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Sandi baru harus minimal 6 karakter.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      setResetSuccess(true);
      // Hapus hash URL agar tidak memicu reset mode lagi
      if (typeof window !== 'undefined') {
        window.location.hash = '';
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!currentUser) await checkSession();
      await fetchStudents();
    };
    init();
  }, [currentUser, checkSession, fetchStudents]);

  useEffect(() => {
    if (currentUser && !isResetMode) {
      router.push('/dashboard');
    }
  }, [currentUser, router, isResetMode]);

  useEffect(() => {
    const interval = setInterval(() => setActiveFeature(p => (p + 1) % 4), 3000);
    return () => clearInterval(interval);
  }, []);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const regRole: UserRole = 'parent';
  const [regChildName, setRegChildName] = useState('');
  const [regChildClass, setRegChildClass] = useState('');
  const { students } = useAppStore();
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [isManualChild, setIsManualChild] = useState(false);
  const [linkedChildNames, setLinkedChildNames] = useState<Set<string>>(new Set());
  const studentInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Fetch already-linked child names from Supabase (even before login)
  useEffect(() => {
    supabase
      .from('profiles')
      .select('child_name')
      .eq('role', 'parent')
      .not('child_name', 'is', null)
      .then(({ data }) => {
        if (data) {
          setLinkedChildNames(
            new Set(data.map((p: { child_name: string | null }) => p.child_name?.toLowerCase()).filter(Boolean) as string[])
          );
        }
      });
  }, []);

  // Update dropdown portal position on scroll/resize
  useEffect(() => {
    if (!showStudentList) return;
    const update = () => {
      if (studentInputRef.current) {
        const r = studentInputRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [showStudentList]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showStudentList) return;
    const handler = (e: MouseEvent) => {
      if (studentInputRef.current && !studentInputRef.current.contains(e.target as Node)) {
        setShowStudentList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStudentList]);

  const filteredStudents = students.filter(s =>
    (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.class.includes(studentSearch)) &&
    !linkedChildNames.has(s.name.toLowerCase())
  ).slice(0, 5);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      if (user) router.push('/dashboard');
      else setError('Login gagal. Pastikan email dan password benar.');
    } catch { setError('Terjadi kesalahan saat login.'); }
    finally { setLoading(false); }
  };

  const fillDemoAccount = (email: string, pass: string) => {
    setIsLogin(true);
    setError('');
    setLoginEmail(email);
    setLoginPassword(pass);
  };

  const handleQuickDemoLogin = async (email: string, pass: string) => {
    setIsLogin(true);
    setError('');
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoading(true);
    try {
      const user = await login(email, pass);
      if (user) router.push('/dashboard');
      else setError('Login gagal. Pastikan data akun demo telah tersinkronisasi.');
    } catch {
      setError('Terjadi kesalahan saat login akun demo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!regChildName || !regChildClass) { setError('Nama anak dan kelas wajib diisi.'); return; }
    if (!isGoogleEmail(regEmail)) {
      setError('Registrasi Gagal: Anda wajib menggunakan akun email Google terdaftar (@gmail.com atau @school.id).');
      return;
    }
    // Cek apakah siswa sudah terdaftar oleh orang tua lain
    const nameToCheck = (isManualChild ? studentSearch : regChildName).toLowerCase();
    if (linkedChildNames.has(nameToCheck)) {
      setError('Siswa ini sudah terdaftar oleh akun orang tua lain.');
      return;
    }
    setLoading(true);
    try {
      let finalChildName = regChildName, finalChildClass = regChildClass;
      if (isManualChild) { finalChildName = studentSearch; await addStudent({ name: finalChildName, class: finalChildClass }); }
      const user = await register({ name: regName, email: regEmail, role: regRole, childName: finalChildName, childClass: finalChildClass }, regPassword);
      if (user) {
        // Refresh linked names to prevent race conditions in multi-tab
        setLinkedChildNames(prev => new Set([...prev, finalChildName.toLowerCase()]));
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('rate limit exceeded')) setError('Terlalu banyak percobaan. Mohon tunggu.');
      else if (msg.includes('already registered')) setError('Email sudah terdaftar. Silakan masuk.');
      else setError(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally { setLoading(false); }
  };

  const stats = [
    { value: 2400, suffix: '+', label: 'Siswa' },
    { value: 98, suffix: '%', label: 'Kepuasan' },
    { value: 150, suffix: '+', label: 'Guru' },
    { value: 32, suffix: 's', label: 'Respon' },
  ];

  const features = [
    { icon: Bell, title: 'Notifikasi Instan', desc: 'Alert kehadiran & pelanggaran langsung' },
    { icon: BarChart3, title: 'Nilai Transparan', desc: 'Pantau perkembangan nilai siswa real-time' },
    { icon: MessageSquare, title: 'Pesan Terpadu', desc: 'Komunikasi guru dan orang tua' },
    { icon: GraduationCap, title: 'Pemeriksa Ujian', desc: 'Evaluasi lembar jawaban cepat dan akurat' },
  ];

  const testimonials = [
    { name: 'Budi S.', role: 'Orang Tua Siswa', text: 'Sangat terbantu memantau presensi dan nilai anak setiap saat.', avatar: 'B' },
    { name: 'Dewi R.', role: 'Wali Kelas', text: 'Efisiensi pencatatan nilai dan absensi menjadi jauh lebih ringkas.', avatar: 'D' },
  ];

  const formContent = (
    <div className="w-full max-w-md mx-auto">
      {isResetMode ? (
        <form onSubmit={handleUpdatePassword} className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Setel Ulang Password</h2>
            <p className="text-xs text-slate-400 mt-1">Masukkan kata sandi baru untuk mengamankan akun Anda.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {resetSuccess ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-slate-800"><CheckCircle className="w-4 h-4 text-slate-600" /> Sandi Berhasil Diperbarui!</p>
              <p className="text-slate-500">Kata sandi baru Anda telah disimpan. Silakan masuk menggunakan sandi baru.</p>
              <button type="button" onClick={() => { setIsResetMode(false); setResetSuccess(false); setNewPassword(''); setError(''); }}
                className="w-full mt-2 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-700 transition-all text-center">
                Masuk Sekarang
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Kata Sandi Baru</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" required minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Sandi & Masuk'}
              </button>
            </>
          )}
        </form>
      ) : isForgotMode ? (
        <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Lupa Password?</h2>
            <p className="text-xs text-slate-400 mt-1">Masukkan email terdaftar Anda untuk menerima tautan pemulihan.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {forgotSuccess ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs leading-relaxed space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-slate-800"><CheckCircle className="w-4 h-4 text-slate-600" /> Tautan Terkirim!</p>
              <p className="text-slate-500">Email pemulihan dikirim ke <strong className="text-slate-700">{forgotEmail}</strong>. Periksa kotak masuk atau folder spam.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Anda</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="nama@gmail.com" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm" />
            </div>
          )}

          {!forgotSuccess && (
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Kirim Tautan Pemulihan'}
            </button>
          )}

          <button type="button" onClick={() => { setIsForgotMode(false); setError(''); setForgotSuccess(false); setForgotEmail(''); }}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 font-medium text-xs hover:bg-slate-50 transition-all text-center">
            ← Kembali ke Halaman Masuk
          </button>
        </form>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            {[{ label: 'Masuk', icon: LogIn, key: true }, { label: 'Daftar', icon: UserPlus, key: false }].map(({ label, icon: Icon, key }) => (
              <button key={label} onClick={() => { setIsLogin(key); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isLogin === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">{isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}</h2>
            <p className="text-sm text-slate-400 mt-1">{isLogin ? 'Masuk untuk memantau perkembangan anak Anda' : 'Daftar sebagai orang tua dan mulai pantau sekarang'}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2 animate-fade-in">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email atau Nama Lengkap</label>
                <input type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email atau nama lengkap" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-500">Password</label>
                  <button type="button" onClick={() => { setIsForgotMode(true); setError(''); }} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" />Masuk</>}
              </button>

              {/* Akun Demo Guru Card */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Akun Demo Guru</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Maks. 5 aksi/fitur/hari
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEMO_TEACHER_ACCOUNTS.map((demo, idx) => (
                    <div
                      key={demo.email}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col gap-2"
                    >
                      {/* Icon + Info row */}
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-700 dark:text-blue-400">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{demo.name.split(',')[0]}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{demo.description}</p>
                        </div>
                      </div>

                      {/* Credentials chip */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                        <p className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate">{demo.email}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">sandi: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{demo.password}</span></p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => fillDemoAccount(demo.email, demo.password)}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors text-center"
                        >
                          Isi Form
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleQuickDemoLogin(demo.email, demo.password)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[10px] font-semibold transition-all text-center flex items-center justify-center gap-0.5 shadow-xs"
                        >
                          Masuk
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-base flex-shrink-0">👨‍👩‍👧</div>
                <div><p className="text-sm font-semibold text-slate-700">Daftar sebagai Orang Tua</p><p className="text-xs text-slate-400">Akun guru hanya dibuat oleh Admin sekolah</p></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Nama Lengkap</label>
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Masukkan nama lengkap" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="nama@gmail.com" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm" />
                {regEmail && (
                  <div className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${isGoogleEmail(regEmail) ? 'text-slate-500' : 'text-rose-500'}`}>
                    {isGoogleEmail(regEmail) ? (
                      <><CheckCircle className="w-3.5 h-3.5 text-slate-400" /> Email terverifikasi</>
                    ) : (
                      <><X className="w-3.5 h-3.5 text-rose-500" /> Gunakan email Google (@gmail.com)</>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimal 6 karakter" required minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm" />
              </div>
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200" style={{ overflow: 'visible' }}>
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-slate-400" />Data Anak</p>
                <div className="relative">
                  <label className="block text-xs text-slate-400 mb-1">Cari Nama Anak</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                    <input ref={studentInputRef} type="text" value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); setShowStudentList(true); if (regChildName && !isManualChild) { setRegChildName(''); setRegChildClass(''); } }}
                      onFocus={() => {
                        setShowStudentList(true);
                        if (studentInputRef.current) {
                          const r = studentInputRef.current.getBoundingClientRect();
                          setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
                        }
                      }}
                      placeholder="Ketik nama anak Anda..." required={!regChildName}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-slate-400 outline-none transition-all text-sm" />
                  </div>
                  {showStudentList && studentSearch && !isManualChild && dropdownRect && typeof document !== 'undefined' && createPortal(
                    <div
                      style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, zIndex: 9999 }}
                      className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in"
                    >
                      {filteredStudents.length > 0 ? filteredStudents.map(s => (
                        <button key={s.id} type="button"
                          onClick={() => { setRegChildName(s.name); setRegChildClass(s.class); setStudentSearch(s.name); setShowStudentList(false); setIsManualChild(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{s.name[0]}</div>
                          <div><p className="text-sm font-semibold text-slate-800">{s.name}</p><p className="text-xs text-slate-400">Kelas {s.class}</p></div>
                        </button>
                      )) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-slate-400 mb-2">Anak tidak ditemukan</p>
                          <button type="button" onClick={() => { setIsManualChild(true); setRegChildName(studentSearch); setShowStudentList(false); }}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-slate-100 rounded-lg">+ Tambah Data Anak Baru</button>
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
                {isManualChild && (
                  <div className="space-y-3 p-3 rounded-xl bg-slate-100/70 border border-slate-200 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-slate-600 uppercase">Data Anak Baru</p>
                      <button type="button" onClick={() => { setIsManualChild(false); setStudentSearch(''); setRegChildName(''); setRegChildClass(''); }} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
                    </div>
                    <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Nama lengkap anak"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-400" />
                    <select value={regChildClass} onChange={e => setRegChildClass(e.target.value)} required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-400">
                      <option value="">-- Pilih Kelas --</option>
                      {SCHOOL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {regChildName && !isManualChild && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-slate-600" />
                      <div><p className="text-xs font-semibold text-slate-800">{regChildName}</p><p className="text-[11px] text-slate-500">Kelas {regChildClass}</p></div>
                    </div>
                    <button type="button" onClick={() => { setRegChildName(''); setRegChildClass(''); setStudentSearch(''); }} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">Ganti</button>
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" />Buat Akun & Mulai Pantau</>}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="EduMonitor Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900">EduMonitor</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-400 font-medium">Monitoring Siswa Sekolah</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#fitur" className="hover:text-slate-950 transition-colors">Fitur Utama</a>
            <a href="#keunggulan" className="hover:text-slate-950 transition-colors">Keunggulan</a>
            <a href="#demo" className="hover:text-slate-950 transition-colors">Akun Demo</a>
            <a href="#portal" className="hover:text-slate-950 transition-colors">Portal Masuk</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 flex items-center justify-center"
              title={isDark ? 'Beralih ke Mode Terang (White)' : 'Beralih ke Mode Gelap (Dark)'}
              aria-label="Ganti Tema"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <a
              href="#portal"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Masuk / Daftar
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Split: Headline & Public Pitch + Direct Access Portal) ── */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            {/* Left pitch */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistem Informasi & Monitoring Siswa Terpadu
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Pantau Presensi, Nilai & Pembinaan Siswa Secara Ringkas.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Satu aplikasi yang menghubungkan sekolah, wali kelas, guru BK, dan orang tua. Menghilangkan kerumitan rekap manual dan menyajikan data perkembangan anak secara transparan.
              </p>

              {/* 4 Fitur Unggulan Sistem */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                {[
                  {
                    icon: Bot,
                    title: 'AI Koreksi Ujian Cerdas',
                    desc: 'Koreksi lembar jawaban dan analisis butir soal otomatis dengan bantuan kecerdasan buatan.',
                  },
                  {
                    icon: Bell,
                    title: 'Broadcast Pengumuman',
                    desc: 'Kirim edaran resmi dan pengumuman mendesak sekolah secara instan ke ponsel orang tua.',
                  },
                  {
                    icon: ClipboardCheck,
                    title: 'Disposisi Surat Izin Digital',
                    desc: 'Verifikasi surat sakit dan izin siswa berlampiran foto langsung disetujui wali kelas.',
                  },
                  {
                    icon: FileSpreadsheet,
                    title: 'Ekspor Rekap & Laporan',
                    desc: 'Unduh rekap presensi, akumulasi poin pelanggaran, dan rapor berkala siap cetak.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="feature-card p-2.5 sm:p-3.5 rounded-xl border shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5">
                        <div className="feature-icon-box w-6 h-6 sm:w-7 sm:h-7 rounded-lg border flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <h3 className="feature-title text-[11px] sm:text-xs font-bold leading-tight">
                          {item.title}
                        </h3>
                      </div>
                      <p className="feature-desc text-[10px] sm:text-[11px] leading-snug sm:leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Minimal metrics */}
              <div className="grid grid-cols-4 gap-3 pt-2">
                {stats.map((s, i) => (
                  <div key={i} className="text-center sm:text-left">
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">
                      <AnimatedCounter target={s.value} suffix={s.suffix} duration={1400 + i * 200} />
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Focused Minimalist Auth Portal */}
            <div id="portal" className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-7">
                {formContent}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section: Keunggulan bagi Sekolah & Orang Tua ── */}
      <section id="keunggulan" className="py-16 border-b border-slate-200/80 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mengapa Memilih Kami</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Solusi Praktis Mengatasi Masalah Komunikasi & Rekap Sekolah.
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Dirancang untuk kemudahan orang tua yang sibuk dan efisiensi waktu guru di sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="feature-card p-6 rounded-2xl border shadow-sm space-y-3">
              <div className="feature-icon-box w-10 h-10 rounded-xl border flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h3 className="feature-title text-base font-bold">Presensi Cepat & Tanpa Kertas</h3>
              <p className="feature-desc text-xs sm:text-sm leading-relaxed">
                Guru dapat menandai presensi harian atau memindai foto buku absen. Rekap kehadiran otomatis tersimpan dan dapat langsung diketahui orang tua.
              </p>
            </div>

            <div className="feature-card p-6 rounded-2xl border shadow-sm space-y-3">
              <div className="feature-icon-box w-10 h-10 rounded-xl border flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="feature-title text-base font-bold">Perkembangan Nilai Transparan</h3>
              <p className="feature-desc text-xs sm:text-sm leading-relaxed">
                Orang tua dapat memantau grafik perkembangan nilai tugas, ulangan, dan ujian tanpa perlu menunggu rapor semester dibagikan.
              </p>
            </div>

            <div className="feature-card p-6 rounded-2xl border shadow-sm space-y-3">
              <div className="feature-icon-box w-10 h-10 rounded-xl border flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="feature-title text-base font-bold">Pembinaan Karakter & Prestasi</h3>
              <p className="feature-desc text-xs sm:text-sm leading-relaxed">
                Pencatatan pelanggaran dan apresiasi prestasi siswa dikelola secara terstruktur antara wali kelas dan guru bimbingan konseling (BK).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Fitur Lengkap ── */}
      <section id="fitur" className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Fitur Aplikasi</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Semua Kebutuhan Monitoring Dalam Satu Aplikasi.
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Tidak perlu menginstal banyak aplikasi terpisah. Semua modul bekerja secara terpadu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: ClipboardCheck,
                title: 'Absensi & Surat Izin',
                desc: 'Orang tua dapat mengajukan izin sakit/kegiatan lengkap dengan lampiran foto bukti secara online.'
              },
              {
                icon: BookOpen,
                title: 'Rekap Nilai Lengkap',
                desc: 'Input nilai tugas harian, UTS, hingga UAS dengan grafik rata-rata kelas yang mudah dipahami.'
              },
              {
                icon: Shield,
                title: 'Bimbingan Konseling (BK)',
                desc: 'Catat poin pelanggaran kedisiplinan dan koordinasikan pembinaan siswa secara bijak.'
              },
              {
                icon: Star,
                title: 'Dokumentasi Prestasi',
                desc: 'Arsipkan seluruh piagam, sertifikat, dan piala yang diraih siswa untuk portofolio mereka.'
              },
              {
                icon: MessageSquare,
                title: 'Pesan Wali Kelas & Guru',
                desc: 'Komunikasi formal terorganisir antara orang tua dan pihak sekolah tanpa tukar kontak pribadi.'
              },
              {
                icon: Calendar,
                title: 'Jadwal Janji Temu',
                desc: 'Atur waktu konsultasi tatap muka di sekolah antara wali murid dan wali kelas secara rapi.'
              },
            ].map((f, i) => (
              <div key={i} className="feature-card p-5 rounded-xl border shadow-xs flex flex-col gap-2.5">
                <div className="feature-icon-box w-8 h-8 rounded-lg border flex items-center justify-center">
                  <f.icon className="w-4 h-4" />
                </div>
                <h4 className="feature-title text-sm font-bold">{f.title}</h4>
                <p className="feature-desc text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section: Keamanan & Kepercayaan ── */}
      <section className="py-14 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="feature-card p-6 sm:p-8 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="feature-title text-lg font-bold">Standar Keamanan & Perlindungan Privasi</h3>
              <p className="feature-desc text-xs sm:text-sm max-w-xl">
                Data siswa, nilai, dan rekam pembinaan terlindungi dengan enkripsi SSL 256-bit dan hak akses ketat sesuai perannya masing-masing.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-slate-500" /> Enkripsi SSL
              </div>
              <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-slate-500" /> Hak Akses Khusus
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="EduMonitor Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-slate-700">EduMonitor</span>
            <span>· Sistem Informasi & Monitoring Siswa Sekolah</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
            <span>Bantuan: Hubungi Staf Tata Usaha Sekolah</span>
            <span>·</span>
            <span>© 2026 Hak Cipta Dilindungi</span>
            <span>·</span>
            <span>Dibuat oleh <strong className="font-semibold text-slate-700">Moch Razka Putra Setiana</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
