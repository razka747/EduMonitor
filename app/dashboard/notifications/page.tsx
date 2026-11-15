'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { Bell, CheckCheck, AlertTriangle, Calendar, Trophy, Info, X, CheckCircle, ChevronDown, ChevronUp, Eye, User, BookOpen, FileText, Camera, Trash2 } from 'lucide-react';

interface ViolationDetail {
  id: string;
  studentName: string;
  studentClass: string;
  violationType: string;
  description: string;
  severity: string;
  photo?: string;
  date: string;
  reportedBy: string;
  status: string;
}

export default function NotificationsPage() {
  const { currentUser, notifications, violations, users, markNotificationRead, markAllNotificationsRead, validateViolation, deleteViolation, deleteNotification, deleteAllNotifications, syncFromSupabase } = useAppStore();
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null);
  const [fetchedViolations, setFetchedViolations] = useState<Record<string, ViolationDetail>>({});
  const [prefetchDone, setPrefetchDone] = useState(false);

  // Sync data & pre-fetch semua violation detail saat halaman dibuka
  useEffect(() => {
    const init = async () => {
      await syncFromSupabase();

      // Pre-fetch semua violation yang terkait notifikasi
      if (isSupabaseConfigured()) {
        const allNotifs = useAppStore.getState().notifications;
        const currentUsr = useAppStore.getState().currentUser;
        if (!currentUsr) return;
        
        const violationIds = allNotifs
          .filter(n => n.targetUserId === currentUsr.id && n.type === 'violation' && n.relatedId)
          .map(n => n.relatedId!)
          .filter((id, i, arr) => arr.indexOf(id) === i); // unique

        if (violationIds.length > 0) {
          const { data } = await supabase
            .from('violations')
            .select('*')
            .in('id', violationIds);

          if (data) {
            const mapped: Record<string, ViolationDetail> = {};
            data.forEach(d => {
              mapped[d.id] = {
                id: d.id,
                studentName: d.student_name,
                studentClass: d.student_class,
                violationType: d.violation_type,
                description: d.description,
                severity: d.severity,
                photo: d.photo_url,
                date: d.date,
                reportedBy: d.reported_by,
                status: d.status,
              };
            });
            setFetchedViolations(mapped);

            // Tandai ID yang tidak ditemukan (sudah dihapus) - untuk keperluan log
            const foundIds = new Set(data.map(d => d.id));
            const notFound = violationIds.filter(id => !foundIds.has(id));
            if (notFound.length > 0) {
              console.warn('Beberapa pelanggaran tidak ditemukan (mungkin sudah dihapus):', notFound);
            }
          }
        }
      }
      setPrefetchDone(true);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) return null;

  const userNotifications = notifications
    .filter(n => n.targetUserId === currentUser.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'violation': return <AlertTriangle className="w-5 h-5 text-danger" />;
      case 'appointment': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'achievement': return <Trophy className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-surface';
    switch (type) {
      case 'violation': return 'bg-slate-50 border-slate-200';
      case 'appointment': return 'bg-blue-50/50 border-blue-100';
      case 'achievement': return 'bg-slate-50 border-slate-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'berat': return { label: 'Berat', color: 'bg-slate-900 text-white', dot: 'bg-slate-900' };
      case 'sedang': return { label: 'Sedang', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-600' };
      default: return { label: 'Ringan', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
    }
  };

  // Cari violation dari store ATAU dari cache fetch
  const findViolation = (relatedId: string | undefined): ViolationDetail | null => {
    if (!relatedId) return null;
    const fromStore = violations.find(v => v.id === relatedId);
    if (fromStore) return fromStore;
    return fetchedViolations[relatedId] || null;
  };

  const toggleExpand = (notifId: string) => {
    setExpandedNotif(prev => prev === notifId ? null : notifId);
  };

  const handleValidate = async (violationId: string, status: 'validated' | 'rejected', notifId: string) => {
    await validateViolation(violationId, status);
    markNotificationRead(notifId);
    // Update local cache
    setFetchedViolations(prev => {
      if (prev[violationId]) {
        return { ...prev, [violationId]: { ...prev[violationId], status } };
      }
      return prev;
    });
    setExpandedNotif(null);
    // Re-sync
    await syncFromSupabase();
  };

  const handleDelete = async (violationId: string, notifId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pelanggaran ini? Tindakan ini tidak dapat dibatalkan.')) return;
    await deleteViolation(violationId);
    markNotificationRead(notifId);
    // Hapus dari local cache juga
    setFetchedViolations(prev => {
      const copy = { ...prev };
      delete copy[violationId];
      return copy;
    });
    setExpandedNotif(null);
    await syncFromSupabase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifikasi
          </h1>
          <p className="text-sm text-muted mt-1">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-surface-hover text-sm font-medium text-foreground transition-all shadow-sm active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              Tandai Semua Dibaca
            </button>
          )}
          {userNotifications.length > 0 && (
            <button
              onClick={async () => {
                if (confirm('Hapus semua notifikasi?')) {
                  await deleteAllNotifications();
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-sm font-medium transition-all shadow-sm active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {userNotifications.map((notif, i) => {
          const isViolation = notif.type === 'violation' && notif.relatedId;
          const violation = isViolation ? findViolation(notif.relatedId) : null;
          const isExpanded = expandedNotif === notif.id;
          const canApprove = (currentUser.role === 'admin' || currentUser.role === 'bk');
          const reportedByUser = violation ? users.find(u => u.id === violation.reportedBy) : null;
          const sevConfig = violation ? getSeverityConfig(violation.severity) : null;

          return (
            <div
              key={notif.id}
              className={`rounded-2xl border transition-all duration-300 animate-slide-up overflow-hidden ${
                getBgColor(notif.type, notif.read)
              } ${!notif.read ? 'border-l-4' : 'border-border hover:border-slate-300'}`}
              style={{ animationDelay: `${i * 50}ms`, borderLeftColor: !notif.read ? (notif.type === 'violation' ? '#0f172a' : notif.type === 'appointment' ? '#2563eb' : notif.type === 'achievement' ? '#3b82f6' : '#2563eb') : undefined }}
            >
              {/* Main notification row */}
              <div
                className="p-4 lg:p-5 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => {
                  if (!notif.read) markNotificationRead(notif.id);
                  if (isViolation) toggleExpand(notif.id);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notif.type === 'violation' ? 'bg-slate-100 text-slate-800' : notif.type === 'appointment' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold ${!notif.read ? 'text-foreground' : 'text-muted'}`}>
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 pulse-dot" />
                        )}
                        {isViolation && (
                          <span className="text-muted">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 rounded-full hover:bg-danger/10 text-muted hover:text-danger transition-colors ml-1"
                          title="Hapus Notifikasi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm mt-1 ${!notif.read ? 'text-foreground/80' : 'text-muted'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <p className="text-xs text-muted">{timeAgo(notif.date)}</p>
                      {isViolation && (
                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {isExpanded ? 'Tutup Detail' : 'Klik untuk Lihat Detail'}
                        </span>
                      )}
                      {/* Status badge */}
                      {violation && violation.status !== 'pending_bk' && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          violation.status === 'validated' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {violation.status === 'validated' ? '✅ Divalidasi' : '❌ Ditolak'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded: Tabel detail pelanggaran */}
              {isExpanded && (
                <div className="border-t border-border px-4 lg:px-5 pb-4 lg:pb-5 pt-4 animate-fade-in">
                  {violation ? (
                    <div className="bg-background rounded-xl overflow-hidden border border-border">
                      <div className="p-4 bg-slate-50 border-b border-border">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Detail Laporan Pelanggaran
                        </h4>
                      </div>

                      {/* Tabel detail */}
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted font-medium w-1/3 flex items-center gap-2">
                              <User className="w-4 h-4" /> Nama Siswa
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{violation.studentName}</td>
                          </tr>
                          <tr className="border-b border-border bg-surface/50">
                            <td className="px-4 py-3 text-muted font-medium flex items-center gap-2">
                              <BookOpen className="w-4 h-4" /> Kelas
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{violation.studentClass}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted font-medium flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> Jenis Pelanggaran
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{violation.violationType}</td>
                          </tr>
                          <tr className="border-b border-border bg-surface/50">
                            <td className="px-4 py-3 text-muted font-medium">⚡ Tingkat</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${sevConfig?.color}`}>
                                {sevConfig?.label}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted font-medium">📝 Keterangan</td>
                            <td className="px-4 py-3 text-foreground">{violation.description}</td>
                          </tr>
                          <tr className="border-b border-border bg-surface/50">
                            <td className="px-4 py-3 text-muted font-medium">📅 Tanggal</td>
                            <td className="px-4 py-3 text-foreground">
                              {new Date(violation.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted font-medium">👤 Pelapor</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{reportedByUser?.name || 'Guru'}</td>
                          </tr>
                          <tr className={violation.photo ? 'border-b border-border bg-surface/50' : 'bg-surface/50'}>
                            <td className="px-4 py-3 text-muted font-medium">📊 Status</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                violation.status === 'pending_bk' ? 'bg-slate-100 text-slate-700' :
                                violation.status === 'validated' ? 'bg-blue-50 text-blue-700' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {violation.status === 'pending_bk' ? '⏳ Menunggu Persetujuan' : violation.status === 'validated' ? '✅ Divalidasi' : '❌ Ditolak'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Photo */}
                      {violation.photo && (
                        <div className="p-4 border-t border-border">
                          <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" /> Foto Bukti
                          </p>
                          <img src={violation.photo} alt="Bukti" className="w-full max-w-sm h-48 object-cover rounded-xl border border-border" />
                        </div>
                      )}

                      {/* Tombol ACC / Tolak */}
                      {canApprove && violation.status === 'pending_bk' && (
                        <div className="p-4 border-t border-border bg-slate-50 flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleValidate(violation.id, 'validated', notif.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <CheckCircle className="w-5 h-5" />
                            ACC / Validasi
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleValidate(violation.id, 'rejected', notif.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-300 transition-colors shadow-sm"
                          >
                            <X className="w-5 h-5" />
                            Tolak
                          </button>
                        </div>
                      )}

                      {/* Tombol Hapus - untuk Admin, BK, atau pelapor */}
                      {(canApprove || currentUser.id === violation.reportedBy) && (
                        <div className="p-4 border-t border-border bg-slate-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(violation.id, notif.id);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Hapus Laporan Pelanggaran
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted">
                      {!prefetchDone ? (
                        <>
                          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-sm">Memuat detail pelanggaran...</p>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted opacity-40" />
                          <p className="text-sm font-semibold text-foreground">Data pelanggaran tidak ditemukan</p>
                          <p className="text-xs text-muted mt-1">Laporan ini mungkin sudah dihapus.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {userNotifications.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-surface border border-border">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
            <p className="text-lg font-semibold text-foreground mb-1">Belum ada notifikasi</p>
            <p className="text-sm text-muted">Notifikasi akan muncul saat ada pelanggaran, prestasi, atau janji temu</p>
          </div>
        )}
      </div>
    </div>
  );
}
