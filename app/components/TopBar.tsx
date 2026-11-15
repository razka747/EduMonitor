'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { Bell, Menu, Sparkles, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProfileModal from '@/app/components/ProfileModal';
import { isDemoUser, getDemoUsage, DEMO_MAX_RESPONSES_PER_FEATURE } from '@/app/lib/demoLimit';
import { useTheme } from '@/app/lib/theme';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Beranda',
  '/dashboard/violations': 'Pelanggaran',
  '/dashboard/notifications': 'Notifikasi',
  '/dashboard/chat': 'Pesan',
  '/dashboard/appointments': 'Janji Temu',
  '/dashboard/permits': 'Izin',
  '/dashboard/attendance': 'Absensi',
  '/dashboard/exam-checker': 'Pemeriksa Ujian',
  '/dashboard/grades': 'Nilai Akademik',
  '/dashboard/achievements': 'Prestasi',
  '/dashboard/users': 'Kelola User',
};

const PATH_TO_FEATURE: Record<string, { key: string; label: string }> = {
  '/dashboard/attendance': { key: 'attendance', label: 'Presensi' },
  '/dashboard/violations': { key: 'violations', label: 'Pelanggaran' },
  '/dashboard/achievements': { key: 'achievements', label: 'Prestasi' },
  '/dashboard/appointments': { key: 'appointments', label: 'Janji Temu' },
  '/dashboard/permits': { key: 'permits', label: 'Izin Siswa' },
  '/dashboard/grades': { key: 'grades', label: 'Nilai' },
  '/dashboard/exam-checker': { key: 'exam_checker', label: 'Pemeriksa Ujian' },
  '/dashboard/chat': { key: 'chat', label: 'Pesan' },
};

export default function TopBar() {
  const { currentUser, setSidebarOpen, getUnreadNotificationCount } = useAppStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const pathname = usePathname();

  const currentFeature = PATH_TO_FEATURE[pathname] || { key: 'general', label: 'Fitur' };
  const [demoUsage, setDemoUsage] = useState({ count: 0, remaining: DEMO_MAX_RESPONSES_PER_FEATURE, max: DEMO_MAX_RESPONSES_PER_FEATURE, allowed: true });

  useEffect(() => {
    if (!currentUser || !isDemoUser(currentUser)) return;
    const identifier = currentUser.email || currentUser.id;
    setDemoUsage(getDemoUsage(identifier, currentFeature.key));

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.featureKey === currentFeature.key) {
        setDemoUsage(getDemoUsage(identifier, currentFeature.key));
      }
    };

    window.addEventListener('demo_usage_updated', handleUpdate);
    return () => window.removeEventListener('demo_usage_updated', handleUpdate);
  }, [currentUser, currentFeature.key]);

  if (!currentUser) return null;

  const unreadCount = getUnreadNotificationCount();
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const initials = currentUser.name.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16 gap-4">

          {/* Left: hamburger (mobile) + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate leading-tight">{pageTitle}</h2>
              <p className="text-xs text-slate-400 hidden lg:block capitalize">{today}</p>
            </div>
          </div>

          {/* Right: actions (Pojok Kanan Atas) */}
          <div className="flex items-center gap-2.5 flex-shrink-0">

            {/* Pengumuman Kuota Demo 5x (Pojok Kanan Atas) */}
            {isDemoUser(currentUser) && (
              <div 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all shadow-xs ${
                  demoUsage.remaining <= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
                title={`Akun Demo Guru: Tersisa ${demoUsage.remaining}/${demoUsage.max} respon hari ini untuk fitur ${currentFeature.label}`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="hidden sm:inline font-bold text-slate-900">Demo</span>
                  <span className="text-[11px] text-slate-500 hidden md:inline">({currentFeature.label}):</span>
                  <span className={`font-bold ${demoUsage.remaining <= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                    {demoUsage.remaining}/{demoUsage.max}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: demoUsage.max }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i < demoUsage.remaining
                          ? demoUsage.remaining <= 0
                            ? 'bg-rose-500'
                            : 'bg-blue-600'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notification */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
              data-tooltip="Notifikasi"
            >
              <Bell className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-slate-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Dark/White Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center group"
              title={isDark ? 'Beralih ke Mode Terang (White)' : 'Beralih ke Mode Gelap (Dark)'}
              aria-label="Ganti Tema"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            {/* User avatar with click to edit profile */}
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 pl-1 text-left rounded-xl hover:bg-slate-50 p-1.5 transition-all group"
              title="Klik untuk Edit Profil & Akun"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-slate-950">{currentUser.name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400">
                  {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'teacher' ? 'Guru' : currentUser.role === 'bk' ? 'Guru BK' : 'Orang Tua'}
                </p>
              </div>

              {/* Black background for initials or photo avatar */}
              <div className="w-9 h-9 rounded-xl bg-black border border-slate-800 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-all duration-200 overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Edit Profile & Password Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}
