import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' hanya untuk Docker; Vercel memakai output bawaannya sendiri
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  env: {
    // Kaitkan variabel lingkungan sesuai fungsi API masing-masing
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || '',
  },
};

export default nextConfig;
