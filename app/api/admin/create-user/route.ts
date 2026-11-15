import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client tidak terkonfigurasi. Pastikan SUPABASE_SECRET_KEY ada di .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, subject, homeClass, childName, childClass } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Data tidak lengkap. Nama, email, password, dan role wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Cek apakah nama sudah digunakan di profiles
    const { data: existingName } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingName) {
      return NextResponse.json({ error: 'Nama ini sudah digunakan. Silakan gunakan nama lain.' }, { status: 400 });
    }

    // 2. Cek apakah email sudah terdaftar di auth.users
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    let userId: string;

    if (existingAuth) {
      userId = existingAuth.id;
      // Perbarui password dan pastikan status email confirmed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: { name: cleanName, role }
      });
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else {
      // Buat user auth baru dengan auto-confirm email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: cleanName, role }
      });

      if (authError || !authData.user) {
        return NextResponse.json({ error: authError?.message || 'Gagal membuat akun user auth.' }, { status: 400 });
      }

      userId = authData.user.id;
    }

    // 3. Simpan data profil ke tabel public.profiles
    const { error: profError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: role,
      subject: subject || null,
      home_class: homeClass || null,
      child_name: childName || null,
      child_class: childClass || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (profError) {
      return NextResponse.json({ error: profError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        role,
        subject: subject || undefined,
        homeClass: homeClass || undefined,
        childName: childName || undefined,
        childClass: childClass || undefined
      }
    });
  } catch (err: any) {
    console.error('API create-user error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
