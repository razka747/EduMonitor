'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/app/lib/store';
import { FileText, Plus, X, Search, Paperclip, CheckCircle, XCircle, Clock, Trash2, MessageCircle, Eye } from 'lucide-react';
import { SCHOOL_CLASSES } from '@/app/lib/constants';
import type { Permit } from '@/app/lib/types';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';

export default function PermitsPage() {
  const { currentUser, permits, addPermit, updatePermitStatus, deletePermit, users, students, syncFromSupabase, monitoredStudent, setMonitoredStudent } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'izin' | 'sakit' | 'kegiatan'>('all');
  const [viewPermit, setViewPermit] = useState<Permit | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentList, setShowStudentList] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [permitType, setPermitType] = useState<'izin' | 'sakit' | 'kegiatan'>('izin');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>();
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [parentResponse, setParentResponse] = useState('');
  const [showResponseFor, setShowResponseFor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wali kelas hanya dapat melihat siswa kelasnya sendiri
  const availableStudents = (currentUser?.role === 'teacher' && currentUser?.homeClass)
    ? students.filter(s => s.class === currentUser.homeClass)
    : students;

  const filteredStudentsForForm = availableStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    syncFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const isParent = currentUser.role === 'parent';

  // Filter permits sesuai role
  let filtered = permits;
  if (isAdmin && monitoredStudent) {
    const mn = monitoredStudent.name.trim().toLowerCase();
    filtered = permits.filter(p => p.studentName.trim().toLowerCase() === mn);
  } else if (isParent && currentUser.childName) {
    const childLower = currentUser.childName.trim().toLowerCase();
    filtered = permits.filter(p => {
      const pName = p.studentName.trim().toLowerCase();
      return pName.includes(childLower) || childLower.includes(pName);
    });
  }
  if (filterType !== 'all') filtered = filtered.filter(p => p.type === filterType);
  if (search) filtered = filtered.filter(p =>
    p.studentName.toLowerCase().includes(search.toLowerCase()) ||
    p.reason.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment(ev.target?.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!studentName) { setErrorMsg('Pilih nama siswa terlebih dahulu.'); return; }
    if (!startDate || !endDate) { setErrorMsg('Isi tanggal mulai dan selesai.'); return; }

    // Cari parentId
    const parentUser = users.find(u =>
      u.role === 'parent' &&
      u.childName?.trim().toLowerCase() === studentName.trim().toLowerCase()
    );

    setIsSubmitting(true);
    try {
      await addPermit({
        studentName,
        studentClass,
        type: permitType,
        reason,
        date: new Date().toISOString().split('T')[0],
        startDate,
        endDate,
        attachment,
        attachmentName,
        status: 'pending',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        parentId: isParent ? currentUser.id : parentUser?.id,
      });
      setStudentName(''); setStudentClass(''); setStudentSearch('');
      setReason(''); setStartDate(''); setEndDate('');
      setAttachment(undefined); setAttachmentName(undefined);
      setPermitType('izin'); setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (permit: Permit) => {
    await updatePermitStatus(permit.id, 'approved');
  };

  const handleReject = async (permit: Permit) => {
    await updatePermitStatus(permit.id, 'rejected');
  };

  const handleParentResponse = async (permitId: string) => {
    await updatePermitStatus(permitId, 'approved', parentResponse);
    setShowResponseFor(null);
    setParentResponse('');
  };

  const getStatusBadge = (status: Permit['status']) => {
    if (status === 'approved') return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle className="w-3 h-3" />Disetujui</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"><XCircle className="w-3 h-3" />Ditolak</span>;
    return <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200"><Clock className="w-3 h-3" />Menunggu</span>;
  };

  const typeConfig = {
    izin: { emoji: '📋', label: 'Izin', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    sakit: { emoji: '🤒', label: 'Sakit', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    kegiatan: { emoji: '🏅', label: 'Kegiatan', bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-slate-900" />
              {isParent ? `Izin ${currentUser.childName}` : 'Kelola Izin Siswa'}
            </h1>
            <p className="text-sm text-muted mt-1">
              {isParent ? 'Lihat bukti izin dan surat sakit' : 'Kelola izin dan surat sakit siswa'}
            </p>
          </div>
          <button onClick={() => {
            if (isParent) {
              setStudentName(currentUser.childName || '');
              setStudentClass(currentUser.childClass || '');
            }
            setShowForm(true);
          }} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all">
            <Plus className="w-5 h-5" />Tambah Izin
          </button>
        </div>

        {/* Mode Monitor Active Indicator */}
        {isAdmin && monitoredStudent && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-50 border border-blue-200 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
              {monitoredStudent.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                Filter Monitor Aktif: <span className="text-blue-600">{monitoredStudent.name}</span>
              </p>
              <p className="text-xs text-slate-500">Menampilkan data perizinan milik siswa ini saja.</p>
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

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'izin', 'sakit', 'kegiatan'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filterType === f
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface border border-border text-muted hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'izin' ? '📋 Izin' : f === 'sakit' ? '🤒 Sakit' : '🏅 Kegiatan'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama siswa atau alasan..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
          />
        </div>

        {/* Permit Cards */}
        <div className="space-y-4">
          {filtered.map((p, i) => {
            const tc = typeConfig[p.type];
            return (
              <div key={p.id} className="p-5 rounded-2xl bg-surface border border-border hover:shadow-md transition-all animate-slide-up group" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${tc.bg} flex items-center justify-center text-2xl flex-shrink-0`}>{tc.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-bold text-foreground">{p.studentName}</h3>
                        <p className="text-xs text-muted">{p.studentClass}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(p.status)}
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}>{tc.label}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted mt-2">{p.reason}</p>
                    {(() => {
                      const creator = users.find(u => u.id === p.createdBy);
                      const isCreatedByParent = creator?.role === 'parent';
                      return (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
                          <span>📅 {new Date(p.startDate).toLocaleDateString('id-ID')} – {new Date(p.endDate).toLocaleDateString('id-ID')}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${isCreatedByParent ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {isCreatedByParent ? '👨‍👩‍👧 Diajukan oleh Orang Tua' : '🏫 Didaftarkan oleh Sekolah'} ({p.createdByName})
                          </span>
                        </div>
                      );
                    })()}

                    {/* Attachment & actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {p.attachment && (
                        <button
                          onClick={() => setViewPermit(p)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Bukti
                        </button>
                      )}

                      {/* Parent: bisa balas hanya untuk kegiatan */}
                      {isParent && p.type === 'kegiatan' && p.status === 'pending' && (
                        <button
                          onClick={() => setShowResponseFor(p.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Beri Persetujuan
                        </button>
                      )}

                      {/* Admin: approve/reject */}
                      {isAdmin && p.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(p)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />Setujui
                          </button>
                          <button onClick={() => handleReject(p)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />Tolak
                          </button>
                        </>
                      )}

                      {/* Admin/Teacher atau Pembuat Izin (Parent) bisa menghapus */}
                      {(isAdmin || (isParent && p.createdBy === currentUser.id)) && (
                        <button
                          onClick={() => { if (confirm(`Hapus izin ${p.studentName}?`)) deletePermit(p.id); }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Parent response input */}
                    {showResponseFor === p.id && (
                      <div className="mt-3 p-3 rounded-xl bg-surface-hover border border-border space-y-2">
                        <p className="text-xs font-semibold text-foreground">Balasan Orang Tua:</p>
                        <textarea
                          value={parentResponse}
                          onChange={e => setParentResponse(e.target.value)}
                          rows={2}
                          placeholder="Tulis balasan Anda..."
                          className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleParentResponse(p.id)} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">Kirim</button>
                          <button onClick={() => setShowResponseFor(null)} className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted">Batal</button>
                        </div>
                      </div>
                    )}

                    {p.parentResponse && (
                      <div className="mt-3 p-3 rounded-xl bg-green-50/50 border border-green-100 text-sm">
                        <span className="font-semibold text-green-700">Balasan: </span>
                        <span className="text-muted">{p.parentResponse}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-surface border border-border">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
            <p className="text-lg font-semibold text-foreground">Belum ada data izin</p>
          </div>
        )}
      </div>

      {/* View Attachment Modal */}
      {viewPermit && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setViewPermit(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground">Bukti {typeConfig[viewPermit.type].label}</h2>
                <p className="text-xs text-muted">{viewPermit.studentName} · {viewPermit.attachmentName}</p>
              </div>
              <button onClick={() => setViewPermit(null)} className="p-2 rounded-xl hover:bg-surface-hover"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <div className="p-4">
              {viewPermit.attachment?.startsWith('data:image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewPermit.attachment} alt="Bukti" className="w-full rounded-xl object-contain max-h-[70vh]" />
              ) : viewPermit.attachment?.startsWith('data:application/pdf') ? (
                <iframe src={viewPermit.attachment} className="w-full h-[70vh] rounded-xl" title="PDF Bukti" />
              ) : (
                <div className="text-center py-8 text-muted">
                  <Paperclip className="w-8 h-8 mx-auto mb-2" />
                  <p>{viewPermit.attachmentName}</p>
                  <a href={viewPermit.attachment} download={viewPermit.attachmentName} className="mt-2 inline-block px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">Download</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-lg font-bold">Tambah Izin / Sakit</h2>
              <button onClick={() => { setShowForm(false); setErrorMsg(''); }} className="p-2 rounded-xl hover:bg-surface-hover"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Tipe */}
              <div>
                <label className="block text-sm font-semibold mb-2">Jenis</label>
                <div className="grid grid-cols-3 gap-2">
                  {(isParent ? (['izin', 'sakit'] as const) : (['izin', 'sakit', 'kegiatan'] as const)).map(t => (
                    <button key={t} type="button" onClick={() => setPermitType(t)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${permitType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted'}`}>
                      {typeConfig[t].emoji} {typeConfig[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Siswa */}
              {isParent ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Nama Siswa</label>
                    <input type="text" value={studentName} disabled className="w-full px-4 py-3 rounded-xl border border-border bg-surface-hover text-muted outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Kelas</label>
                    <input type="text" value={studentClass} disabled className="w-full px-4 py-3 rounded-xl border border-border bg-surface-hover text-muted outline-none" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <label className="block text-sm font-semibold mb-2">Nama Siswa</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text" value={studentSearch}
                        onChange={e => { setStudentSearch(e.target.value); setShowStudentList(true); if (studentName) { setStudentName(''); setStudentClass(''); } }}
                        onFocus={() => setShowStudentList(true)}
                        placeholder="Ketik nama siswa..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>
                    {showStudentList && studentSearch && !studentName && (
                      <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                        {filteredStudentsForForm.length > 0 ? filteredStudentsForForm.map(s => (
                          <button key={s.id} type="button"
                            onClick={() => { setStudentName(s.name); setStudentClass(s.class); setStudentSearch(s.name); setShowStudentList(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-surface-hover flex items-center justify-between border-b border-border last:border-0">
                            <span className="font-semibold">{s.name}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Kelas {s.class}</span>
                          </button>
                        )) : <div className="px-4 py-4 text-sm text-muted text-center">Siswa tidak ditemukan</div>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Kelas</label>
                    <select value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none">
                      <option value="">Pilih kelas</option>
                      {SCHOOL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tanggal Mulai</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tanggal Selesai</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate} className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-sm font-semibold mb-2">Alasan</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3} placeholder={permitType === 'sakit' ? 'Sakit demam, flu...' : permitType === 'kegiatan' ? 'Lomba pramuka, OSN...' : 'Keperluan keluarga...'} className="w-full px-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none resize-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Lampiran */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Lampiran Bukti <span className="text-muted font-normal">(opsional, maks. 5MB)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border bg-surface hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-muted" />
                  <span className="text-sm text-muted">{attachmentName || 'Klik untuk upload foto/PDF surat'}</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                {attachment && attachmentName && (
                  <div className="mt-2 flex items-center justify-between text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                    <span>✅ {attachmentName}</span>
                    <button type="button" onClick={() => { setAttachment(undefined); setAttachmentName(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-500 hover:underline">Hapus</button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">⚠️ {errorMsg}</div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Menyimpan...</> : 'Simpan Izin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
