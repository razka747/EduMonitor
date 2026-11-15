import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const envPath = '.env.local';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Gagal: SUPABASE_URL atau SUPABASE_SECRET_KEY belum ada di .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_TEACHERS = [
  {
    name: 'Budi Pratama, S.Pd (Demo)',
    email: 'guru.demo1@school.id',
    password: 'guru123456',
    role: 'teacher',
    subject: 'Matematika',
    home_class: '7.1',
  },
  {
    name: 'Siti Rahmawati, M.Pd (Demo)',
    email: 'guru.demo2@school.id',
    password: 'guru123456',
    role: 'teacher',
    subject: 'Bahasa Indonesia',
    home_class: '8.1',
  },
];

async function seedDemoTeachers() {
  console.log('🚀 MEMBUAT 2 AKUN DEMO GURU DI SUPABASE...\n');

  try {
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    for (const teacher of DEMO_TEACHERS) {
      console.log(`----------------------------------------`);
      console.log(`Memproses: ${teacher.name} (${teacher.email})`);

      let existingUser = userList.users.find(u => u.email?.toLowerCase() === teacher.email.toLowerCase());
      let userId = existingUser ? existingUser.id : null;

      if (!existingUser) {
        console.log('1️⃣ Mendaftarkan ke Supabase Auth (Auto-Confirmed)...');
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: teacher.email,
          password: teacher.password,
          email_confirm: true,
          user_metadata: {
            name: teacher.name,
            role: teacher.role,
            subject: teacher.subject,
            home_class: teacher.home_class,
            is_demo: true,
          },
        });

        if (createError) throw createError;
        userId = newUser.user.id;
        console.log('   ✅ Akun Auth dibuat. UID:', userId);
      } else {
        console.log('1️⃣ User Auth sudah ada. Memperbarui password & confirm...');
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: teacher.password,
          email_confirm: true,
          user_metadata: {
            name: teacher.name,
            role: teacher.role,
            subject: teacher.subject,
            home_class: teacher.home_class,
            is_demo: true,
          },
        });
        console.log('   ✅ User Auth diperbarui. UID:', userId);
      }

      console.log('2️⃣ Menyimpan data ke tabel public.profiles...');
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: userId,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
          subject: teacher.subject,
          home_class: teacher.home_class,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;
      console.log('   ✅ Profil guru berhasil disimpan ke database!');
    }

    console.log(`\n========================================`);
    console.log(`🎉 2 AKUN DEMO GURU BERHASIL DIBUAT!`);
    console.log(`========================================`);
  } catch (err) {
    console.error('❌ Gagal membuat akun demo:', err.message || err);
    process.exit(1);
  }
}

seedDemoTeachers();
