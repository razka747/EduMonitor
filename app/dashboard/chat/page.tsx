'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/app/lib/store';
import {
  MessageCircle, Send, ArrowLeft, Users, Trash2, Mic, Square,
  Paperclip, X, FileText, Image as ImageIcon, Video, Volume2, Download, ZoomIn,
  GraduationCap, Info, CheckCircle2, Shield
} from 'lucide-react';
import DemoQuotaBadge from '@/app/components/DemoQuotaBadge';

export default function ChatPage() {
  const { currentUser, chatRooms, chatMessages, sendMessage, deleteMessage, markRoomAsRead, users, setupRealtime } = useAppStore();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRoomList, setShowRoomList] = useState(true);
  const [privateChatTeacher, setPrivateChatTeacher] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Attachment preview
  const [pendingAttachment, setPendingAttachment] = useState<{
    type: 'audio' | 'video' | 'file' | 'image';
    data: string;
    name: string;
    mime: string;
  } | null>(null);

  // Lightbox state for image preview
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');

  useEffect(() => {
    const cleanup = setupRealtime();
    return () => { if (cleanup) cleanup(); };
  }, [setupRealtime]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedRoom]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!currentUser) return null;

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'bk';

  // Hanya grup kelas/internal yang relevan dengan user:
  // - Admin: HANYA Grup Guru & Admin (TIDAK ADA grup kelas)
  // - Orang tua: HANYA grup kelas anaknya (currentUser.childClass). Tidak boleh melihat Grup Guru & Admin.
  // - Guru: Grup Guru & Admin + grup kelas binaannya (currentUser.homeClass)
  // - BK: Grup Guru & Admin + grup kelas
  const relevantGroupRooms = chatRooms.filter(room => {
    if (room.id.startsWith('private-')) return false;

    const isInternalStaffRoom = room.id === 'group-teachers-admin' || room.name.toLowerCase().includes('guru & admin');
    if (isInternalStaffRoom) {
      return isStaff;
    }

    // Admin HANYA melihat grup guru (tidak ada grup kelas sama sekali)
    if (currentUser.role === 'admin') {
      return false;
    }

    if (currentUser.role === 'parent') {
      return currentUser.childClass ? (room.id === `group-${currentUser.childClass}` || room.name.includes(currentUser.childClass)) : false;
    }
    if (currentUser.role === 'teacher') {
      return currentUser.homeClass ? (room.id === `group-${currentUser.homeClass}` || room.name.includes(currentUser.homeClass)) : false;
    }
    return true;
  });

  const myClass = currentUser.role === 'parent' ? currentUser.childClass : currentUser.role === 'teacher' ? currentUser.homeClass : null;

  // Siapkan daftar grup yang ditampilkan
  const baseGroupRooms = [...relevantGroupRooms];

  // Pastikan "Grup Guru & Admin" selalu ada untuk role Staff (Admin, Guru, BK)
  if (isStaff && !baseGroupRooms.some(r => r.id === 'group-teachers-admin')) {
    baseGroupRooms.unshift({
      id: 'group-teachers-admin',
      name: 'Grup Guru & Admin',
      type: 'group' as const,
      participants: users.filter(u => u.role === 'admin' || u.role === 'teacher' || u.role === 'bk').map(u => u.id),
      lastMessage: 'Grup internal dewan guru & admin',
      unreadCount: 0
    });
  }

  // Jika guru/ortu belum memiliki grup kelas di DB, tambahkan fallback
  if (myClass && !baseGroupRooms.some(r => r.id === `group-${myClass}` || r.name.includes(myClass))) {
    baseGroupRooms.push({
      id: `group-${myClass}`,
      name: `Grup Kelas ${myClass}`,
      type: 'group' as const,
      participants: [],
      lastMessage: 'Belum ada percakapan grup',
      unreadCount: 0
    });
  }

  const displayGroupRooms = baseGroupRooms;

  // Daftar kontak chat private:
  // - Admin: HANYA wali kelas (guru yang memiliki homeClass)
  // - Orang Tua: HANYA wali kelas dari kelas anaknya
  // - Guru: HANYA orang tua murid dari kelas binaannya
  // - BK: Guru dan Admin
  const chatPartners = users
    .filter(u => {
      if (u.id === currentUser.id) return false;
      if (currentUser.role === 'admin') {
        // Admin hanya melihat guru yang bertugas sebagai Wali Kelas
        return u.role === 'teacher' && !!u.homeClass;
      }
      if (currentUser.role === 'parent') {
        return u.role === 'teacher' && u.homeClass === currentUser.childClass;
      }
      if (currentUser.role === 'teacher') {
        return u.role === 'parent' && u.childClass === currentUser.homeClass;
      }
      if (currentUser.role === 'bk') {
        return (u.role === 'teacher' && !!u.homeClass) || u.role === 'admin';
      }
      return false;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const roomMessages = selectedRoom
    ? chatMessages.filter(m => m.chatRoomId === selectedRoom)
    : privateChatTeacher
    ? chatMessages.filter(m => m.chatRoomId === `private-${[currentUser.id, privateChatTeacher].sort().join('-')}`)
    : [];

  const selectedRoomData = selectedRoom
    ? (chatRooms.find(r => r.id === selectedRoom) || displayGroupRooms.find(r => r.id === selectedRoom))
    : null;
  const selectedTeacher = privateChatTeacher ? users.find(u => u.id === privateChatTeacher) : null;

  // Cek apakah room yang dipilih adalah grup khusus guru & admin
  const isStaffGroup = selectedRoom === 'group-teachers-admin' || (selectedRoomData?.name.toLowerCase().includes('guru & admin') ?? false);

  // Anggota grup guru & admin
  const staffMembers = users
    .filter(u => u.role === 'admin' || u.role === 'teacher' || u.role === 'bk')
    .sort((a, b) => {
      const order = { admin: 1, bk: 2, teacher: 3, parent: 4 };
      const diff = (order[a.role as keyof typeof order] || 99) - (order[b.role as keyof typeof order] || 99);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

  // Detail anggota grup kelas yang sedang aktif (jika bukan staff group)
  const currentGroupClass = selectedRoom && !isStaffGroup
    ? (selectedRoomData?.name.replace('Grup Kelas ', '') || selectedRoom.replace('group-', '') || myClass)
    : null;
  const groupWalas = currentGroupClass
    ? users.find(u => u.role === 'teacher' && u.homeClass === currentGroupClass)
    : null;
  const groupParents = currentGroupClass
    ? users.filter(u => u.role === 'parent' && u.childClass === currentGroupClass)
    : [];
  const groupMemberCount = isStaffGroup ? staffMembers.length : (groupWalas ? 1 : 0) + groupParents.length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = messageText.trim().length > 0;
    const hasAttachment = !!pendingAttachment;
    if (!hasText && !hasAttachment) return;

    const chatRoomId = selectedRoom || `private-${[currentUser.id, privateChatTeacher].sort().join('-')}`;

    sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: hasText ? messageText.trim() : (pendingAttachment ? `📎 ${pendingAttachment.name}` : ''),
      timestamp: new Date().toISOString(),
      chatRoomId,
      attachmentType: pendingAttachment?.type,
      attachmentData: pendingAttachment?.data,
      attachmentName: pendingAttachment?.name,
      attachmentMime: pendingAttachment?.mime,
    });

    setMessageText('');
    setPendingAttachment(null);
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const openChat = (roomId: string | null, teacherId: string | null) => {
    setSelectedRoom(roomId);
    setPrivateChatTeacher(teacherId);
    setShowRoomList(false);
    if (roomId) markRoomAsRead(roomId);
  };

  const goBack = () => {
    setSelectedRoom(null);
    setPrivateChatTeacher(null);
    setShowRoomList(true);
  };

  // ── Voice Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPendingAttachment({
            type: 'audio',
            data: reader.result as string,
            name: `voice-note-${Date.now()}.webm`,
            mime: mediaRecorder.mimeType,
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatRecordTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── File Picker ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Ukuran file maksimal 10MB'); return; }

    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingAttachment({ type, data: reader.result as string, name: file.name, mime: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Download helper ──
  const triggerDownload = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Render attachment inside bubble ──
  const renderAttachment = (msg: typeof roomMessages[0], isOwn: boolean) => {
    if (!msg.attachmentType || !msg.attachmentData) return null;
    const cls = isOwn ? 'text-white/70' : 'text-muted';
    const dlBtnCls = isOwn
      ? 'bg-white/15 hover:bg-white/25 text-white/80'
      : 'bg-gray-200 hover:bg-gray-300 text-foreground';

    switch (msg.attachmentType) {
      case 'audio':
        return (
          <div className="mt-2">
            <audio controls className="max-w-full h-10 rounded-lg" style={{ filter: isOwn ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
              <source src={msg.attachmentData} type={msg.attachmentMime || 'audio/webm'} />
            </audio>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-[10px] flex items-center gap-1 ${cls}`}><Volume2 className="w-3 h-3" /> Pesan Suara</p>
              <button onClick={() => triggerDownload(msg.attachmentData!, msg.attachmentName || 'voice-note.webm')}
                className={`p-1 rounded-md transition-colors ${dlBtnCls}`} title="Download">
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="mt-2">
            <video controls className="max-w-[260px] rounded-xl border border-white/10" preload="metadata">
              <source src={msg.attachmentData} type={msg.attachmentMime || 'video/mp4'} />
            </video>
            <div className="flex items-center justify-end mt-1">
              <button onClick={() => triggerDownload(msg.attachmentData!, msg.attachmentName || 'video.mp4')}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${dlBtnCls}`} title="Download Video">
                <Download className="w-3 h-3" /> Unduh
              </button>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="mt-2 relative group/img">
            <img src={msg.attachmentData} alt={msg.attachmentName || 'image'}
              className="w-full max-w-[260px] max-h-[260px] object-cover rounded-xl cursor-pointer hover:brightness-90 transition-all"
              onClick={() => { setLightboxSrc(msg.attachmentData!); setLightboxName(msg.attachmentName || 'image.png'); }} />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/30 pointer-events-none">
              <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
            </div>
            <div className="flex items-center justify-end mt-1">
              <button onClick={() => triggerDownload(msg.attachmentData!, msg.attachmentName || 'image.png')}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${dlBtnCls}`} title="Download Gambar">
                <Download className="w-3 h-3" /> Unduh
              </button>
            </div>
          </div>
        );
      case 'file':
        return (
          <button onClick={() => triggerDownload(msg.attachmentData!, msg.attachmentName || 'file')}
            className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg w-full transition-colors ${dlBtnCls}`}>
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-medium truncate flex-1 text-left">{msg.attachmentName || 'file'}</span>
            <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] rounded-2xl bg-surface border border-border overflow-hidden">
        {/* Room List */}
        <div className={`w-full lg:w-80 border-r border-border flex-shrink-0 flex flex-col ${!showRoomList ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" /> Pesan
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Group Chats */}
            <div className="p-3">
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  {currentUser.role === 'admin' ? 'Grup Guru' : currentUser.role === 'parent' ? 'Grup Kelas' : 'Grup Obrolan'}
                </p>
                {myClass && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Kelas {myClass}
                  </span>
                )}
              </div>
              {displayGroupRooms.map((room) => {
                const isSelected = selectedRoom === room.id;
                const isStaffRoom = room.id === 'group-teachers-admin' || room.name.toLowerCase().includes('guru & admin');
                return (
                  <button key={room.id} onClick={() => openChat(room.id, null)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left mb-1.5 ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-hover'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isStaffRoom ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {isStaffRoom ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                        {isStaffRoom && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            STAFF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate">{room.lastMessage || 'Belum ada pesan'}</p>
                    </div>
                    {room.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{room.unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Private Chats */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">
                  {currentUser.role === 'parent' ? 'Wali Kelas' : currentUser.role === 'teacher' ? 'Orang Tua Murid' : currentUser.role === 'admin' ? 'Wali Kelas (Private)' : 'Chat Pribadi'}
                </p>
                {currentUser.role === 'parent' && currentUser.childClass && (
                  <span className="text-[10px] font-semibold text-muted">
                    Kelas {currentUser.childClass}
                  </span>
                )}
                {currentUser.role === 'admin' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Khusus Walas
                  </span>
                )}
              </div>

              {/* Empty states if no partner */}
              {chatPartners.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center my-1">
                  <p className="text-xs font-semibold text-slate-600">
                    {currentUser.role === 'parent'
                      ? `Belum ada Wali Kelas untuk Kelas ${currentUser.childClass || '-'}`
                      : currentUser.role === 'teacher'
                      ? (currentUser.homeClass ? `Belum ada orang tua murid terdaftar di Kelas ${currentUser.homeClass}` : 'Anda belum ditugaskan sebagai Wali Kelas')
                      : currentUser.role === 'admin'
                      ? 'Belum ada guru yang ditetapkan sebagai Wali Kelas'
                      : 'Tidak ada kontak obrolan'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {currentUser.role === 'parent'
                      ? 'Admin sekolah akan segera menugaskan wali kelas.'
                      : currentUser.role === 'teacher' && !currentUser.homeClass
                      ? 'Hubungi admin untuk penetapan kelas binaan.'
                      : currentUser.role === 'admin'
                      ? 'Buka menu Pengguna lalu pilih kelas binaan pada data guru untuk mengaktifkan obrolan.'
                      : 'Data akan muncul otomatis saat akun terhubung.'}
                  </p>
                </div>
              ) : (
                chatPartners.map((partner) => {
                  const privateRoomId = `private-${[currentUser.id, partner.id].sort().join('-')}`;
                  const partnerMessages = chatMessages.filter(m => m.chatRoomId === privateRoomId);
                  const lastMsg = partnerMessages.length > 0 ? partnerMessages[partnerMessages.length - 1] : null;
                  const lastText = lastMsg ? (lastMsg.attachmentType ? `📎 ${lastMsg.attachmentName || 'Media'}` : lastMsg.message) : 'Belum ada pesan';
                  const isSelected = privateChatTeacher === partner.id;

                  return (
                    <button key={partner.id} onClick={() => openChat(null, partner.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left mb-1.5 ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-hover'}`}>
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-slate-800 shadow-sm">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold text-foreground truncate">{partner.name}</p>
                          {(currentUser.role === 'parent' || currentUser.role === 'admin') && partner.homeClass && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-200 whitespace-nowrap">
                              Walas {partner.homeClass}
                            </span>
                          )}
                          {currentUser.role === 'teacher' && partner.childName && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 whitespace-nowrap">
                              Ortu {partner.childName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate mt-0.5">{lastText}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-h-0 ${showRoomList ? 'hidden lg:flex' : 'flex'}`}>
          {(selectedRoom || privateChatTeacher) ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={goBack} className="lg:hidden p-2 rounded-xl hover:bg-surface-hover transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted" />
                  </button>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedRoom
                      ? (isStaffGroup ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-800 border border-slate-200')
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {selectedRoom
                      ? (isStaffGroup ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />)
                      : <span className="text-sm font-bold text-slate-800">{selectedTeacher?.name.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{selectedRoomData?.name || selectedTeacher?.name}</p>
                    <p className="text-xs text-muted truncate">
                      {selectedRoom
                        ? (isStaffGroup
                            ? `Grup Koordinasi Internal • ${groupMemberCount} Dewan Guru & Admin`
                            : `Grup Resmi • ${groupMemberCount} Anggota Terdaftar`)
                        : selectedTeacher?.role === 'teacher'
                        ? `Wali Kelas ${selectedTeacher?.homeClass || '-'} • ${selectedTeacher?.subject || 'Guru'}`
                        : selectedTeacher?.role === 'parent'
                        ? `Orang Tua dari ${selectedTeacher?.childName || '-'} (Kelas ${selectedTeacher?.childClass || '-'})`
                        : 'Percakapan Pribadi'}
                    </p>
                  </div>
                </div>

                {/* Tombol Info Anggota Grup (khusus tampilan grup) */}
                {selectedRoom && (
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-surface-hover text-xs font-bold text-muted hover:text-foreground transition-all flex-shrink-0"
                    title={isStaffGroup ? "Lihat anggota dewan guru & admin" : "Lihat anggota kelas"}
                  >
                    {isStaffGroup ? <Shield className="w-3.5 h-3.5 text-indigo-600" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                    <span>{groupMemberCount} {isStaffGroup ? 'Staff' : 'Anggota'}</span>
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {roomMessages.length === 0 && (
                  <div className="text-center py-12 text-muted">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada pesan. Mulai percakapan!</p>
                  </div>
                )}
                {roomMessages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  const isGroupChat = selectedRoom ? !selectedRoom.startsWith('private-') : false;
                  const isModerator = currentUser.role === 'teacher' || currentUser.role === 'admin' || currentUser.role === 'bk';
                  const canDelete = isOwn || (isGroupChat && isModerator);
                  return (
                    <div key={msg.id} className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {canDelete && isOwn && (
                        <button onClick={() => deleteMessage(msg.id)} className="mx-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-50 rounded-full h-fit mt-auto mb-1" title="Hapus pesan">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        {!isOwn && (
                          <div className="flex items-center gap-2 mb-1 ml-1">
                            <p className="text-xs font-semibold text-primary">{msg.senderName}</p>
                            {msg.senderRole === 'admin' && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200/60">
                                ADMINISTRATOR
                              </span>
                            )}
                            {msg.senderRole === 'bk' && (
                              <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded border border-teal-200/60">
                                GURU BK
                              </span>
                            )}
                            {msg.senderRole === 'teacher' && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200/60">
                                {(() => {
                                  const u = users.find(user => user.id === msg.senderId);
                                  return u?.homeClass ? `WALI KELAS ${u.homeClass}` : 'DEWAN GURU';
                                })()}
                              </span>
                            )}
                            {msg.senderRole === 'parent' && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded border border-emerald-200/60">
                                {(() => {
                                  const u = users.find(user => user.id === msg.senderId);
                                  return u?.childName ? `Ortu ${u.childName.split(' ')[0]}` : 'Orang Tua';
                                })()}
                              </span>
                            )}
                          </div>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl ${isOwn ? 'bg-slate-900 text-white rounded-br-md shadow-sm' : 'bg-slate-100 text-foreground rounded-bl-md'}`}>
                          {/* Only show text if it's not just the auto-generated attachment label, or if there's real text */}
                          {msg.message && !(msg.attachmentType && msg.message.startsWith('📎')) && (
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                          )}
                          {renderAttachment(msg, isOwn)}
                          <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-muted'} text-right`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                      {canDelete && !isOwn && (
                        <button onClick={() => deleteMessage(msg.id)} className="mx-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-50 rounded-full h-fit mt-auto mb-1" title="Hapus pesan">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Attachment Preview */}
              {pendingAttachment && (
                <div className="px-4 py-2 border-t border-border bg-surface-hover">
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-surface border border-border">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      pendingAttachment.type === 'audio' ? 'bg-purple-100 text-purple-600' :
                      pendingAttachment.type === 'video' ? 'bg-blue-100 text-blue-600' :
                      pendingAttachment.type === 'image' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {pendingAttachment.type === 'audio' ? <Volume2 className="w-5 h-5" /> :
                       pendingAttachment.type === 'video' ? <Video className="w-5 h-5" /> :
                       pendingAttachment.type === 'image' ? <ImageIcon className="w-5 h-5" /> :
                       <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{pendingAttachment.name}</p>
                      <p className="text-[10px] text-muted uppercase">{pendingAttachment.type === 'audio' ? 'Pesan Suara' : pendingAttachment.type}</p>
                    </div>
                    {pendingAttachment.type === 'image' && (
                      <img src={pendingAttachment.data} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <button onClick={() => setPendingAttachment(null)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Recording Indicator */}
              {isRecording && (
                <div className="px-4 py-2 border-t border-border bg-red-50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-red-600">Merekam... {formatRecordTime(recordingTime)}</span>
                    <div className="flex-1" />
                    <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                      <Square className="w-4 h-4" /> Berhenti
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {/* File attachment button */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-all flex-shrink-0" title="Kirim file/gambar/video">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />

                  {/* Voice note button */}
                  <button type="button" onClick={isRecording ? stopRecording : startRecording}
                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'hover:bg-surface-hover text-muted hover:text-foreground'}`}
                    title={isRecording ? 'Berhenti merekam' : 'Kirim pesan suara'}>
                    {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)}
                    placeholder="Ketik pesan..."
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface-hover text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
                  <button type="submit" disabled={!messageText.trim() && !pendingAttachment}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-30 shadow-sm">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted opacity-20" />
                <p className="text-lg font-semibold text-foreground mb-1">Pilih Percakapan</p>
                <p className="text-sm text-muted">Pilih grup atau guru untuk memulai chat</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Anggota Grup ── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowMembersModal(false)}>
          <div className="bg-surface text-foreground rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isStaffGroup ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/10 text-primary'}`}>
                  {isStaffGroup ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isStaffGroup ? 'Anggota Grup Guru & Admin' : `Anggota Grup Kelas ${currentGroupClass || '-'}`}
                  </h3>
                  <p className="text-[11px] text-muted">{groupMemberCount} Anggota Terdaftar</p>
                </div>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[65vh] overflow-y-auto space-y-4">
              {isStaffGroup ? (
                <>
                  {/* Info Banner Internal Staff */}
                  <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/60 text-xs text-indigo-900 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Grup koordinasi internal sekolah khusus untuk <strong>Dewan Guru, BK, dan Administrator</strong>. Seluruh obrolan bersifat tertutup dan aman dari pihak luar/orang tua murid.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {staffMembers.map((member) => (
                      <div key={member.id} className="p-3 rounded-xl bg-surface-hover border border-border flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          member.role === 'admin' ? 'bg-slate-900 text-white' :
                          member.role === 'bk' ? 'bg-blue-100 text-blue-800' :
                          member.homeClass ? 'bg-blue-50 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              member.role === 'admin' ? 'bg-slate-900 text-white' :
                              member.role === 'bk' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              member.homeClass ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {member.role === 'admin' ? 'ADMINISTRATOR' :
                               member.role === 'bk' ? 'GURU BK' :
                               member.homeClass ? `WALAS ${member.homeClass}` : 'GURU'}
                            </span>
                          </div>
                          <p className="text-xs text-muted truncate mt-0.5">
                            {member.subject ? `${member.subject} • ` : ''}{member.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Info Banner Grup Kelas */}
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Anggota grup ini dibatasi <strong>khusus untuk Wali Kelas dan Orang Tua murid Kelas {currentGroupClass}</strong> demi menjaga privasi dan ketertiban informasi kelas.
                    </p>
                  </div>

                  {/* Wali Kelas Section */}
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Wali Kelas</p>
                    {groupWalas ? (
                      <div className="p-3 rounded-xl bg-surface-hover border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {groupWalas.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground truncate">{groupWalas.name}</p>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">WALI KELAS</span>
                          </div>
                          <p className="text-xs text-muted truncate mt-0.5">{groupWalas.subject || 'Mata Pelajaran'} • {groupWalas.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-muted">
                        Belum ada guru yang ditetapkan sebagai wali kelas untuk Kelas {currentGroupClass}.
                      </div>
                    )}
                  </div>

                  {/* Orang Tua Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">Orang Tua Murid</p>
                      <span className="text-xs font-semibold text-muted">({groupParents.length} Orang)</span>
                    </div>

                    {groupParents.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-muted">
                        Belum ada akun orang tua yang terdaftar di kelas ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groupParents.map((parent) => (
                          <div key={parent.id} className="p-3 rounded-xl bg-surface-hover border border-border flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs flex-shrink-0">
                              {parent.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{parent.name}</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                                <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  Anak: {parent.childName || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-3 border-t border-border bg-slate-50/50">
              <button
                onClick={() => setShowMembersModal(false)}
                className="w-full py-2.5 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-surface transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxSrc(null)}>
          <div className="relative max-w-4xl max-h-[90vh] animate-scale-up" onClick={e => e.stopPropagation()}>
            <img src={lightboxSrc} alt={lightboxName} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
            <div className="absolute top-3 right-3 flex gap-2">
              <button onClick={() => triggerDownload(lightboxSrc, lightboxName)}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all" title="Download">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => setLightboxSrc(null)}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all" title="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-white/60 text-xs mt-3">{lightboxName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
