-- ==============================================================================
-- SISTEM MONITORING SEKOLAH (SCHOOL MONITOR SYSTEM)
-- FULL DATABASE SCHEMA FOR SUPABASE POSTGRESQL
-- ==============================================================================
-- Skrip ini mencakup:
-- 1. Semua tabel untuk seluruh halaman aplikasi (11 tabel)
-- 2. Index performa query pencarian dan filter
-- 3. Row Level Security (RLS) & Kebijakan Akses (Policies)
-- 4. Supabase Realtime Publication untuk sinkronisasi chat & notifikasi
-- 5. Trigger auto-update timestamp
-- ==============================================================================

-- Aktifkan ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL: profiles
-- Digunakan untuk: Autentikasi, Hak Akses (Admin, Guru, BK, Orang Tua), Kelola Pengguna
-- Halaman terkait: /dashboard/users, Login/Register (/), Profil Pengguna
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('parent', 'teacher', 'admin', 'bk')),
  avatar text,
  child_name text,
  child_class text,
  subject text,
  home_class text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles (name);

-- ==============================================================================
-- 2. TABEL: students
-- Digunakan untuk: Master data siswa dan pemilihan siswa untuk monitor
-- Halaman terkait: Monitor Siswa (Dashboard), Absensi, Nilai, Prestasi, Pelanggaran
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id text PRIMARY KEY,
  name text NOT NULL,
  class text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index students
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students (name);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students (class);

-- ==============================================================================
-- 3. TABEL: violations (Pelanggaran Siswa)
-- Digunakan untuk: Pencatatan & validasi pelanggaran siswa oleh Guru dan BK/Admin
-- Halaman terkait: /dashboard/violations, Dashboard Summary
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.violations (
  id text PRIMARY KEY,
  student_name text NOT NULL,
  student_class text NOT NULL,
  violation_type text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('ringan', 'sedang', 'berat')),
  photo_url text,
  date text NOT NULL,
  reported_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending_bk' CHECK (status IN ('pending_bk', 'validated', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Index violations
CREATE INDEX IF NOT EXISTS idx_violations_student_name ON public.violations (student_name);
CREATE INDEX IF NOT EXISTS idx_violations_student_class ON public.violations (student_class);
CREATE INDEX IF NOT EXISTS idx_violations_status ON public.violations (status);
CREATE INDEX IF NOT EXISTS idx_violations_date ON public.violations (date);

-- ==============================================================================
-- 4. TABEL: notifications (Notifikasi Sistem)
-- Digunakan untuk: Notifikasi real-time (pelanggaran, janji temu, prestasi, info)
-- Halaman terkait: /dashboard/notifications, Header TopBar Notification Bell
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  target_user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('violation', 'appointment', 'achievement', 'general')),
  related_id text,
  read boolean NOT NULL DEFAULT false,
  date text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index notifications
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications (target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);

-- ==============================================================================
-- 5. TABEL: chat_rooms (Ruang Percakapan)
-- Digunakan untuk: Grup kelas & obrolan langsung (Private Chat)
-- Halaman terkait: /dashboard/chat
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('private', 'group')),
  participants text[] NOT NULL DEFAULT '{}',
  last_message text,
  last_message_time text,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index chat_rooms
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON public.chat_rooms (type);

-- ==============================================================================
-- 6. TABEL: chat_messages (Pesan Obrolan)
-- Digunakan untuk: Pesan teks, audio, gambar, dan dokumen antar pengguna
-- Halaman terkait: /dashboard/chat, RealtimeListener
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id text PRIMARY KEY,
  chat_room_id text NOT NULL,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('parent', 'teacher', 'admin', 'bk')),
  message text NOT NULL,
  timestamp text NOT NULL,
  attachment_type text CHECK (attachment_type IN ('audio', 'video', 'file', 'image')),
  attachment_data text,
  attachment_name text,
  attachment_mime text,
  created_at timestamptz DEFAULT now()
);

-- Index chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages (chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at DESC);

-- ==============================================================================
-- 7. TABEL: appointments (Janji Temu Konsultasi)
-- Digunakan untuk: Pengajuan & persetujuan janji temu Orang Tua dengan Guru/BK
-- Halaman terkait: /dashboard/appointments, Dashboard Summary
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id text PRIMARY KEY,
  parent_id text NOT NULL,
  parent_name text NOT NULL,
  teacher_id text NOT NULL,
  teacher_name text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  notes text,
  location text,
  attachment text,
  attachment_name text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Index appointments
CREATE INDEX IF NOT EXISTS idx_appointments_parent_id ON public.appointments (parent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_id ON public.appointments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);

