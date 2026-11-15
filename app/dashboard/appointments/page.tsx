'use client';

import { useState } from 'react';
import { useAppStore } from '@/app/lib/store';
import { Calendar, Plus, X, Check, Clock, XCircle, CheckCircle, Trash2 } from 'lucide-react';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';

export default function AppointmentsPage() {
  const { currentUser, appointments, users, addAppointment, updateAppointmentStatus, deleteAppointment } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(''); // parentId if admin/teacher creates, teacherId if parent creates
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [attachment, setAttachment] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  const isAdminOrTeacher = currentUser.role === 'admin' || currentUser.role === 'teacher';
  const targetUsers = isAdminOrTeacher ? users.filter(u => u.role === 'parent') : users.filter(u => u.role === 'teacher' || u.role === 'admin');
  let userAppointments = appointments;
  if (currentUser.role === 'parent') {
    userAppointments = appointments.filter(a => a.parentId === currentUser.id || a.parentName === currentUser.name);
  } else if (isAdminOrTeacher) {
    userAppointments = appointments.filter(a => a.teacherId === currentUser.id || a.createdBy === currentUser.id);
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Menunggu', color: 'bg-slate-100 text-slate-600 border border-slate-200', icon: Clock };
      case 'confirmed': return { label: 'Dikonfirmasi', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: CheckCircle };
      case 'rejected': return { label: 'Ditolak', color: 'bg-slate-200 text-slate-700 border border-slate-300', icon: XCircle };
      default: return { label: 'Selesai', color: 'bg-blue-100 text-blue-600', icon: Check };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
        setAttachmentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      if (selectedUser === 'all_parents') {
        const parents = users.filter(u => u.role === 'parent');
        for (const parent of parents) {
          const aptData = {
            parentId: parent.id,
            parentName: parent.name,
            teacherId: currentUser.id,
            teacherName: currentUser.name,
            date, time, location, purpose, 
            status: 'pending' as const,
            attachment, attachmentName,
            createdBy: currentUser.id
          };
          await addAppointment(aptData);
        }
      } else {
        const targetUser = users.find(u => u.id === selectedUser);
        if (!targetUser) { setIsSubmitting(false); return; }
        
        const aptData = {
          parentId: isAdminOrTeacher ? targetUser.id : currentUser.id,
          parentName: isAdminOrTeacher ? targetUser.name : currentUser.name,
          teacherId: isAdminOrTeacher ? currentUser.id : targetUser.id,
          teacherName: isAdminOrTeacher ? currentUser.name : targetUser.name,
          date, time, location, purpose, 
          status: 'pending' as const,
          attachment, attachmentName,
          createdBy: currentUser.id
        };
        await addAppointment(aptData);
      }
      
      setSelectedUser(''); setDate(''); setTime(''); setLocation(''); setPurpose(''); 
      setAttachment(''); setAttachmentName(''); setShowForm(false);
    } catch(err) {
      console.error(err);
      alert('Gagal membuat janji temu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-900" />Janji Temu
          </h1>
          <p className="text-sm text-muted mt-1">{currentUser.role === 'parent' ? 'Jadwalkan pertemuan dengan guru' : 'Jadwalkan pertemuan dengan orang tua murid'}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all">
          <Plus className="w-5 h-5" />Buat Janji Temu
        </button>
      </div>

      <div className="space-y-3">
        {userAppointments.map((apt, i) => {
          const sc = getStatusConfig(apt.status);
          const SI = sc.icon;
          return (
            <div key={apt.id} className="p-5 rounded-2xl bg-surface border border-border hover:shadow-md transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-500">{new Date(apt.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                  <span className="text-xl font-bold text-blue-700">{new Date(apt.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground">{apt.purpose}</h3>
                      <p className="text-sm text-muted mt-0.5">{currentUser.role === 'parent' ? `Dengan ${apt.teacherName}` : `Dari ${apt.parentName}`}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${sc.color}`}><SI className="w-3.5 h-3.5" />{sc.label}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(apt.date).toLocaleDateString('id-ID')}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{apt.time} WIB</span>
                  </div>
                  {apt.location && (
                    <div className="mt-2 text-sm text-muted">
                      <span className="font-semibold text-foreground">Tempat:</span> {apt.location}
                    </div>
                  )}
                  {apt.attachment && apt.attachmentName && (
                    <div className="mt-3 p-3 bg-surface-hover rounded-xl border border-border flex flex-col gap-2">
                      <span className="text-xs font-semibold text-foreground">Lampiran: {apt.attachmentName}</span>
                      {apt.attachment.startsWith('data:image') ? (
                        <img src={apt.attachment} alt="Lampiran" className="max-w-[200px] rounded-lg border border-border" />
                      ) : (
                        <a href={apt.attachment} download={apt.attachmentName} className="text-sm text-blue-500 underline">Unduh File</a>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2 mt-4">
                    {apt.status === 'pending' && apt.createdBy !== currentUser.id && (
                      <>
                        <button onClick={() => updateAppointmentStatus(apt.id, 'confirmed')} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 transition-colors"><Check className="w-4 h-4" />Terima</button>
                        <button onClick={() => updateAppointmentStatus(apt.id, 'rejected')} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-sm font-semibold hover:bg-slate-200 transition-colors"><X className="w-4 h-4" />Tolak</button>
                      </>
                    )}
                    {apt.createdBy === currentUser.id && (
                      <button 
                        onClick={async () => {
                          if (confirm('Apakah Anda yakin ingin membatalkan/menghapus janji temu ini?')) {
                            try {
                              await deleteAppointment(apt.id);
                            } catch (err: any) {
                              alert(err.message || 'Gagal menghapus janji temu.');
                            }
                          }
                        }} 
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-sm font-semibold hover:bg-slate-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {userAppointments.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-surface border border-border">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted opacity-30" />
            <p className="text-lg font-semibold text-foreground mb-1">Belum ada janji temu</p>
          </div>
        )}
      </div>

      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="sticky top-0 z-10 bg-surface border-b border-border p-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-lg font-bold">Buat Janji Temu</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-surface-hover"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{isAdminOrTeacher ? 'Pilih Orang Tua' : 'Pilih Guru'}</label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:ring-2 focus:ring-primary/30 outline-none">
                  <option value="">{isAdminOrTeacher ? 'Pilih orang tua murid' : 'Pilih guru'}</option>
                  {isAdminOrTeacher && <option value="all_parents" className="font-bold text-primary">👥 Semua Orang Tua (Broadcast)</option>}
                  {targetUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.role === 'parent' ? (u.childName ? `(Orang Tua dari ${u.childName})` : '') : `— ${u.subject || 'Admin'}`}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-2">Tanggal</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none" /></div>
                <div><label className="block text-sm font-semibold mb-2">Waktu</label><input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-border bg-surface outline-none" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-2">Tempat / Lokasi</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Misal: Ruang Guru, Ruang BK, dll." className="w-full px-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none" /></div>
              <div><label className="block text-sm font-semibold mb-2">Tujuan</label><textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Tujuan pertemuan..." required rows={3} className="w-full px-4 py-3 rounded-xl border border-border bg-surface placeholder:text-muted outline-none resize-none" /></div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Lampiran (Surat/Gambar) <span className="text-muted font-normal">(Opsional)</span></label>
                <div className="relative">
                  <input type="file" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {isSubmitting ? 'Mengirim...' : 'Kirim Permintaan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
