'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { ClipboardCheck, Plus, X, Search, CheckCircle, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

export default function AttendancePage() {
  const { currentUser, attendances, students, addAttendance, deleteAttendance, deleteAttendances, monitoredStudent, setMonitoredStudent } = useAppStore();
  
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<Array<{ id: string, name: string, class: string, status: 'hadir' | 'sakit' | 'izin' | 'alpha' }> | null>(null);
  
  // New Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  
  // State for image modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Bulanan: Year-Month string (e.g. "2024-05")
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  
  // Mingguan: Using a selected week start date
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
  };
  const [selectedWeek, setSelectedWeek] = useState<string>(getStartOfWeek(new Date()).toISOString().split('T')[0]);

  // Wali kelas hanya dapat melihat siswa kelasnya sendiri
  const availableStudents = useMemo(() => {
    if (currentUser?.role === 'teacher' && currentUser?.homeClass) {
      return students.filter(s => s.class === currentUser.homeClass);
    }
    return students;
  }, [students, currentUser]);

  const uniqueClasses = useMemo(() => Array.from(new Set(availableStudents.map(s => s.class))).sort(), [availableStudents]);

  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  useEffect(() => {
    if (!isAdminOrTeacher && activeTab === 'harian') {
      setActiveTab('mingguan');
    }
  }, [isAdminOrTeacher, activeTab]);

  const userAttendances = useMemo(() => {
    let filtered = attendances;
    
    if (currentUser?.role === 'parent' && currentUser.childName) {
      filtered = filtered.filter(a => a.studentName.toLowerCase().includes(currentUser.childName!.toLowerCase()));
    } else if (isAdminOrTeacher && monitoredStudent) {
      filtered = filtered.filter(a => a.studentName.toLowerCase() === monitoredStudent.name.toLowerCase());
    } else if (selectedClass) {
      filtered = filtered.filter(a => a.studentClass === selectedClass);
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendances, currentUser, selectedClass, monitoredStudent, isAdminOrTeacher]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      alert('Mohon unggah foto buku absensi terlebih dahulu.');
      return;
    }
    
    setIsScanning(true);
    try {
      // Simulate OCR / AI Scanning Delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate initial scan results for all students
      // Only scan students in the selected class
      const classStudents = availableStudents.filter(s => s.class === selectedClass);
      
      const initialData = classStudents.map((student, index) => {
        let randomStatus: 'hadir' | 'sakit' | 'izin' | 'alpha' = 'hadir';
        if (index === 2) randomStatus = 'alpha'; 
        if (index === 4) randomStatus = 'sakit';

        return {
          id: student.id,
          name: student.name,
          class: student.class,
          status: randomStatus
        };
      });

      setScannedData(initialData);
    } catch (error: any) {
      alert('Gagal memindai foto: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveScan = async () => {
    if (!scannedData || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      // Batch insert all reviewed data
      for (const item of scannedData) {
        await addAttendance({
          studentName: item.name,
          studentClass: item.class,
          date,
          status: item.status,
          notes: item.status !== 'hadir' ? 'Hasil scan buku absensi' : '',
          photo,
          recordedBy: currentUser.id
        });
      }
      
      setShowForm(false);
      setPhoto('');
      setScannedData(null);
      alert('Data absensi berhasil disimpan!');
    } catch (error: any) {
      alert(error.message || 'Gagal menyimpan absensi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateScannedStatus = (studentId: string, newStatus: 'hadir' | 'sakit' | 'izin' | 'alpha') => {
    if (!scannedData) return;
    setScannedData(scannedData.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
  };

  const markAllAs = (status: 'hadir' | 'sakit' | 'izin' | 'alpha') => {
    if (!scannedData) return;
    setScannedData(scannedData.map(s => ({ ...s, status })));
  };

  const filteredScannedData = useMemo(() => {
    if (!scannedData) return [];
    if (!reviewSearch) return scannedData;
    return scannedData.filter(s => s.name.toLowerCase().includes(reviewSearch.toLowerCase()));
  }, [scannedData, reviewSearch]);

  const handleSendRecap = async (type: 'mingguan' | 'bulanan') => {
    const label = type === 'mingguan' ? 'mingguan' : 'bulanan';
    if (!confirm(`Kirim rekap ${label} ke semua orang tua di kelas ${selectedClass}?`)) return;
    
    try {
      // Find all parents whose children are in the selected class
      const parents = useAppStore.getState().users.filter(u => u.role === 'parent');
      
      let sentCount = 0;
      for (const parent of parents) {
        if (!parent.childName) continue;
        
        // Verify if child is in selected class
        const child = students.find(s => s.name.toLowerCase() === parent.childName?.toLowerCase());
        if (child && child.class !== selectedClass) continue;
        
        const periodStr = type === 'mingguan' 
          ? `minggu yang dimulai dari ${new Date(selectedWeek).toLocaleDateString('id-ID')}`
          : `bulan ${new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;

        await useAppStore.getState().addNotification({
          title: `📊 Rekap Absensi ${type === 'mingguan' ? 'Mingguan' : 'Bulanan'}`,
          message: `Rekapitulasi kehadiran untuk ananda ${parent.childName} pada ${periodStr} telah tersedia. Silakan cek menu Absensi.`,
          date: new Date().toISOString(),
          read: false,
          type: 'general',
          targetUserId: parent.id,
        });
        sentCount++;
      }
      alert(`Rekap ${label} berhasil dikirim otomatis ke ${sentCount} orang tua!`);
    } catch (e: any) {
      alert(`Gagal mengirim rekap ${label}: ` + e.message);
    }
  };

  const downloadExcel = (type: 'mingguan' | 'bulanan') => {
    const headers = ['Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Total'];
    
    let filteredRecap = userAttendances;
    let title = 'Rekap_Absensi';

    if (type === 'mingguan') {
      const start = new Date(selectedWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      filteredRecap = filteredRecap.filter(a => {
        const d = new Date(a.date);
        return d >= start && d <= end;
      });
      title = `Rekap_Mingguan_${selectedClass}_${selectedWeek}`;
    } else {
      const [y, m] = selectedMonth.split('-');
      filteredRecap = filteredRecap.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === parseInt(y) && d.getMonth() + 1 === parseInt(m);
      });
      title = `Rekap_Bulanan_${selectedClass}_${selectedMonth}`;
    }
    
    const grouped = filteredRecap.reduce((acc, curr) => {
      if (!acc[curr.studentName]) {
        acc[curr.studentName] = { class: curr.studentClass, hadir: 0, sakit: 0, izin: 0, alpha: 0, total: 0 };
      }
      acc[curr.studentName][curr.status]++;
      acc[curr.studentName].total++;
      return acc;
    }, {} as Record<string, { class: string, hadir: number, sakit: number, izin: number, alpha: number, total: number }>);
    
    const rows = Object.entries(grouped).map(([name, counts]) => 
      [name, counts.class, counts.hadir, counts.sakit, counts.izin, counts.alpha, counts.total].join(',')
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = (s: string) => {
    switch(s) {
      case 'hadir': return { label: 'Hadir', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle };
      case 'sakit': return { label: 'Sakit', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertTriangle };
      case 'izin': return { label: 'Izin', color: 'bg-slate-200 text-slate-800 border-slate-300', icon: HelpCircle };
      case 'alpha': return { label: 'Alpha', color: 'bg-slate-900 text-white border-slate-800', icon: XCircle };
      default: return { label: 'Unknown', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: HelpCircle };
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-primary" />
            Kehadiran Siswa
          </h1>
          <p className="text-sm text-muted mt-1">Pantau rekapitulasi kehadiran harian dan mingguan.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdminOrTeacher && (
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none font-semibold text-foreground"
            >
              <option value="">-- Pilih Kelas --</option>
              {uniqueClasses.map(c => <option key={c} value={c}>Kelas {c}</option>)}
            </select>
          )}

          <div className="flex bg-surface-hover p-1 rounded-xl border border-border overflow-x-auto">
            {isAdminOrTeacher && (
              <button 
                onClick={() => setActiveTab('harian')} 
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex-shrink-0 ${activeTab === 'harian' ? 'bg-white shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                Harian
              </button>
            )}
            <button 
              onClick={() => setActiveTab('mingguan')} 
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex-shrink-0 ${activeTab === 'mingguan' ? 'bg-white shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              Rekap Mingguan
            </button>
            <button 
              onClick={() => setActiveTab('bulanan')} 
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex-shrink-0 ${activeTab === 'bulanan' ? 'bg-white shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              Rekap Bulanan
            </button>
          </div>
          
          {isAdminOrTeacher && (
            <button
              onClick={() => {
                if (!selectedClass) {
                  alert('Silakan pilih kelas terlebih dahulu sebelum scan absensi.');
                  return;
                }
                setScannedData(null);
                setPhoto('');
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Scan Buku Absen (AI)
            </button>
          )}
        </div>
      </div>

      {/* Mode Monitor Active Indicator */}
      {isAdminOrTeacher && monitoredStudent && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-indigo-50 border border-indigo-200 animate-fade-in mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
            {monitoredStudent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-indigo-900">
              Filter Monitor Aktif: <span className="text-indigo-600">{monitoredStudent.name}</span>
            </p>
            <p className="text-xs text-indigo-500">Menampilkan data absensi milik siswa ini saja.</p>
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

      {!selectedClass && isAdminOrTeacher && !monitoredStudent ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <ClipboardCheck className="w-16 h-16 opacity-20 mb-4" />
          <p className="text-lg font-semibold text-foreground">Pilih Kategori Kelas</p>
          <p className="text-sm mt-1 max-w-sm text-center">Silakan pilih kelas pada menu *dropdown* di atas untuk melihat data dan melakukan absensi, agar data kelas tidak tercampur.</p>
        </div>
      ) : (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {activeTab === 'harian' ? (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Bukti Absensi Fisik</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const dailyAttendances = userAttendances.filter(a => a.date === date);
                if (dailyAttendances.length === 0) {
                  return (
                    <div className="col-span-full p-8 text-center text-muted bg-surface-hover rounded-xl border border-border">
                      Belum ada foto absensi fisik untuk tanggal ini.
                    </div>
                  );
                }
                
                // Group by photo to show unique physical attendances
                const uniquePhotos = new Map();
                dailyAttendances.forEach(a => {
                  if (a.photo && !uniquePhotos.has(a.photo)) {
                    uniquePhotos.set(a.photo, { class: a.studentClass, photo: a.photo, id: a.id });
                  }
                });
                
                const photos = Array.from(uniquePhotos.values());
                
                if (photos.length === 0) {
                   return (
                    <div className="col-span-full p-8 text-center text-muted bg-surface-hover rounded-xl border border-border">
                      Tidak ada gambar absensi fisik yang tersimpan pada tanggal ini.
                    </div>
                  );
                }

                return photos.map(p => (
                  <div key={p.id} className="border border-border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col group">
                    <div className="p-3 bg-surface-hover border-b border-border flex justify-between items-center">
                      <span className="font-semibold text-sm">Kelas {p.class}</span>
                      <span className="text-xs text-muted font-medium">{new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div 
                      className="relative aspect-video bg-gray-100 overflow-hidden cursor-pointer"
                      onClick={() => setSelectedImage(p.photo)}
                    >
                      <img src={p.photo} alt={`Absensi Kelas ${p.class}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-black text-xs font-bold px-4 py-2 rounded-lg shadow-lg transition-opacity flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          Lihat Penuh
                        </span>
                      </div>
                    </div>
                    {isAdminOrTeacher && (
                      <div className="p-3">
                         <button
                            onClick={async () => {
                              if(confirm('Hapus rekam absensi untuk kelas ini?')) {
                                setIsDeleting(p.class);
                                try {
                                  // Hapus semua absensi kelas ini pada tanggal ini sekaligus
                                  const toDelete = userAttendances.filter(a => a.date === date && a.studentClass === p.class);
                                  const idsToDelete = toDelete.map(a => a.id);
                                  
                                  await deleteAttendances(idsToDelete);
                                } catch(e: any) {
                                  alert(e.message);
                                } finally {
                                  setIsDeleting(null);
                                }
                              }
                            }}
                            disabled={isDeleting === p.class}
                            className="w-full text-red-500 hover:text-red-600 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isDeleting === p.class ? (
                              <>
                                <div className="w-3 h-3 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                                Menghapus...
                              </>
                            ) : 'Hapus Data Kelas'}
                          </button>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : activeTab === 'mingguan' ? (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold">Rekapitulasi Mingguan</h3>
                <p className="text-sm text-muted">Mulai dari: {new Date(selectedWeek).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <input 
                type="date"
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                className="px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            
            {(() => {
              const startMingguan = new Date(selectedWeek);
              const endMingguan = new Date(startMingguan);
              endMingguan.setDate(endMingguan.getDate() + 6);
              const recentAttendances = userAttendances.filter(a => {
                const d = new Date(a.date);
                return d >= startMingguan && d <= endMingguan;
              });
              const distinctDatesMinggu = new Set(recentAttendances.map(a => a.date)).size;
              const isLengkapMingguan = isAdminOrTeacher || distinctDatesMinggu >= 5;

              return (
                <>
                  <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center ${isLengkapMingguan ? 'bg-surface-hover border-border' : 'bg-red-50/50 border-red-100'}`}>
                    {isLengkapMingguan ? (
                      <>
                        <ClipboardCheck className="w-16 h-16 text-primary/40 mb-4" />
                        <h4 className="text-lg font-bold text-foreground mb-2">Rekapitulasi Siap Diunduh</h4>
                        <p className="text-sm text-muted max-w-md">
                          Sistem telah merekap semua data absensi harian. Anda dapat mengunduhnya dalam format Excel.
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
                        <h4 className="text-lg font-bold text-red-600 mb-2">Rekap Belum Sempurna</h4>
                        <p className="text-sm text-red-500/80 max-w-md">
                          Data absensi minggu ini belum lengkap dikumpulkan oleh guru (baru {distinctDatesMinggu} hari terisi). Silakan tunggu hingga rekap penuh untuk mengunduh Excel.
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                      onClick={() => downloadExcel('mingguan')}
                      disabled={!isLengkapMingguan}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unduh Rekap Mingguan (Excel/CSV)
                    </button>
                    {isAdminOrTeacher && (
                      <button 
                        onClick={() => handleSendRecap('mingguan')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Kirim Laporan Mingguan ke Orang Tua
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold">Rekapitulasi Bulanan</h3>
                <p className="text-sm text-muted">
                  Bulan: {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <input 
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 bg-surface-hover border border-border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            
            {(() => {
              const [yBulan, mBulan] = selectedMonth.split('-');
              const monthlyAttendances = userAttendances.filter(a => {
                const d = new Date(a.date);
                return d.getFullYear() === parseInt(yBulan) && d.getMonth() + 1 === parseInt(mBulan);
              });
              const distinctDatesBulan = new Set(monthlyAttendances.map(a => a.date)).size;
              const isLengkapBulanan = isAdminOrTeacher || distinctDatesBulan >= 20;

              return (
                <>
                  <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center ${isLengkapBulanan ? 'bg-surface-hover border-border' : 'bg-red-50/50 border-red-100'}`}>
                    {isLengkapBulanan ? (
                      <>
                        <ClipboardCheck className="w-16 h-16 text-primary/40 mb-4" />
                        <h4 className="text-lg font-bold text-foreground mb-2">Rekapitulasi Bulanan Siap</h4>
                        <p className="text-sm text-muted max-w-md">
                          Sistem telah merekap data absensi selama bulan ini. Unduh laporan dalam format Excel untuk keperluan arsip atau pemantauan.
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
                        <h4 className="text-lg font-bold text-red-600 mb-2">Rekap Belum Sempurna</h4>
                        <p className="text-sm text-red-500/80 max-w-md">
                          Data absensi bulan ini belum lengkap dikumpulkan oleh guru (baru {distinctDatesBulan} hari terisi dari minimal 20 hari). Silakan tunggu rekap penuh untuk mengunduh Excel.
                        </p>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                      onClick={() => downloadExcel('bulanan')}
                      disabled={!isLengkapBulanan}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unduh Rekap Bulanan (Excel/CSV)
                    </button>
                    {isAdminOrTeacher && (
                      <button 
                        onClick={() => handleSendRecap('bulanan')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Kirim Laporan Bulanan ke Orang Tua
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
      )}

      {showForm && isAdminOrTeacher && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold">Scan Buku Absensi Fisik (AI OCR)</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-surface-hover rounded-xl text-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {!scannedData ? (
              <form onSubmit={handleScan} className="p-5 space-y-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-sm text-primary font-medium mb-4">
                  Sistem akan membaca (OCR) foto buku absensi kelas Anda dan otomatis mencentang kehadiran siswa.
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Tanggal</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Foto Buku Absensi (Wajib)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      onChange={handlePhotoChange} 
                      accept="image/*" 
                      required
                      className="w-full px-4 py-2 bg-surface border border-border rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
                    />
                    {photo && (
                      <div className="mt-3">
                        <p className="text-xs text-green-600 font-medium mb-2">✓ Foto berhasil dilampirkan, siap di-scan.</p>
                        <img src={photo} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-border" />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isScanning || !photo}
                  className="w-full py-3 mt-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Mengekstrak teks...
                    </>
                  ) : 'Mulai Analisis Foto'}
                </button>
              </form>
            ) : (
              <div className="p-5 flex flex-col h-[85vh] sm:h-[75vh]">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-700 font-medium mb-3 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 inline-block mr-1.5 mb-0.5" />
                  Analisis berhasil! Terdapat {scannedData.length} siswa.
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-3 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                      type="text"
                      placeholder="Cari siswa untuk dikoreksi..."
                      value={reviewSearch}
                      onChange={e => setReviewSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-surface-hover border border-border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={() => markAllAs('hadir')}
                    className="px-3 py-2 bg-surface-hover text-xs font-semibold rounded-lg hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
                  >
                    Tandai Semua Hadir
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4 custom-scrollbar">
                  {filteredScannedData.length === 0 && (
                    <div className="text-center py-8 text-muted text-sm">Siswa tidak ditemukan.</div>
                  )}
                  {filteredScannedData.map(student => (
                    <div key={student.id} className="p-2.5 border border-border rounded-lg bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-primary/30 transition-colors">
                      <div className="font-semibold text-sm truncate" title={student.name}>
                        {student.name} <span className="text-xs text-muted font-normal ml-1">({student.class})</span>
                      </div>
                      <div className="flex bg-surface-hover p-1 rounded-md">
                        {(['hadir', 'sakit', 'izin', 'alpha'] as const).map(s => {
                          const sc = getStatusConfig(s);
                          return (
                            <button
                              key={s}
                              onClick={() => updateScannedStatus(student.id, s)}
                              className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all flex-1 sm:flex-none text-center ${
                                student.status === s 
                                ? `${sc.color} shadow-sm ring-1 ring-black/5` 
                                : 'text-muted hover:text-foreground'
                              }`}
                            >
                              {sc.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-border">
                  <button 
                    onClick={() => {
                      setScannedData(null);
                      setReviewSearch('');
                    }}
                    className="flex-1 py-2.5 bg-surface-hover text-foreground rounded-xl text-sm font-bold hover:bg-border transition-all"
                  >
                    Ulangi Scan
                  </button>
                  <button 
                    onClick={handleSaveScan}
                    disabled={isSubmitting}
                    className="flex-[2] py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all flex items-center justify-center"
                  >
                    {isSubmitting ? 'Menyimpan...' : `Simpan ${scannedData.length} Absensi`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Modal for Full View */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={selectedImage} 
            alt="Absensi Penuh" 
            className="w-full h-full object-contain max-h-[90vh] rounded-lg animate-in zoom-in-95 duration-200" 
          />
        </div>
      )}
    </>
  );
}
