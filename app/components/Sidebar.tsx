'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/app/lib/store';
import {
  Home, AlertTriangle, Bell, MessageCircle, Calendar,
  Trophy, LogOut, Menu, X, Shield, Users, GraduationCap,
  FileText, LineChart, ClipboardCheck, ScanSearch, ChevronRight,
  KeyRound, Eye, EyeOff, CheckCircle, UserSquare2,
} from 'lucide-react';
import ProfileModal from '@/app/components/ProfileModal';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logout, sidebarOpen, setSidebarOpen, getUnreadNotificationCount } = useAppStore();
  
  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  // Profile Modal state (unifies Edit Profile & Password Reset)
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Reset window/viewport scroll position to the top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    
    // Restore sidebar internal scroll position to both desktop and mobile layouts
    const savedScroll = sessionStorage.getItem('sidebar-scroll-position');
    if (savedScroll) {
      const scrollVal = parseInt(savedScroll, 10);
      if (desktopNavRef.current) {
        desktopNavRef.current.scrollTop = scrollVal;
      }
      if (mobileNavRef.current) {
        mobileNavRef.current.scrollTop = scrollVal;
      }
    }
  }, [pathname]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    if (target) {
      sessionStorage.setItem('sidebar-scroll-position', target.scrollTop.toString());
    }
  };

  if (!currentUser) return null;

  const unreadCount = getUnreadNotificationCount();

  const getNavItems = () => {
    const base: any[] = [
      { href: '/dashboard', label: 'Beranda', icon: Home },
    ];
    if (currentUser.role !== 'parent') {
      base.push({ href: '/dashboard/violations', label: 'Pelanggaran', icon: AlertTriangle });
    }
    base.push({ href: '/dashboard/notifications', label: 'Notifikasi', icon: Bell, badge: unreadCount });
    base.push({ href: '/dashboard/chat', label: 'Pesan', icon: MessageCircle });
    base.push({ href: '/dashboard/appointments', label: 'Janji Temu', icon: Calendar });
    base.push({ href: '/dashboard/permits', label: 'Izin', icon: FileText });
    base.push({ href: '/dashboard/attendance', label: 'Absensi', icon: ClipboardCheck });
    if (currentUser.role !== 'parent') {
      base.push({ href: '/dashboard/exam-checker', label: 'Pemeriksa Ujian', icon: ScanSearch });
    }
    base.push({ href: '/dashboard/grades', label: 'Nilai Akademik', icon: LineChart });
    base.push({ href: '/dashboard/achievements', label: 'Prestasi', icon: Trophy });
    if (currentUser.role === 'admin') {
      base.push({ href: '/dashboard/users', label: 'Kelola User & Siswa', icon: Users });
    }
    return base;
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case 'admin': return 'Administrator';
      case 'teacher': return 'Guru';
      case 'bk': return 'Guru BK';
      default: return 'Orang Tua';
    }
  };

  const getRoleBadgeColor = () => {
    return 'bg-white/10 text-slate-300 border-white/10';
  };

  const initials = currentUser.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  const renderSidebarContent = (ref: React.RefObject<HTMLElement | null>) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="EduMonitor Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">EduMonitor</h1>
            <p className="text-[10px] text-slate-400 font-medium">Sistem Monitoring Siswa</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="w-full text-left rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 p-3 flex items-center gap-3 transition-all group"
          title="Klik untuk Edit Profil & Akun"
        >
          <div className="relative flex-shrink-0">
            {/* Black background for initials or photo avatar */}
            <div className="w-9 h-9 rounded-lg bg-black border border-slate-800 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-slate-100">{currentUser.name}</p>
            <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-semibold border ${getRoleBadgeColor()}`}>
              {getRoleLabel()}
            </span>
          </div>
        </button>

        {currentUser.role === 'parent' && currentUser.childName && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-2.5 h-2.5 text-slate-300" />
            </div>
            <div className="text-[11px] text-slate-400 min-w-0">
              <span>Anak: </span>
              <span className="font-semibold text-slate-200">{currentUser.childName}</span>
              <span className="text-slate-500"> · {currentUser.childClass}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav ref={ref} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 pb-4 lg:pb-2">
        {/* Section label */}
        <p className="section-label text-slate-500 px-3 mb-1">Menu Utama</p>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-nav-item group ${isActive ? 'active bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.04] text-slate-400 group-hover:text-slate-200'
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-[13px]">{item.label}</span>
              {item.badge ? (
                <span className="bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 transition-all duration-200 ${isActive ? 'text-white opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.06] pb-24 lg:pb-3">
        <button
          onClick={() => setShowProfileModal(true)}
          className="sidebar-nav-item w-full hover:bg-white/[0.08] hover:text-white group mb-1"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] flex items-center justify-center transition-all text-slate-400 group-hover:text-white">
            <UserSquare2 className="w-4 h-4" />
          </div>
          <span className="text-[13px]">Edit Profil & Akun</span>
        </button>
        <button
          onClick={async () => {
            try {
              await logout();
            } catch (err) {
              console.error('Logout error:', err);
            }
            window.location.href = '/';
          }}
          className="sidebar-nav-item w-full hover:bg-red-500/10 hover:text-red-400 group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] group-hover:bg-red-500/10 flex items-center justify-center transition-all">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
          </div>
          <span className="text-[13px]">Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Edit Profile & Password Modal (Integrated) ── */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed top-0 left-0 z-40 h-full w-[260px] bg-gradient-to-b from-[#0f172a] via-[#111827] to-[#030712] hidden lg:flex flex-col border-r border-white/[0.06] shadow-2xl">
        {renderSidebarContent(desktopNavRef)}
      </aside>

      {/* Mobile Slide-out */}
      <div className={`fixed top-0 left-0 z-[70] h-full w-[280px] bg-gradient-to-b from-[#0f172a] via-[#111827] to-[#030712] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
        {renderSidebarContent(mobileNavRef)}
      </div>

      {/* Mobile Bottom Nav (Floating Glass Dock) */}
      <nav className={`fixed bottom-4 left-4 right-4 z-40 lg:hidden transition-all duration-200 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-around px-2 py-2.5 bg-[#111827]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="group relative flex flex-col items-center justify-center w-14 h-12">
                {/* Active Glow Background */}
                <div className={`absolute inset-0 rounded-xl transition-all duration-300 ease-out ${isActive ? 'bg-primary/20 scale-100 opacity-100' : 'bg-transparent scale-50 opacity-0 group-hover:bg-white/5 group-hover:scale-100 group-hover:opacity-100'}`} />
                
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <item.icon className={`transition-all duration-300 ease-out ${isActive ? 'w-5 h-5 text-primary -translate-y-1 drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'w-5 h-5 text-slate-400 group-hover:text-slate-200'}`} />
                  
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#111827] shadow-sm">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  ) : null}
                  
                  {/* Label (only visible when active) */}
                  <span className={`absolute bottom-0 text-[9px] font-semibold tracking-wide transition-all duration-300 ease-out ${isActive ? 'text-primary opacity-100 translate-y-0' : 'text-slate-400 opacity-0 translate-y-2'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
          
          {/* Menu Button */}
          <button onClick={() => setSidebarOpen(true)} className="group relative flex flex-col items-center justify-center w-14 h-12">
            <div className="absolute inset-0 rounded-xl transition-all duration-300 ease-out bg-transparent group-hover:bg-white/5" />
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <Menu className="w-5 h-5 text-slate-400 transition-all duration-300 ease-out group-hover:text-slate-200 group-hover:scale-110" />
              <span className="absolute bottom-0 text-[9px] font-semibold tracking-wide text-slate-400 opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
                Menu
              </span>
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}
