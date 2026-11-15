export type UserRole = 'parent' | 'teacher' | 'admin' | 'bk';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  // Parent specific
  childName?: string;
  childClass?: string;
  // Teacher specific
  subject?: string;
  homeClass?: string;
}

export interface Violation {
  id: string;
  studentName: string;
  studentClass: string;
  violationType: string;
  description: string;
  photo?: string;
  date: string;
  reportedBy: string;
  severity: 'ringan' | 'sedang' | 'berat';
  status: 'pending_bk' | 'validated' | 'rejected';
}

export interface Student {
  id: string;
  name: string;
  class: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'violation' | 'appointment' | 'achievement' | 'general';
  targetUserId: string;
  relatedId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
  chatRoomId: string;
  // Attachment support
  attachmentType?: 'audio' | 'video' | 'file' | 'image';
  attachmentData?: string;   // base64 data URL
  attachmentName?: string;   // original file name
  attachmentMime?: string;   // MIME type e.g. audio/webm, video/mp4
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'private' | 'group';
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface Appointment {
  id: string;
  parentId: string;
  parentName: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  purpose: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  notes?: string;
  location?: string;
  attachment?: string;
  attachmentName?: string;
  createdBy?: string;
}

export interface Achievement {
  id: string;
  studentName: string;
  studentClass: string;
  title: string;
  description: string;
  date: string;
  category: 'akademik' | 'olahraga' | 'seni' | 'lainnya';
}

export interface Permit {
  id: string;
  studentName: string;
  studentClass: string;
  type: 'izin' | 'sakit' | 'kegiatan';
  reason: string;
  date: string;
  startDate: string;
  endDate: string;
  attachment?: string;
  attachmentName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdByName: string;
  parentId?: string;
  parentResponse?: string;
}

export interface Grade {
  id: string;
  studentName: string;
  studentClass: string;
  subject: string;
  type: 'Tugas' | 'Ulangan Harian' | 'UTS' | 'UAS' | 'Ujian Harian' | 'Tengah Semester' | 'Awal Semester' | 'Akhir Semester';
  score: number;
  date: string;
  createdBy: string;
}

export interface Attendance {
  id: string;
  studentName: string;
  studentClass: string;
  date: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alpha';
  notes?: string;
  photo?: string;
  recordedBy: string;
}
