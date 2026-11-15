import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

// Baca file .env.local jika ada
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
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Gagal: SUPABASE_URL atau SUPABASE_SECRET_KEY belum ada di .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

// Daftar 33 Kelas: 7.1 - 7.11, 8.1 - 8.11, 9.1 - 9.11
const CLASSES = [
  ...Array.from({ length: 11 }, (_, i) => `7.${i + 1}`),
  ...Array.from({ length: 11 }, (_, i) => `8.${i + 1}`),
  ...Array.from({ length: 11 }, (_, i) => `9.${i + 1}`),
];

// Bank Nama Indonesia Beragam & Realistis
const FIRST_NAMES = [
  'Aditya', 'Ahmad', 'Aisyah', 'Alif', 'Amanda', 'Ananda', 'Andika', 'Angga', 'Anisa', 'Aqila',
  'Arif', 'Arya', 'Aulia', 'Azzahra', 'Bagus', 'Bintang', 'Budi', 'Cahya', 'Cantika', 'Citra',
  'Damar', 'Danendra', 'Daffa', 'Daniel', 'Dava', 'Dea', 'Denny', 'Devi', 'Dimas', 'Dina',
  'Dwi', 'Fadhil', 'Fajar', 'Farhan', 'Fathir', 'Fauzan', 'Febri', 'Fitri', 'Galih', 'Gilang',
  'Gita', 'Hafiz', 'Hanif', 'Hendra', 'Ilham', 'Indah', 'Intan', 'Iqbal', 'Irfan', 'Kurniawan',
  'Lestari', 'Maulana', 'Mega', 'Melati', 'Muhammad', 'Nabila', 'Nadia', 'Naufal', 'Nia', 'Novita',
  'Nurul', 'Panji', 'Pratama', 'Putra', 'Putri', 'Rafi', 'Rahma', 'Raihan', 'Rama', 'Rangga',
  'Rani', 'Rian', 'Rifki', 'Rini', 'Rizky', 'Roni', 'Salsabila', 'Satria', 'Septian', 'Siti',
  'Surya', 'Syahrul', 'Taufik', 'Tiara', 'Tri', 'Vina', 'Wahyu', 'Wawan', 'Winda', 'Yogi',
  'Yoga', 'Yulia', 'Yusuf', 'Zahra', 'Zaki', 'Zulfa'
];

const LAST_NAMES = [
  'Adriansyah', 'Agustina', 'Akbar', 'Anggraini', 'Anwar', 'Ardian', 'Arifin', 'Astuti', 'Azizah',
  'Budiman', 'Cahyani', 'Darmawan', 'Dewi', 'Fadilah', 'Gunawan', 'Hakim', 'Handayani', 'Hariyanto',
  'Hartono', 'Hasanah', 'Hidayat', 'Irawan', 'Iskandar', 'Kusuma', 'Kurnia', 'Laksana', 'Lestari',
  'Maharani', 'Mansur', 'Mahendra', 'Mulyadi', 'Nasution', 'Nugraha', 'Nugroho', 'Oktaviani', 'Pamungkas',
  'Pasaribu', 'Permana', 'Prabowo', 'Prakoso', 'Prasetya', 'Prasetyo', 'Pratama', 'Purnama', 'Purnomo',
  'Putra', 'Putri', 'Rahayu', 'Rahmawati', 'Ramadhan', 'Riyadi', 'Rohman', 'Rosadi', 'Safitri',
  'Santoso', 'Saputra', 'Saputri', 'Sari', 'Setiawan', 'Siregar', 'Subagyo', 'Suharto', 'Sukma',
  'Sulistyo', 'Susanto', 'Sutrisno', 'Syahputra', 'Tanjung', 'Utami', 'Wahab', 'Wahyudi', 'Wibowo',
  'Widodo', 'Wijaya', 'Wulandari', 'Yulianto', 'Zulkarnaen'
];

function generateStudents() {
  const students = [];
  const usedNamesPerClass = new Map();

  for (const className of CLASSES) {
    usedNamesPerClass.set(className, new Set());
    let count = 0;

    while (count < 40) {
      const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const fullName = `${fn} ${ln}`;

      const classSet = usedNamesPerClass.get(className);
      if (!classSet.has(fullName)) {
        classSet.add(fullName);
        count++;
        students.push({
          id: crypto.randomUUID(),
          name: fullName,
          class: className,
        });
      }
    }
  }

  return students;
}

async function runSeed() {
  console.log('====================================================');
  console.log('🚀 SEEDING 1,320 SISWA (40 Siswa / Kelas x 33 Kelas)');
  console.log('====================================================');
  console.log(`Kelas : 7.1 s/d 9.11 (Total ${CLASSES.length} Kelas)`);

  const { count: currentCount } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true });

  console.log(`Jumlah siswa saat ini di Supabase: ${currentCount || 0}`);

  if (currentCount && currentCount >= 1320) {
    console.log('✅ Database sudah memiliki 1,320 siswa (40 siswa/kelas)!');
    console.log('Menjalankan pengecekan verifikasi per kelas...');
    
    // Verifikasi kelengkapan per kelas
    let allValid = true;
    for (const c of CLASSES) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class', c);
      if (count !== 40) {
        console.log(`⚠️ Kelas ${c} memiliki ${count} siswa (kurang dari 40). Memerlukan perbaikan...`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('🎉 SELURUH 33 KELAS TELAH TERVERIFIKASI MEMILIKI MASING-MASING 40 SISWA LENGKAP!');
      return;
    }
  }

  console.log('\nMembuat data siswa baru...');
  const allStudents = generateStudents();
  console.log(`Total siswa digenerate: ${allStudents.length}`);

  // Hapus data lama agar bersih
  console.log('Membersihkan tabel students lama...');
  await supabaseAdmin.from('students').delete().neq('id', 'keep-all');

  // Insert dalam batch 200 data
  const BATCH_SIZE = 200;
  for (let i = 0; i < allStudents.length; i += BATCH_SIZE) {
    const batch = allStudents.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin.from('students').insert(batch);
    if (error) {
      console.error(`❌ Gagal insert batch ${i} - ${i + batch.length}:`, error.message);
    } else {
      console.log(`✅ Berhasil insert ${i + batch.length}/${allStudents.length} siswa`);
    }
  }

  console.log('\n🎉 SEEDING SELESAI DENGAN SUKSES!');
}

runSeed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
