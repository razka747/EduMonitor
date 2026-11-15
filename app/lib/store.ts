'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Violation, Notification, ChatMessage, ChatRoom, Appointment, Achievement, Student, Permit, Grade, Attendance } from './types';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { enforceDemoLimit, isDemoUser } from '@/app/lib/demoLimit';

// Demo data - Users removed (now only from Supabase)

// Demo data - All removed (now only from Supabase)

interface AppState {
  currentUser: User | null;
  users: User[];
  violations: Violation[];
  notifications: Notification[];
  chatRooms: ChatRoom[];
  chatMessages: ChatMessage[];
  appointments: Appointment[];
  achievements: Achievement[];
  students: Student[];
  permits: Permit[];
  grades: Grade[];
  sidebarOpen: boolean;
  attendances: Attendance[];
  monitoredStudent: Student | null;
  setMonitoredStudent: (student: Student | null) => void;

  login: (emailOrUsername: string, password: string) => Promise<User | null>;
  register: (user: Omit<User, 'id'>, password: string) => Promise<User | null>;
  createUserByAdmin: (user: Omit<User, 'id'>, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  setSidebarOpen: (open: boolean) => void;

  // New sync function
  syncFromSupabase: () => Promise<void>;
  checkSession: () => Promise<void>;
  addViolation: (violation: Omit<Violation, 'id' | 'status'>) => Promise<void>;
  validateViolation: (id: string, status: 'validated' | 'rejected') => Promise<void>;
  deleteViolation: (id: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getUnreadNotificationCount: () => number;
  deleteAllNotifications: () => Promise<void>;

  sendMessage: (message: Omit<ChatMessage, 'id'>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markRoomAsRead: (roomId: string) => Promise<void>;
  getMessagesForRoom: (roomId: string) => ChatMessage[];

  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addAchievement: (achievement: Omit<Achievement, 'id'>) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;
  addPermit: (permit: Omit<Permit, 'id'>) => Promise<void>;
  updatePermitStatus: (id: string, status: Permit['status'], response?: string) => Promise<void>;
  deletePermit: (id: string) => Promise<void>;
  fetchStudents: () => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student | null>;
  updateStudent: (id: string, student: Partial<Omit<Student, 'id'>>) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  addGrade: (grade: Omit<Grade, 'id'>) => Promise<void>;
  deleteGrade: (id: string) => Promise<void>;

  addAttendance: (attendance: Omit<Attendance, 'id'>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  deleteAttendances: (ids: string[]) => Promise<void>;

  setupRealtime: () => (() => void) | void;
  assignHomeroomTeacher: (teacherId: string, className: string) => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      violations: [],
      notifications: [],
      chatRooms: [],
      chatMessages: [],
      appointments: [],
      achievements: [],
      students: [],
      permits: [],
      grades: [],
      attendances: [],
      sidebarOpen: true,
      monitoredStudent: null,

      login: async (emailOrUsername: string, password: string) => {
        let resolvedEmail = emailOrUsername;

        if (isSupabaseConfigured()) {
          try {
            console.log('Resolving email or username for:', emailOrUsername);
            // Search in profiles where email matches or name (username) matches case-insensitively
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .or(`email.eq.${emailOrUsername},name.ilike.${emailOrUsername}`)
              .maybeSingle();

            if (profileData?.email) {
              resolvedEmail = profileData.email;
              console.log('Resolved to email:', resolvedEmail);
            }
          } catch (searchErr) {
            console.error('Failed to resolve email from username:', searchErr);
          }
        } else {
          // Demo/offline mode
          const { users } = get();
          const user = users.find(u =>
            u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
            u.name.toLowerCase() === emailOrUsername.toLowerCase()
          );
          if (user) {
            set({ currentUser: user });
            return user;
          }
          return null;
        }

        try {
          console.log('Mencoba login dengan email:', resolvedEmail);
          let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password,
          });

          // Jika Supabase menolak karena "Email not confirmed", auto-confirm via server API lalu coba lagi
          if (authError && (authError.message?.toLowerCase().includes('email not confirmed') || (authError as any).code === 'email_not_confirmed')) {
            console.warn('Auto-confirming email on the fly for:', resolvedEmail);
            try {
              const confirmRes = await fetch('/api/auth/auto-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resolvedEmail })
              });
              if (confirmRes.ok) {
                const retry = await supabase.auth.signInWithPassword({
                  email: resolvedEmail,
                  password,
                });
                authData = retry.data;
                authError = retry.error;
              }
            } catch (confirmErr) {
              console.error('Auto-confirm retry error:', confirmErr);
            }
          }

          if (authError) {
            console.error('Supabase Auth Error:', authError.message);
            throw authError;
          }

          if (!authData.user) return null;

          console.log('Auth berhasil, ID:', authData.user.id);

          // Fetch profile
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profError) {
            console.error('Supabase Profile Error:', profError.message);
            return null;
          }

          console.log('Profile ditemukan:', profile.role);

          const user: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            avatar: profile.avatar || undefined,
            childName: profile.child_name,
            childClass: profile.child_class,
            subject: profile.subject,
            homeClass: profile.home_class,
          };

          set({ currentUser: user });
          return user;
        } catch (err: any) {
          console.error('Login catch error:', err.message || err);
          return null;
        }
      },

      register: async (userData: Omit<User, 'id'>, password: string) => {
        if (!isSupabaseConfigured()) {
          const id = `user-${Date.now()}`;
          const newUser: User = { ...userData, id };
          set(state => ({
            users: [...state.users, newUser],
            currentUser: newUser,
          }));
          return newUser;
        }

        try {
          // Check if name is already taken (case-insensitive)
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .ilike('name', userData.name)
            .maybeSingle();

          if (existingUser) {
            throw new Error('Nama ini sudah digunakan. Silakan gunakan nama lain.');
          }

          // 1. Buat user auth dan profil langsung di Supabase via server API
          // Ini menjamin akun langsung tersimpan di auth.users (email confirmed) dan public.profiles
          const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userData, password })
          });
          const result = await res.json();
          if (!res.ok || !result.success) {
            throw new Error(result.error || 'Gagal mendaftarkan akun ke Supabase.');
          }

          const id = result.user.id;
          const newUser: User = { ...userData, id };

          // 2. Lakukan login resmi ke Supabase Auth agar sesi browser aktif
          try {
            await get().login(userData.email, password);
          } catch (loginErr) {
            console.warn('Auto-login after register warning:', loginErr);
          }

          // Auto-setup chats for parents and teachers
          const targetClass = userData.role === 'parent' ? userData.childClass : userData.role === 'teacher' ? userData.homeClass : null;

          if (targetClass) {
            const classRoomName = `Grup Kelas ${targetClass}`;
            const canonicalGroupId = `group-${targetClass}`;

            // Ambil semua user yang valid untuk kelas ini
            const { data: existingUsers } = await supabase
              .from('profiles')
              .select('id, name, role, child_class, home_class, child_name')
              .or(`child_class.eq.${targetClass},home_class.eq.${targetClass}`);

            const validUserIds = existingUsers
              ?.filter(u =>
                (u.role === 'parent' && u.child_class === targetClass) ||
                (u.role === 'teacher' && u.home_class === targetClass)
              )
              .map(u => u.id) || [];

            // Tambahkan user yang baru register jika belum termasuk
            if (!validUserIds.includes(id)) {
              validUserIds.push(id);
            }

            // Upsert: buat baru atau update participants jika sudah ada
            await supabase.from('chat_rooms').upsert({
              id: canonicalGroupId,
              name: classRoomName,
              type: 'group',
              participants: validUserIds,
              unread_count: 0
            }, { onConflict: 'id' });

            // Jika orang tua baru mendaftar, dan sudah ada walas di kelas ini, buat private room & pesan sambutan
            if (userData.role === 'parent') {
              const homeroomTeacher = existingUsers?.find(u => u.role === 'teacher' && u.home_class === targetClass);
              if (homeroomTeacher) {
                const privateId = `private-${[id, homeroomTeacher.id].sort().join('-')}`;
                const welcomeTime = new Date().toISOString();
                const childInfo = userData.childName ? ` (Orang tua dari ${userData.childName})` : '';
                const welcomeText = `Halo Bapak/Ibu ${userData.name}${childInfo}. Saya ${homeroomTeacher.name}, wali kelas untuk Kelas ${targetClass}. Silakan hubungi saya di sini jika ada hal yang ingin dikonsultasikan terkait ananda di sekolah.`;

                await supabase.from('chat_rooms').upsert({
                  id: privateId,
                  name: `Wali Kelas & ${userData.name}`,
                  type: 'private',
                  participants: [homeroomTeacher.id, id],
                  last_message: welcomeText,
                  last_message_time: welcomeTime,
                  unread_count: 0
                }, { onConflict: 'id' });

                await supabase.from('chat_messages').insert({
                  id: `msg-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  chat_room_id: privateId,
                  sender_id: homeroomTeacher.id,
                  sender_name: homeroomTeacher.name,
                  sender_role: 'teacher',
                  message: welcomeText,
                  timestamp: welcomeTime,
                });
              }
            }
          }

          set({ currentUser: newUser });
          // Sinkronisasi data agar chat room baru langsung muncul
          await get().syncFromSupabase();
          return newUser;
        } catch (err: any) {
          console.error('Register error:', err);
          throw err;
        }
      },

      createUserByAdmin: async (userData: Omit<User, 'id'>, password: string) => {
        try {
          const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userData, password })
          });
          const result = await res.json();
          if (!res.ok || !result.success) {
            throw new Error(result.error || 'Gagal menambahkan akun.');
          }

          const newUser: User = result.user;

          // Tambahkan ke state users lokal tanpa mengganti currentUser admin
          set(state => ({
            users: [...state.users.filter(u => u.id !== newUser.id), newUser]
          }));

          // Jika guru memiliki kelas binaan, hubungkan langsung
          if (newUser.role === 'teacher' && newUser.homeClass) {
            await get().assignHomeroomTeacher(newUser.id, newUser.homeClass);
          }

          // Sinkronisasi data dari Supabase agar state users dan chat selalu up-to-date
          await get().syncFromSupabase();

          return newUser;
        } catch (err: any) {
          console.error('createUserByAdmin error:', err);
          throw err;
        }
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Error during Supabase signOut:', e);
          }
        }
        // Bersihkan state agar tidak ada data bocor ke user selanjutnya
        set({
          currentUser: null,
          monitoredStudent: null,
          violations: [],
          notifications: [],
          chatRooms: [],
          chatMessages: [],
          appointments: [],
          achievements: [],
          students: [],
          permits: [],
          grades: [],
          attendances: []
        });

        // Hapus juga localStorage secara eksplisit agar bersih
        if (typeof window !== 'undefined') {
          localStorage.removeItem('school-monitor-storage');
        }
      },

      resetPassword: async (email: string) => {
        if (!isSupabaseConfigured()) {
          // Demo/offline mode simulation
          console.log('Reset password request for offline user:', email);
          return true;
        }
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/`,
          });
          if (error) throw error;
          return true;
        } catch (err) {
          console.error('Reset password error:', err);
          throw err;
        }
      },

      updatePassword: async (password: string) => {
        const currentUser = get().currentUser;
        if (currentUser && isDemoUser(currentUser)) {
          throw new Error('Akun demo tidak dapat mengganti kata sandi.');
        }
        if (!isSupabaseConfigured()) {
          console.log('Simulating offline password update:', password);
          return true;
        }
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          return true;
        } catch (err) {
          console.error('Update password error:', err);
          throw err;
        }
      },

      syncFromSupabase: async () => {
        if (!isSupabaseConfigured()) return;

        // Bersihkan localStorage lama jika masih ada data besar yang tersimpan
        // (migrasi dari versi lama yang menyimpan semua data ke localStorage)
        try {
          const stored = localStorage.getItem('school-monitor-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const state = parsed?.state || {};
            const hasLargeData = state.violations?.length > 0 || state.chatMessages?.length > 0
              || state.attendances?.length > 0 || state.grades?.length > 0;
            if (hasLargeData) {
              // Hapus storage lama, biarkan persist hanya simpan currentUser + sidebarOpen
              localStorage.removeItem('school-monitor-storage');
              console.log('[store] localStorage lama dibersihkan (migrasi dari versi lama)');
            }
          }
        } catch {
          // Ignore cleanup errors
        }


        // Fetch all relevant data to sync local state concurrently to massively speed up refresh time
        const [
          { data: profiles },
          { data: violations },
          { data: notifications },
          { data: appointments },
          { data: achievements, error: achievementsError },
          { data: permits, error: permitsError },
          { data: chatRooms },
          { data: chatMessages },
          { data: attendances },
          { data: students },
          { data: gradesData, error: gradesError }
        ] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('violations').select('*'),
          supabase.from('notifications').select('*'),
          supabase.from('appointments').select('*'),
          supabase.from('achievements').select('*'),
          supabase.from('permits').select('*'),
          supabase.from('chat_rooms').select('*'),
          supabase.from('chat_messages').select('*'),
          supabase.from('attendances').select('*'),
          supabase.from('students').select('*').order('name', { ascending: true }),
          supabase.from('grades').select('*')
        ]);

        if (profiles) {
          set({
            users: profiles.map(p => ({
              id: p.id,
              name: p.name,
              email: p.email,
              role: p.role,
              avatar: p.avatar || undefined,
              childName: p.child_name,
              childClass: p.child_class,
              subject: p.subject,
              homeClass: p.home_class
            }))
          });
        }

        if (violations) set({
          violations: violations.map(v => ({
            id: v.id,
            studentName: v.student_name,
            studentClass: v.student_class,
            violationType: v.violation_type,
            description: v.description,
            severity: v.severity,
            photo: v.photo_url,
            date: v.date,
            reportedBy: v.reported_by,
            status: v.status as any
          }))
        });

        // (students fetched in Promise.all)

        if (students) {
          if (students.length >= 1000) {
            // PostgREST membatasi 1000 per request. Jalankan fetchStudents chunking agar semua 1320+ terambil
            get().fetchStudents();
          } else {
            set({
              students: students.map(s => ({
                id: s.id,
                name: s.name,
                class: s.class
              }))
            });
          }
        }

        if (notifications) set({
          notifications: notifications.map(n => ({
            id: n.id,
            targetUserId: n.target_user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            relatedId: n.related_id,
            read: n.read,
            date: n.date
          }))
        });

        if (appointments) set({
          appointments: appointments.map(a => ({
            id: a.id,
            parentId: a.parent_id,
            parentName: a.parent_name,
            teacherId: a.teacher_id,
            teacherName: a.teacher_name,
            date: a.date,
            time: a.time,
            purpose: a.purpose,
            status: a.status,
            location: a.location,
            attachment: a.attachment,
            attachmentName: a.attachment_name,
            createdBy: a.created_by,
          }))
        });

        if (attendances) set({
          attendances: attendances.map(a => ({
            id: a.id,
            studentName: a.student_name,
            studentClass: a.student_class,
            date: a.date,
            status: a.status,
            notes: a.notes,
            photo: a.photo,
            recordedBy: a.recorded_by
          }))
        });

        // Hanya timpa state jika tidak ada error. Jika error (misal RLS block),
        // pertahankan data yang sudah ada di local state agar tidak hilang.
        if (achievements && !achievementsError) {
          set({
            achievements: achievements.map(a => ({
              id: a.id,
              studentName: a.student_name,
              studentClass: a.student_class,
              title: a.title,
              description: a.description,
              date: a.date,
              category: a.category
            }))
          });
        } else if (achievementsError) {
          console.error('Achievements RLS/fetch error (data dipertahankan):', achievementsError.message);
        }

        if (permits && !permitsError) {
          set({
            permits: permits.map(p => ({
              id: p.id,
              studentName: p.student_name,
              studentClass: p.student_class,
              type: p.type,
              reason: p.reason,
              date: p.date,
              startDate: p.start_date,
              endDate: p.end_date,
              attachment: p.attachment,
              attachmentName: p.attachment_name,
              status: p.status,
              createdBy: p.created_by,
              createdByName: p.created_by_name,
              parentId: p.parent_id,
              parentResponse: p.parent_response
            }))
          });
        } else if (permitsError) {
          console.error('Permits fetch error:', permitsError.message);
        }

        // (grades fetched in Promise.all)
        if (gradesData && !gradesError) {
          set({
            grades: gradesData.map(g => ({
              id: g.id,
              studentName: g.student_name,
              studentClass: g.student_class,
              subject: g.subject,
              type: g.type,
              score: g.score,
              date: g.date,
              createdBy: g.created_by
            }))
          });
        } else if (gradesError) {
          console.error('Grades fetch error:', gradesError.message);
        }

        if (chatRooms) {
          // Deduplicate rooms by name and type to prevent UI duplicates
          const uniqueRoomsMap = new Map();
          chatRooms.forEach(r => {
            const key = r.type === 'group' ? `group-${r.name}` : r.id;
            // Jika ada duplicate group, kita simpan yang pertama kali muncul
            if (!uniqueRoomsMap.has(key)) {
              uniqueRoomsMap.set(key, {
                id: r.id,
                name: r.name,
                type: r.type as any,
                participants: r.participants || [],
                lastMessage: r.last_message,
                lastMessageTime: r.last_message_time,
                unreadCount: r.unread_count
              });
            }
          });

          const mappedRooms = Array.from(uniqueRoomsMap.values());
          set({ chatRooms: mappedRooms });

          // AUTO-RECOVERY: Pastikan user terdaftar di grup kelas mereka
          const currentUser = get().currentUser;
          if (currentUser) {
            const targetClass = currentUser.role === 'parent' ? currentUser.childClass : currentUser.role === 'teacher' ? currentUser.homeClass : null;
            if (targetClass) {
              const groupName = `Grup Kelas ${targetClass}`;
              const canonicalGroupId = `group-${targetClass}`;
              const existingGroup = mappedRooms.find(r => r.id === canonicalGroupId);

              if (!existingGroup) {
                // Grup belum ada sama sekali, buat baru
                console.log('Auto-recovery: Membuat grup kelas yang hilang...', groupName);
                try {
                  const { data: existingUsers } = await supabase
                    .from('profiles')
                    .select('id, role, child_class, home_class')
                    .or(`child_class.eq.${targetClass},home_class.eq.${targetClass}`);

                  const validUserIds = existingUsers
                    ?.filter(u =>
                      (u.role === 'parent' && u.child_class === targetClass) ||
                      (u.role === 'teacher' && u.home_class === targetClass)
                    )
                    .map(u => u.id) || [];

                  if (!validUserIds.includes(currentUser.id)) validUserIds.push(currentUser.id);

                  await supabase.from('chat_rooms').upsert({
                    id: canonicalGroupId,
                    name: groupName,
                    type: 'group',
                    participants: validUserIds,
                    unread_count: 0
                  }, { onConflict: 'id' });

                  // Fetch ulang chat rooms setelah create
                  const { data: newRooms } = await supabase.from('chat_rooms').select('*');
                  if (newRooms) {
                    set({
                      chatRooms: newRooms.map(r => ({
                        id: r.id, name: r.name, type: r.type as any,
                        participants: r.participants || [],
                        lastMessage: r.last_message, lastMessageTime: r.last_message_time,
                        unreadCount: r.unread_count
                      }))
                    });
                  }
                } catch (err) {
                  console.error('Auto-recovery gagal:', err);
                }
              } else if (!existingGroup.participants.includes(currentUser.id)) {
                // Grup ada tapi user belum terdaftar, tambahkan
                console.log('Auto-recovery: Menambahkan user ke grup...', groupName);
                const newParticipants = [...existingGroup.participants, currentUser.id];
                await supabase.from('chat_rooms')
                  .update({ participants: newParticipants })
                  .eq('id', canonicalGroupId);
                set({ chatRooms: mappedRooms.map(r => r.id === canonicalGroupId ? { ...r, participants: newParticipants } : r) });
              }
            }

            // AUTO-SETUP GRUP KHUSUS GURU & ADMIN
            if (currentUser.role === 'admin' || currentUser.role === 'teacher' || currentUser.role === 'bk') {
              const staffGroupId = 'group-teachers-admin';
              const staffGroupName = 'Grup Guru & Admin';
              const existingStaffGroup = mappedRooms.find(r => r.id === staffGroupId);

              try {
                const { data: staffProfiles } = await supabase
                  .from('profiles')
                  .select('id')
                  .in('role', ['admin', 'teacher', 'bk']);

                const staffIds = staffProfiles?.map(u => u.id) || [];
                if (!staffIds.includes(currentUser.id)) staffIds.push(currentUser.id);

                if (!existingStaffGroup) {
                  await supabase.from('chat_rooms').upsert({
                    id: staffGroupId,
                    name: staffGroupName,
                    type: 'group',
                    participants: staffIds,
                    unread_count: 0
                  }, { onConflict: 'id' });
                } else if (!existingStaffGroup.participants.includes(currentUser.id)) {
                  const updatedStaffIds = [...new Set([...existingStaffGroup.participants, ...staffIds])];
                  await supabase.from('chat_rooms')
                    .update({ participants: updatedStaffIds })
                    .eq('id', staffGroupId);
                }
              } catch (staffErr) {
                console.error('Error auto-setup staff group:', staffErr);
              }
            }
          }
        }


        if (chatMessages) set({
          chatMessages: chatMessages.map(m => ({
            id: m.id,
            chatRoomId: m.chat_room_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role as any,
            message: m.message,
            timestamp: m.timestamp,
            attachmentType: m.attachment_type || undefined,
            attachmentData: m.attachment_data || undefined,
            attachmentName: m.attachment_name || undefined,
            attachmentMime: m.attachment_mime || undefined
          }))
        });
      },

      setupRealtime: () => {
        if (!isSupabaseConfigured()) return;

        const channel = supabase
          .channel('realtime-chat')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
              const newMsg = payload.new as any;

              // Cek apakah pesan sudah ada di state (untuk menghindari duplikasi jika pengirim)
              set((state) => {
                if (state.chatMessages.some(m => m.id === newMsg.id)) return state;

                return {
                  chatMessages: [...state.chatMessages, {
                    id: newMsg.id,
                    chatRoomId: newMsg.chat_room_id,
                    senderId: newMsg.sender_id,
                    senderName: newMsg.sender_name,
                    senderRole: newMsg.sender_role,
                    message: newMsg.message,
                    timestamp: newMsg.timestamp,
                    attachmentType: newMsg.attachment_type || undefined,
                    attachmentData: newMsg.attachment_data || undefined,
                    attachmentName: newMsg.attachment_name || undefined,
                    attachmentMime: newMsg.attachment_mime || undefined
                  }]
                };
              });
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },

      // ── Assign guru sebagai walikelas ──────────────────────────────────────
      assignHomeroomTeacher: async (teacherId: string, className: string) => {
        if (!isSupabaseConfigured()) return;
        try {
          // 1. Update home_class di profil guru
          const targetClass = className.trim() || null;
          await supabase.from('profiles').update({ home_class: targetClass }).eq('id', teacherId);

          // 2. Update state lokal profil user
          set(state => ({
            users: state.users.map(u =>
              u.id === teacherId ? { ...u, homeClass: targetClass || undefined } : u
            )
          }));

          if (!targetClass) {
            return;
          }

          const canonicalGroupId = `group-${targetClass}`;
          const groupName = `Grup Kelas ${targetClass}`;

          // 3. Ambil data profil guru
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', teacherId)
            .single();
          const teacherName = teacherProfile?.name || 'Wali Kelas';

          // 4. Ambil semua orang tua di kelas tersebut
          const { data: parentsInClass } = await supabase
            .from('profiles')
            .select('id, name, child_name')
            .eq('role', 'parent')
            .eq('child_class', targetClass);

          const parentList = parentsInClass || [];
          const parentIds = parentList.map(p => p.id);
          const allParticipants = [...new Set([...parentIds, teacherId])];

          // 5. Upsert grup kelas (buat atau update participants)
          await supabase.from('chat_rooms').upsert({
            id: canonicalGroupId,
            name: groupName,
            type: 'group',
            participants: allParticipants,
            unread_count: 0,
          }, { onConflict: 'id' });

          // 6. Buat private room dan kirim pesan pembuka otomatis dari walas ke setiap orang tua
          const welcomeTime = new Date().toISOString();
          const newMessagesToAdd: ChatMessage[] = [];

          for (const parent of parentList) {
            const privateId = `private-${[teacherId, parent.id].sort().join('-')}`;
            const childInfo = parent.child_name ? ` (Orang tua dari ${parent.child_name})` : '';
            const welcomeText = `Halo Bapak/Ibu ${parent.name}${childInfo}. Saya ${teacherName}, wali kelas untuk Kelas ${targetClass}. Silakan hubungi saya di sini jika ada hal yang ingin dikonsultasikan terkait perkembangan ananda di sekolah.`;

            // Cek apakah sudah pernah ada pesan di room ini
            const { data: existingMsgs } = await supabase
              .from('chat_messages')
              .select('id')
              .eq('chat_room_id', privateId)
              .limit(1);

            const hasExisting = existingMsgs && existingMsgs.length > 0;

            await supabase.from('chat_rooms').upsert({
              id: privateId,
              name: `Wali Kelas & ${parent.name}`,
              type: 'private',
              participants: [teacherId, parent.id],
              last_message: hasExisting ? undefined : welcomeText,
              last_message_time: hasExisting ? undefined : welcomeTime,
              unread_count: 0,
            }, { onConflict: 'id' });

            // Jika belum ada pesan, kirim pesan sambutan agar langsung tampil di chat orang tua
            if (!hasExisting) {
              const msgId = `msg-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              await supabase.from('chat_messages').insert({
                id: msgId,
                chat_room_id: privateId,
                sender_id: teacherId,
                sender_name: teacherName,
                sender_role: 'teacher',
                message: welcomeText,
                timestamp: welcomeTime,
              });

              newMessagesToAdd.push({
                id: msgId,
                chatRoomId: privateId,
                senderId: teacherId,
                senderName: teacherName,
                senderRole: 'teacher',
                message: welcomeText,
                timestamp: welcomeTime,
              });
            }
          }

          // 7. Refresh chatRooms dan tambahkan pesan baru ke state
          const { data: freshRooms } = await supabase.from('chat_rooms').select('*');
          if (freshRooms) {
            set(state => ({
              chatRooms: freshRooms.map(r => ({
                id: r.id,
                name: r.name,
                type: r.type as any,
                participants: r.participants || [],
                lastMessage: r.last_message,
                lastMessageTime: r.last_message_time,
                unreadCount: r.unread_count,
              })),
              chatMessages: [...state.chatMessages, ...newMessagesToAdd.filter(nm => !state.chatMessages.some(m => m.id === nm.id))]
            }));
          }
        } catch (err) {
          console.error('assignHomeroomTeacher error:', err);
          throw err;
        }
      },

      // ── Update profil user (admin) ─────────────────────────────────────────
      updateUserProfile: async (userId: string, data: Partial<User>) => {
        if (!isSupabaseConfigured()) return;
        const dbData: Record<string, any> = {};
        if (data.name !== undefined) dbData.name = data.name;
        if (data.email !== undefined) dbData.email = data.email;
        if (data.role !== undefined) dbData.role = data.role;
        if (data.avatar !== undefined) dbData.avatar = data.avatar;
        if (data.subject !== undefined) dbData.subject = data.subject;
        if (data.homeClass !== undefined) dbData.home_class = data.homeClass;
        if (data.childClass !== undefined) dbData.child_class = data.childClass;
        if (data.childName !== undefined) dbData.child_name = data.childName;

        await supabase.from('profiles').update(dbData).eq('id', userId);
        set(state => ({
          users: state.users.map(u => u.id === userId ? { ...u, ...data } : u),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...data } : state.currentUser
        }));
      },

      fetchStudents: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const all: Student[] = [];
          let from = 0;
          const batchSize = 1000;
          while (true) {
            const { data, error } = await supabase
              .from('students')
              .select('*')
              .order('name', { ascending: true })
              .range(from, from + batchSize - 1);
            if (error || !data || data.length === 0) break;
            all.push(...data.map(s => ({ id: s.id, name: s.name, class: s.class })));
            if (data.length < batchSize) break;
            from += batchSize;
          }
          if (all.length > 0) {
            set({ students: all });
          }
        } catch (err) {
          console.error('Error fetching students:', err);
        }
      },

      addStudent: async (studentData: Omit<Student, 'id'>) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}`;
        const newStudent: Student = { ...studentData, id };

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('students').insert({
            id: newStudent.id,
            name: newStudent.name,
            class: newStudent.class
          });
          if (error) {
            console.error('Error adding student:', error);
            return null;
          }
        }

        set(state => ({ students: [newStudent, ...state.students] }));
        return newStudent;
      },

      updateStudent: async (id: string, updateData: Partial<Omit<Student, 'id'>>) => {
        set(state => ({
          students: state.students.map(s => s.id === id ? { ...s, ...updateData } : s)
        }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('students').update(updateData).eq('id', id);
          if (error) {
            console.error('Error updating student:', error);
            await get().fetchStudents();
            return false;
          }
        }
        return true;
      },

      deleteStudent: async (id: string) => {
        const prev = get().students.find(s => s.id === id);
        set(state => ({
          students: state.students.filter(s => s.id !== id)
        }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('students').delete().eq('id', id);
          if (error) {
            console.error('Error deleting student:', error);
            if (prev) set(state => ({ students: [...state.students, prev] }));
            return false;
          }
        }
        return true;
      },

      checkSession: async () => {
        if (!isSupabaseConfigured()) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Jika ada session tapi currentUser kosong (karena refresh), ambil profilnya
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const user: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              avatar: profile.avatar || undefined,
              childName: profile.child_name,
              childClass: profile.child_class,
              subject: profile.subject,
              homeClass: profile.home_class,
            };
            set({ currentUser: user });
            // Setelah dapet user, langsung sinkron data
            await get().syncFromSupabase();
          }
        }
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      setMonitoredStudent: (student: Student | null) => {
        set({ monitoredStudent: student });
      },

      addViolation: async (violationData: Omit<Violation, 'id' | 'status'>) => {
        enforceDemoLimit(get().currentUser, 'violations', 'Pelanggaran Siswa');
        const id = `v-${Date.now()}`;
        const newViolation: Violation = { ...violationData, id, status: 'pending_bk' };
        set(state => ({ violations: [newViolation, ...state.violations] }));

        if (isSupabaseConfigured()) {
          // Simpan ke database dengan status pending_bk
          await supabase.from('violations').insert({
            id: newViolation.id,
            student_name: newViolation.studentName,
            student_class: newViolation.studentClass,
            violation_type: newViolation.violationType,
            description: newViolation.description,
            severity: newViolation.severity,
            photo_url: newViolation.photo,
            date: newViolation.date,
            reported_by: newViolation.reportedBy,
            status: 'pending_bk'
          });

          // Notifikasi ke semua Guru BK dan Admin
          const { users } = get();
          const approvers = users.filter(u => u.role === 'bk' || u.role === 'admin');

          for (const approver of approvers) {
            await get().addNotification({
              title: '📋 Validasi Pelanggaran Baru',
              message: `Guru melaporkan pelanggaran oleh ${newViolation.studentName} (${newViolation.studentClass}): ${newViolation.violationType}. Mohon periksa dan validasi.`,
              date: new Date().toISOString(),
              read: false,
              type: 'violation',
              targetUserId: approver.id,
              relatedId: newViolation.id
            });
          }
        }
      },

      validateViolation: async (id: string, status: 'validated' | 'rejected') => {
        enforceDemoLimit(get().currentUser, 'violations', 'Validasi Pelanggaran');
        set(state => ({
          violations: state.violations.map(v => v.id === id ? { ...v, status } : v)
        }));

        if (isSupabaseConfigured()) {
          await supabase.from('violations').update({ status }).eq('id', id);

          if (status === 'validated') {
            let violation = get().violations.find(v => v.id === id);

            // Jika tidak ada di store, ambil dari Supabase
            if (!violation) {
              const { data } = await supabase.from('violations').select('*').eq('id', id).single();
              if (data) {
                violation = {
                  id: data.id,
                  studentName: data.student_name,
                  studentClass: data.student_class,
                  violationType: data.violation_type,
                  description: data.description,
                  severity: data.severity,
                  photo: data.photo_url,
                  date: data.date,
                  reportedBy: data.reported_by,
                  status: data.status,
                };
              }
            }

            if (violation) {
              // Notifikasi ke Orang Tua hanya setelah divalidasi BK/Admin
              const { users } = get();
              const parentUsers = users.filter(
                u => u.role === 'parent' &&
                  u.childName?.toLowerCase() === violation!.studentName.toLowerCase()
              );

              for (const parent of parentUsers) {
                await get().addNotification({
                  title: `⚠️ Pelanggaran Divalidasi: ${violation.violationType}`,
                  message: `${violation.studentName} (${violation.studentClass}) terkonfirmasi melakukan pelanggaran: ${violation.description}`,
                  date: new Date().toISOString(),
                  read: false,
                  type: 'violation',
                  targetUserId: parent.id,
                  relatedId: violation.id,
                });
              }
            }
          }
        }
      },

      deleteViolation: async (id: string) => {
        // Hapus violation & notifikasi terkait dari local state sekaligus
        set(state => ({
          violations: state.violations.filter(v => v.id !== id),
          notifications: state.notifications.filter(n => n.relatedId !== id),
        }));

        if (isSupabaseConfigured()) {
          // Hapus violation dari DB
          const { error } = await supabase.from('violations').delete().eq('id', id);
          if (error) {
            console.error("Error deleting violation:", error);
            // Revert on error
            await get().syncFromSupabase();
            return;
          }
          // Hapus semua notifikasi yang berkaitan dengan violation ini
          const { error: notifError } = await supabase
            .from('notifications')
            .delete()
            .eq('related_id', id);
          if (notifError) {
            console.error("Error deleting related notifications:", notifError);
          }
        }
      },

      addNotification: async (notifData: Omit<Notification, 'id'>) => {
        const id = `n-${Date.now()}`;
        const newNotif: Notification = { ...notifData, id };

        const { currentUser } = get();
        if (currentUser && currentUser.id === newNotif.targetUserId) {
          set(state => ({ notifications: [newNotif, ...state.notifications] }));
        }

        if (isSupabaseConfigured()) {
          await supabase.from('notifications').insert({
            id: newNotif.id,
            target_user_id: newNotif.targetUserId,
            title: newNotif.title,
            message: newNotif.message,
            type: newNotif.type,
            related_id: newNotif.relatedId,
            read: newNotif.read,
            date: newNotif.date
          });
        }
      },

      deleteNotification: async (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('notifications').delete().eq('id', id);
          if (error) console.error('Error deleting notification:', error);
        }
      },

      deleteAllNotifications: async () => {
        const { currentUser, notifications } = get();
        if (!currentUser) return;

        set({
          notifications: notifications.filter(n => n.targetUserId !== currentUser.id)
        });

        if (isSupabaseConfigured()) {
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('target_user_id', currentUser.id);
          if (error) console.error('Error deleting all notifications:', error);
        }
      },

      markNotificationRead: async (id: string) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));

        if (isSupabaseConfigured()) {
          await supabase.from('notifications').update({ read: true }).eq('id', id);
        }
      },

      markAllNotificationsRead: async () => {
        const { currentUser, notifications } = get();
        if (!currentUser) return;
        set({
          notifications: notifications.map(n =>
            n.targetUserId === currentUser.id ? { ...n, read: true } : n
          ),
        });

        if (isSupabaseConfigured()) {
          await supabase.from('notifications').update({ read: true }).eq('target_user_id', currentUser.id);
        }
      },

      getUnreadNotificationCount: () => {
        const { currentUser, notifications } = get();
        if (!currentUser) return 0;
        return notifications.filter(n => n.targetUserId === currentUser.id && !n.read).length;
      },

      sendMessage: async (msgData: Omit<ChatMessage, 'id'>) => {
        enforceDemoLimit(get().currentUser, 'chat', 'Pesan Obrolan');
        const id = `msg-${Date.now()}`;
        const newMsg: ChatMessage = { ...msgData, id };
        set(state => ({
          chatMessages: [...state.chatMessages, newMsg],
          chatRooms: state.chatRooms.map(r =>
            r.id === msgData.chatRoomId
              ? { ...r, lastMessage: msgData.message, lastMessageTime: msgData.timestamp }
              : r
          ),
        }));

        if (isSupabaseConfigured()) {
          try {
            // KHUSUS CHAT PRIBADI: Pastikan room ada di tabel chat_rooms agar RLS mengizinkan baca
            if (msgData.chatRoomId.startsWith('private-')) {
              // Extract the two UUIDs (UUIDs are 36 chars long)
              const idsStr = msgData.chatRoomId.replace('private-', '');
              if (idsStr.length === 73) { // 36 + 1 (hyphen) + 36
                const id1 = idsStr.substring(0, 36);
                const id2 = idsStr.substring(37);
                // Gunakan upsert agar jika sudah ada tetap update last_message-nya
                await supabase.from('chat_rooms').upsert({
                  id: msgData.chatRoomId,
                  name: 'Private Chat',
                  type: 'private',
                  participants: [id1, id2],
                  last_message: msgData.message,
                  last_message_time: msgData.timestamp,
                }, { onConflict: 'id' });
              }
            } else {
              // Update last_message untuk grup
              await supabase.from('chat_rooms').update({
                last_message: msgData.message,
                last_message_time: msgData.timestamp
              }).eq('id', msgData.chatRoomId);
            }

            await supabase.from('chat_messages').insert({
              id: id,
              chat_room_id: msgData.chatRoomId,
              sender_id: msgData.senderId,
              sender_name: msgData.senderName,
              sender_role: msgData.senderRole,
              message: msgData.message,
              timestamp: msgData.timestamp,
              attachment_type: msgData.attachmentType || null,
              attachment_data: msgData.attachmentData || null,
              attachment_name: msgData.attachmentName || null,
              attachment_mime: msgData.attachmentMime || null
            });
          } catch (err) {
            console.error('Error sending message:', err);
          }
        }
      },

      getMessagesForRoom: (roomId: string) => {
        return get().chatMessages.filter(m => m.chatRoomId === roomId);
      },

      deleteMessage: async (messageId: string) => {
        set(state => ({
          chatMessages: state.chatMessages.filter(m => m.id !== messageId)
        }));

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('chat_messages').delete().eq('id', messageId);
          } catch (err) {
            console.error('Error deleting message:', err);
          }
        }
      },

      markRoomAsRead: async (roomId: string) => {
        set(state => ({
          chatRooms: state.chatRooms.map(r =>
            r.id === roomId ? { ...r, unreadCount: 0 } : r
          )
        }));

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('chat_rooms').update({ unread_count: 0 }).eq('id', roomId);
          } catch (err) {
            console.error('Error marking room as read:', err);
          }
        }
      },

      addAppointment: async (aptData: Omit<Appointment, 'id'>) => {
        enforceDemoLimit(get().currentUser, 'appointments', 'Janji Temu');
        const id = `apt-${Date.now()}`;
        const newApt: Appointment = { ...aptData, id };
        set(state => ({ appointments: [newApt, ...state.appointments] }));

        const currentUser = get().currentUser;
        if (!currentUser) return;

        // If a parent created it, notify the teacher. If a teacher/admin created it, notify the parent.
        const targetUserId = currentUser.role === 'parent' ? aptData.teacherId : aptData.parentId;
        const senderName = currentUser.role === 'parent' ? aptData.parentName : aptData.teacherName;
        const recipientRole = currentUser.role === 'parent' ? 'guru' : 'orang tua';

        const notif: Notification = {
          id: `n-${Date.now()}-apt`,
          title: '📅 Janji Temu Baru',
          message: `${senderName} mengundang Anda untuk bertemu pada ${aptData.date} pukul ${aptData.time}.${aptData.location ? ' Tempat: ' + aptData.location : ''} Tujuan: ${aptData.purpose}`,
          date: new Date().toISOString(),
          read: false,
          type: 'appointment',
          targetUserId: targetUserId,
          relatedId: id,
        };
        set(state => ({ notifications: [notif, ...state.notifications] }));

        if (isSupabaseConfigured()) {
          // Insert ke tabel appointments
          const { error: aptError } = await supabase.from('appointments').insert({
            id: newApt.id,
            parent_id: newApt.parentId,
            parent_name: newApt.parentName,
            teacher_id: newApt.teacherId,
            teacher_name: newApt.teacherName,
            date: newApt.date,
            time: newApt.time,
            purpose: newApt.purpose,
            status: newApt.status,
            location: newApt.location,
            attachment: newApt.attachment,
            attachment_name: newApt.attachmentName,
            created_by: newApt.createdBy,
          });

          if (aptError) {
            // Revert state if failed
            set(state => ({ appointments: state.appointments.filter(a => a.id !== id) }));
            console.error('Supabase insert error (appointments):', aptError);
            throw new Error('Gagal menyimpan janji temu ke database. ' + aptError.message);
          }

          // Insert notifikasi ke pihak terkait
          const { error: notifError } = await supabase.from('notifications').insert({
            id: notif.id,
            target_user_id: notif.targetUserId,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            related_id: notif.relatedId,
            read: notif.read,
            date: notif.date
          });

          if (notifError) {
            console.error('Supabase insert error (notifications):', notifError);
          }
        }
      },

      updateAppointmentStatus: async (id: string, status: Appointment['status']) => {
        enforceDemoLimit(get().currentUser, 'appointments', 'Respon Janji Temu');
        const appointment = get().appointments.find(a => a.id === id);

        set(state => ({
          appointments: state.appointments.map(a =>
            a.id === id ? { ...a, status } : a
          ),
        }));

        if (isSupabaseConfigured()) {
          await supabase.from('appointments').update({ status }).eq('id', id);

          if (appointment) {
            // Beri notifikasi ke Orang Tua
            const statusText = status === 'confirmed' ? 'Menerima' : 'Menolak';
            const notif: Notification = {
              id: `n-${Date.now()}-apt-status`,
              title: `📅 Janji Temu ${status === 'confirmed' ? 'Diterima' : 'Ditolak'}`,
              message: `${appointment.teacherName} ${statusText} janji temu Anda pada ${appointment.date} pukul ${appointment.time}.`,
              date: new Date().toISOString(),
              read: false,
              type: 'appointment',
              targetUserId: appointment.parentId,
              relatedId: id,
            };

            set(state => ({ notifications: [notif, ...state.notifications] }));

            await supabase.from('notifications').insert({
              id: notif.id,
              target_user_id: notif.targetUserId,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              related_id: notif.relatedId,
              read: notif.read,
              date: notif.date
            });
          }
        }
      },

      deleteAppointment: async (id: string) => {
        const appointmentToRestore = get().appointments.find(a => a.id === id);
        set(state => ({
          appointments: state.appointments.filter(a => a.id !== id)
        }));

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase.from('appointments').delete().eq('id', id);
            if (error) {
              // Revert optimistic delete
              if (appointmentToRestore) {
                set(state => ({ appointments: [...state.appointments, appointmentToRestore] }));
              }
              console.error('Supabase delete error:', error);
              throw new Error('Gagal menghapus janji temu. ' + error.message);
            }
          } catch (err: any) {
            console.error('Error deleting appointment:', err);
            throw err;
          }
        }
      },

      addAchievement: async (achData: Omit<Achievement, 'id'>) => {
        enforceDemoLimit(get().currentUser, 'achievements', 'Prestasi Siswa');
        const id = `ach-${Date.now()}`;
        const newAch: Achievement = { ...achData, id };
        set(state => ({ achievements: [newAch, ...state.achievements] }));

        if (isSupabaseConfigured()) {
          const { error: insertError } = await supabase.from('achievements').insert({
            id: newAch.id,
            student_name: newAch.studentName,
            student_class: newAch.studentClass,
            title: newAch.title,
            description: newAch.description,
            date: newAch.date,
            category: newAch.category
          });
          if (insertError) {
            console.error('GAGAL menyimpan prestasi ke Supabase:', insertError.message, '| Code:', insertError.code);
            // Rollback local state jika gagal disimpan ke Supabase
            set(state => ({ achievements: state.achievements.filter(a => a.id !== newAch.id) }));
            throw new Error(`Gagal menyimpan prestasi: ${insertError.message}`);
          }
        }

        // Notify parent
        const { users } = get();
        const parentUsers = users.filter(
          u => u.role === 'parent' &&
            u.childName?.toLowerCase() === achData.studentName.toLowerCase()
        );

        for (const parent of parentUsers) {
          await get().addNotification({
            title: `🏆 Prestasi Baru!`,
            message: `Selamat! ${achData.studentName} meraih: ${achData.title}`,
            date: new Date().toISOString(),
            read: false,
            type: 'achievement',
            targetUserId: parent.id,
            relatedId: id,
          });
        }
      },

      deleteAchievement: async (id: string) => {
        // Hapus dari local state
        set(state => ({
          achievements: state.achievements.filter(a => a.id !== id),
          notifications: state.notifications.filter(n => n.relatedId !== id),
        }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('achievements').delete().eq('id', id);
          if (error) {
            console.error('Error deleting achievement:', error);
            // Revert on error
            await get().syncFromSupabase();
            return;
          }
          // Hapus notifikasi terkait
          const { error: notifError } = await supabase
            .from('notifications')
            .delete()
            .eq('related_id', id);
          if (notifError) {
            console.error('Error deleting related notifications:', notifError);
          }
        }
      },

      addPermit: async (permitData: Omit<Permit, 'id'>) => {
        enforceDemoLimit(get().currentUser, 'permits', 'Izin Siswa');
        const id = `permit-${Date.now()}`;
        const newPermit: Permit = { ...permitData, id };
        set(state => ({ permits: [newPermit, ...state.permits] }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('permits').insert({
            id: newPermit.id,
            student_name: newPermit.studentName,
            student_class: newPermit.studentClass,
            type: newPermit.type,
            reason: newPermit.reason,
            date: newPermit.date,
            start_date: newPermit.startDate,
            end_date: newPermit.endDate,
            attachment: newPermit.attachment,
            attachment_name: newPermit.attachmentName,
            status: newPermit.status,
            created_by: newPermit.createdBy,
            created_by_name: newPermit.createdByName,
            parent_id: newPermit.parentId,
          });
          if (error) {
            console.error('Error adding permit:', error.message);
            set(state => ({ permits: state.permits.filter(p => p.id !== newPermit.id) }));
            throw new Error(`Gagal menyimpan izin: ${error.message}`);
          }
        }

        // Kirim notifikasi ke orang tua yang terdaftar untuk siswa ini (hanya jika yang membuat bukan orang tua tersebut)
        if (permitData.parentId && permitData.createdBy !== permitData.parentId) {
          await get().addNotification({
            title: permitData.type === 'sakit' ? '🤒 Laporan Sakit' : permitData.type === 'kegiatan' ? '🏅 Izin Kegiatan' : '📋 Permohonan Izin',
            message: `${permitData.studentName} ${permitData.type === 'sakit' ? 'sakit' : permitData.type === 'kegiatan' ? 'kegiatan' : 'izin'}: ${permitData.reason}`,
            date: new Date().toISOString(),
            read: false,
            type: 'general',
            targetUserId: permitData.parentId,
            relatedId: id,
          });
        }

        // Kirim notifikasi ke admin jika orang tua yang mengajukan
        if (permitData.parentId && permitData.createdBy === permitData.parentId) {
          const admins = get().users.filter(u => u.role === 'admin');
          for (const admin of admins) {
            await get().addNotification({
              title: permitData.type === 'sakit' ? '🤒 Laporan Sakit Baru' : '📋 Permohonan Izin Baru',
              message: `${permitData.studentName} mengajukan ${permitData.type === 'sakit' ? 'sakit' : 'izin'}: ${permitData.reason}`,
              date: new Date().toISOString(),
              read: false,
              type: 'general',
              targetUserId: admin.id,
              relatedId: id,
            });
          }
        }
      },

      updatePermitStatus: async (id: string, status: Permit['status'], response?: string) => {
        enforceDemoLimit(get().currentUser, 'permits', 'Respon Izin Siswa');
        const permit = get().permits.find(p => p.id === id);

        set(state => ({
          permits: state.permits.map(p =>
            p.id === id ? { ...p, status, parentResponse: response } : p
          ),
        }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('permits')
            .update({ status, parent_response: response })
            .eq('id', id);
          if (error) console.error('Error updating permit status:', error);
        }

        // Kirim notifikasi ke pembuat izin (admin/guru) jika orang tua memberikan balasan
        if (response && permit && permit.createdBy) {
          await get().addNotification({
            title: '📩 Balasan Orang Tua',
            message: `Orang tua ${permit.studentName} memberikan balasan izin kegiatan: "${response}"`,
            date: new Date().toISOString(),
            read: false,
            type: 'general',
            targetUserId: permit.createdBy,
            relatedId: id,
          });
        }
      },


      deletePermit: async (id: string) => {
        set(state => ({
          permits: state.permits.filter(p => p.id !== id),
          notifications: state.notifications.filter(n => n.relatedId !== id),
        }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('permits').delete().eq('id', id);
          if (error) {
            console.error('Error deleting permit:', error);
            await get().syncFromSupabase();
            return;
          }
          // Hapus notifikasi terkait
          const { error: notifError } = await supabase
            .from('notifications')
            .delete()
            .eq('related_id', id);
          if (notifError) {
            console.error('Error deleting related notifications:', notifError);
          }
        }
      },

      addGrade: async (gradeData) => {
        enforceDemoLimit(get().currentUser, 'grades', 'Nilai Siswa');
        const id = `grade-${Date.now()}`;
        const newGrade: Grade = { ...gradeData, id };

        set(state => ({ grades: [newGrade, ...state.grades] }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('grades').insert({
            id: newGrade.id,
            student_name: newGrade.studentName,
            student_class: newGrade.studentClass,
            subject: newGrade.subject,
            type: newGrade.type,
            score: newGrade.score,
            date: newGrade.date,
            created_by: newGrade.createdBy
          });

          if (error) {
            console.error('Error adding grade:', error);
            set(state => ({ grades: state.grades.filter(g => g.id !== id) }));
            throw error;
          }
        }

        // Send notification to the parent
        const { users } = get();
        const parentUsers = users.filter(
          u => u.role === 'parent' &&
            u.childName?.toLowerCase() === newGrade.studentName.toLowerCase()
        );

        for (const parent of parentUsers) {
          await get().addNotification({
            title: `📊 Nilai Akademik Baru`,
            message: `Nilai ${newGrade.subject} (${newGrade.type}) untuk ${newGrade.studentName} telah dimasukkan: ${newGrade.score}.`,
            date: new Date().toISOString(),
            read: false,
            type: 'general',
            targetUserId: parent.id,
            relatedId: id,
          });
        }
      },

      deleteGrade: async (id: string) => {
        set(state => ({ grades: state.grades.filter(g => g.id !== id) }));
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('grades').delete().eq('id', id);
          if (error) {
            console.error('Error deleting grade:', error);
            await get().syncFromSupabase();
          }
        }
      },

      addAttendance: async (attendanceData: Omit<Attendance, 'id'>) => {
        enforceDemoLimit(get().currentUser, 'attendance', 'Presensi Siswa');
        const id = `att-${Date.now()}`;
        const newAtt: Attendance = { ...attendanceData, id };

        set(state => ({ attendances: [newAtt, ...state.attendances] }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('attendances').insert({
            id: newAtt.id,
            student_name: newAtt.studentName,
            student_class: newAtt.studentClass,
            date: newAtt.date,
            status: newAtt.status,
            notes: newAtt.notes,
            photo: newAtt.photo,
            recorded_by: newAtt.recordedBy,
          });

          if (error) {
            console.error('Error inserting attendance:', error);
            set(state => ({ attendances: state.attendances.filter(a => a.id !== id) }));
            throw new Error('Gagal menyimpan absen. ' + error.message);
          }
        }
      },

      deleteAttendance: async (id: string) => {
        const backup = get().attendances.find(a => a.id === id);
        set(state => ({ attendances: state.attendances.filter(a => a.id !== id) }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('attendances').delete().eq('id', id);
          if (error) {
            console.error('Error deleting attendance:', error);
            if (backup) set(state => ({ attendances: [...state.attendances, backup] }));
            throw new Error('Gagal menghapus absen. ' + error.message);
          }
        }
      },

      deleteAttendances: async (ids: string[]) => {
        if (ids.length === 0) return;

        const backups = get().attendances.filter(a => ids.includes(a.id));
        set(state => ({ attendances: state.attendances.filter(a => !ids.includes(a.id)) }));

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('attendances').delete().in('id', ids);
          if (error) {
            console.error('Error batch deleting attendances:', error);
            // Restore backups
            set(state => ({ attendances: [...state.attendances, ...backups] }));
            throw new Error('Gagal menghapus beberapa absen. ' + error.message);
          }
        }
      },
    }),
    {
      name: 'school-monitor-storage',
      // ⚠️ Hanya simpan data minimal ke localStorage.
      // Data besar TIDAK disimpan karena localStorage hanya ~5MB
      // dan akan menyebabkan QuotaExceededError.
      // Semua data di-fetch ulang dari Supabase setelah login/refresh.
      partialize: (state) => ({
        currentUser: state.currentUser,
        sidebarOpen: state.sidebarOpen,
        monitoredStudent: state.monitoredStudent,
        users: state.users,
        chatRooms: state.chatRooms,
        chatMessages: state.chatMessages, // save messages so they appear instantly
      }),
    }
  )
);
