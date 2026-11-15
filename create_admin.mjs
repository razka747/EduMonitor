
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Helper parse file .env.local tanpa dependensi eksternal
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

// Inisialisasi Supabase Admin Client dengan Service Role Key
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Ambil argumen dari command line jika user memberikan argumen kustom:
// Contoh: node create_admin.mjs admin@sekolah.id password123 "Admin Utama"
const args = process.argv.slice(2);
const email = args[0] || 'admin@school.id';
const password = args[1] || 'admin123456';
const name = args[2] || 'Admin Utama';

async function createAdmin() {
  console.log(`\n========================================`);
  console.log(`🚀 MEMBUAT AKUN ADMIN EDU-MONITOR`);
  console.log(`========================================`);
  console.log(`Email    : ${email}`);
  console.log(`Password : ${password}`);
  console.log(`Nama     : ${name}`);
  console.log(`Role     : admin\n`);

  try {
    // 1. Cek apakah user auth sudah ada di Supabase
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    let existingUser = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    let userId = existingUser ? existingUser.id : null;

    if (!existingUser) {
      console.log('1️⃣ Mendaftarkan user ke Supabase Auth (Auto-Confirmed)...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Otomatis terkonfirmasi tanpa verifikasi email
        user_metadata: { name, role: 'admin' },
      });

      if (createError) throw createError;
      userId = newUser.user.id;
      console.log('   ✅ Akun Auth berhasil dibuat. UID:', userId);
    } else {
      console.log('1️⃣ User Auth sudah ada di Supabase. UID:', userId);
      // Update password & confirm
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      });
      console.log('   ✅ Password akun Auth berhasil disinkronkan.');
    }

    // 2. Simpan / Perbarui data di tabel profiles
    console.log('2️⃣ Menyimpan data ke tabel public.profiles dengan role "admin"...');
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        name: name,
        email: email,
        role: 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) throw profileError;
    console.log('   ✅ Data profil admin berhasil disimpan ke tabel profiles!');

    console.log(`\n========================================`);
    console.log(`🎉 AKUN ADMIN BERHASIL DISIAPKAN!`);
    console.log(`========================================`);
    console.log(`Anda sekarang dapat langsung login di website menggunakan:`);
    console.log(`👉 Email / Username : ${email} atau "${name}"`);
    console.log(`👉 Password         : ${password}\n`);
  } catch (err) {
    console.error('❌ Terjadi kesalahan:', err.message || err);
    process.exit(1);
  }
}

createAdmin();
