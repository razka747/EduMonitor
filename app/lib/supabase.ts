import { createClient } from '@supabase/supabase-js';

// 1. SUPABASE URL (Endpoint utama API Supabase)
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

// 2. SUPABASE PUBLISHABLE KEY (Kunci akses publik / anon untuk Client / Browser)
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

// 3. SUPABASE SECRET KEY (Kunci rahasia Service Role untuk Server / Backend API)
export const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

// 4. SUPABASE JWKS URL (Endpoint verifikasi token JSON Web Key Set)
export const supabaseJwksUrl =
  process.env.SUPABASE_JWKS_URL ||
  (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : '');

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('⚠️ SUPABASE_URL atau SUPABASE_PUBLISHABLE_KEY belum terpasang di .env.local');
} else {
  console.log('✅ Supabase konfigurasi terdeteksi:', supabaseUrl);
}

/**
 * Supabase Client Standar (Frontend / Client-Side)
 * Digunakan untuk: Operasi login/register, query data tabel dengan Row Level Security (RLS),
 * dan Realtime subscription di browser.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

/**
 * Supabase Admin Client (Backend / Server-Side Only)
 * Digunakan untuk: Operasi sistem/admin pada Server Component, API Routes, atau Cron job
 * yang membutuhkan bypass RLS menggunakan SUPABASE_SECRET_KEY.
 */
export const supabaseAdmin = typeof window === 'undefined' && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Helper function untuk mengecek apakah konfigurasi Supabase sudah terpasang
export const isSupabaseConfigured = () => {
  return supabaseUrl !== '' && supabasePublishableKey !== '';
};