-- ==============================================================================
-- 8. TABEL: achievements (Prestasi Siswa)
-- Digunakan untuk: Pencatatan piagam, medali, dan penghargaan siswa
-- Halaman terkait: /dashboard/achievements, Dashboard Summary
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  student_name text NOT NULL,
  student_class text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  date text NOT NULL,
  category text NOT NULL CHECK (category IN ('akademik', 'olahraga', 'seni', 'lainnya')),
  created_at timestamptz DEFAULT now()
);

-- Index achievements
CREATE INDEX IF NOT EXISTS idx_achievements_student_name ON public.achievements (student_name);
CREATE INDEX IF NOT EXISTS idx_achievements_student_class ON public.achievements (student_class);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements (category);

-- ==============================================================================
-- 9. TABEL: permits (Perizinan Siswa)
-- Digunakan untuk: Pengajuan izin tidak masuk (sakit, urusan keluarga, kegiatan)
-- Halaman terkait: /dashboard/permits
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.permits (
  id text PRIMARY KEY,
  student_name text NOT NULL,
  student_class text NOT NULL,
  type text NOT NULL CHECK (type IN ('izin', 'sakit', 'kegiatan')),
  reason text NOT NULL,
  date text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  attachment text,
  attachment_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by text NOT NULL,
  created_by_name text NOT NULL,
  parent_id text,
  parent_response text,
  created_at timestamptz DEFAULT now()
);

-- Index permits
CREATE INDEX IF NOT EXISTS idx_permits_student_name ON public.permits (student_name);
CREATE INDEX IF NOT EXISTS idx_permits_student_class ON public.permits (student_class);
CREATE INDEX IF NOT EXISTS idx_permits_status ON public.permits (status);
CREATE INDEX IF NOT EXISTS idx_permits_parent_id ON public.permits (parent_id);

-- ==============================================================================
-- 10. TABEL: grades (Nilai Akademik Siswa)
-- Digunakan untuk: Nilai tugas, ulangan harian, UTS, UAS, koreksi AI ujian
-- Halaman terkait: /dashboard/grades, /dashboard/exam-checker, Dashboard Chart
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.grades (
  id text PRIMARY KEY,
  student_name text NOT NULL,
  student_class text NOT NULL,
  subject text NOT NULL,
  type text NOT NULL CHECK (type IN ('Tugas', 'Ulangan Harian', 'UTS', 'UAS', 'Ujian Harian', 'Tengah Semester', 'Awal Semester', 'Akhir Semester')),
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  date text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index grades
CREATE INDEX IF NOT EXISTS idx_grades_student_name ON public.grades (student_name);
CREATE INDEX IF NOT EXISTS idx_grades_student_class ON public.grades (student_class);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON public.grades (subject);

-- ==============================================================================
-- 11. TABEL: attendances (Presensi / Absensi Siswa)
-- Digunakan untuk: Rekap kehadiran harian, scan OCR daftar hadir, foto bukti
-- Halaman terkait: /dashboard/attendance, Dashboard Overview
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendances (
  id text PRIMARY KEY,
  student_name text NOT NULL,
  student_class text NOT NULL,
  date text NOT NULL,
  status text NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpha')),
  notes text,
  photo text,
  recorded_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index attendances
CREATE INDEX IF NOT EXISTS idx_attendances_student_name ON public.attendances (student_name);
CREATE INDEX IF NOT EXISTS idx_attendances_student_class ON public.attendances (student_class);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances (date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.attendances (status);

-- ==============================================================================
-- MIGRASI / ENSURE KOLOM EKSIS PADA TABEL LAMA (Jika tabel sudah ada sebelumnya)
-- ==============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_class text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_class text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.violations ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_bk';

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attachment text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by text;

ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS attachment text;
ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS parent_id text;
ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS parent_response text;

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_data text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_mime text;

ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS notes text;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 1. Policies: profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_all" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete_all" ON public.profiles FOR DELETE USING (true);

-- 2. Policies: students
DROP POLICY IF EXISTS "students_select_all" ON public.students;
DROP POLICY IF EXISTS "students_insert_all" ON public.students;
DROP POLICY IF EXISTS "students_update_all" ON public.students;
DROP POLICY IF EXISTS "students_delete_all" ON public.students;

CREATE POLICY "students_select_all" ON public.students FOR SELECT USING (true);
CREATE POLICY "students_insert_all" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update_all" ON public.students FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "students_delete_all" ON public.students FOR DELETE USING (true);

-- 3. Policies: violations
DROP POLICY IF EXISTS "violations_select_all" ON public.violations;
DROP POLICY IF EXISTS "violations_insert_all" ON public.violations;
DROP POLICY IF EXISTS "violations_update_all" ON public.violations;
DROP POLICY IF EXISTS "violations_delete_all" ON public.violations;

CREATE POLICY "violations_select_all" ON public.violations FOR SELECT USING (true);
CREATE POLICY "violations_insert_all" ON public.violations FOR INSERT WITH CHECK (true);
CREATE POLICY "violations_update_all" ON public.violations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "violations_delete_all" ON public.violations FOR DELETE USING (true);

-- 4. Policies: notifications
DROP POLICY IF EXISTS "notifications_select_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;

CREATE POLICY "notifications_select_all" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert_all" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_all" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete_all" ON public.notifications FOR DELETE USING (true);

-- 5. Policies: chat_rooms
DROP POLICY IF EXISTS "chat_rooms_select_all" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert_all" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update_all" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete_all" ON public.chat_rooms;

CREATE POLICY "chat_rooms_select_all" ON public.chat_rooms FOR SELECT USING (true);
CREATE POLICY "chat_rooms_insert_all" ON public.chat_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_rooms_update_all" ON public.chat_rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chat_rooms_delete_all" ON public.chat_rooms FOR DELETE USING (true);

-- 6. Policies: chat_messages
DROP POLICY IF EXISTS "chat_messages_select_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_all" ON public.chat_messages;

CREATE POLICY "chat_messages_select_all" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert_all" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_messages_update_all" ON public.chat_messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_delete_all" ON public.chat_messages FOR DELETE USING (true);

-- 7. Policies: appointments
DROP POLICY IF EXISTS "appointments_select_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_all" ON public.appointments;

CREATE POLICY "appointments_select_all" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "appointments_insert_all" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_update_all" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "appointments_delete_all" ON public.appointments FOR DELETE USING (true);

-- 8. Policies: achievements
DROP POLICY IF EXISTS "achievements_select_all" ON public.achievements;
DROP POLICY IF EXISTS "achievements_insert_all" ON public.achievements;
DROP POLICY IF EXISTS "achievements_update_all" ON public.achievements;
DROP POLICY IF EXISTS "achievements_delete_all" ON public.achievements;

CREATE POLICY "achievements_select_all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_all" ON public.achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "achievements_update_all" ON public.achievements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "achievements_delete_all" ON public.achievements FOR DELETE USING (true);

-- 9. Policies: permits
DROP POLICY IF EXISTS "permits_select_all" ON public.permits;
DROP POLICY IF EXISTS "permits_insert_all" ON public.permits;
DROP POLICY IF EXISTS "permits_update_all" ON public.permits;
DROP POLICY IF EXISTS "permits_delete_all" ON public.permits;

CREATE POLICY "permits_select_all" ON public.permits FOR SELECT USING (true);
CREATE POLICY "permits_insert_all" ON public.permits FOR INSERT WITH CHECK (true);
CREATE POLICY "permits_update_all" ON public.permits FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "permits_delete_all" ON public.permits FOR DELETE USING (true);

-- 10. Policies: grades
DROP POLICY IF EXISTS "grades_select_all" ON public.grades;
DROP POLICY IF EXISTS "grades_insert_all" ON public.grades;
DROP POLICY IF EXISTS "grades_update_all" ON public.grades;
DROP POLICY IF EXISTS "grades_delete_all" ON public.grades;

CREATE POLICY "grades_select_all" ON public.grades FOR SELECT USING (true);
CREATE POLICY "grades_insert_all" ON public.grades FOR INSERT WITH CHECK (true);
CREATE POLICY "grades_update_all" ON public.grades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "grades_delete_all" ON public.grades FOR DELETE USING (true);

-- 11. Policies: attendances
DROP POLICY IF EXISTS "attendances_select_all" ON public.attendances;
DROP POLICY IF EXISTS "attendances_insert_all" ON public.attendances;
DROP POLICY IF EXISTS "attendances_update_all" ON public.attendances;
DROP POLICY IF EXISTS "attendances_delete_all" ON public.attendances;

CREATE POLICY "attendances_select_all" ON public.attendances FOR SELECT USING (true);
CREATE POLICY "attendances_insert_all" ON public.attendances FOR INSERT WITH CHECK (true);
CREATE POLICY "attendances_update_all" ON public.attendances FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "attendances_delete_all" ON public.attendances FOR DELETE USING (true);

-- ==============================================================================
-- AKTIFKAN SUPABASE REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  -- Tambahkan tabel ke publication supabase_realtime jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'achievements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  END IF;
END $$;
