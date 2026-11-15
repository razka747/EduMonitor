'use client';

import type { User } from './types';

export const DEMO_MAX_RESPONSES_PER_FEATURE = 5;

export const DEMO_TEACHER_ACCOUNTS = [
  {
    name: 'Budi Pratama, S.Pd (Demo)',
    email: 'guru.demo1@school.id',
    password: 'guru123456',
    role: 'teacher' as const,
    subject: 'Matematika',
    homeClass: '7.1',
    description: 'Wali Kelas 7.1 • Guru Matematika',
  },
  {
    name: 'Siti Rahmawati, M.Pd (Demo)',
    email: 'guru.demo2@school.id',
    password: 'guru123456',
    role: 'teacher' as const,
    subject: 'Bahasa Indonesia',
    homeClass: '8.1',
    description: 'Wali Kelas 8.1 • Guru B. Indonesia',
  },
];

/**
 * Cek apakah user yang sedang aktif adalah akun demo
 */
export function isDemoUser(user: { email?: string; id?: string } | null | undefined): boolean {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  return (
    email === 'guru.demo1@school.id' ||
    email === 'guru.demo2@school.id' ||
    email.includes('.demo') ||
    email.startsWith('demo.') ||
    email.includes('guru.demo')
  );
}

/**
 * Dapatkan statistik pemakaian kuota demo untuk fitur tertentu hari ini
 */
export function getDemoUsage(userIdOrEmail: string, featureKey: string): {
  count: number;
  remaining: number;
  max: number;
  allowed: boolean;
} {
  if (typeof window === 'undefined') {
    return { count: 0, remaining: DEMO_MAX_RESPONSES_PER_FEATURE, max: DEMO_MAX_RESPONSES_PER_FEATURE, allowed: true };
  }
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `demo_usage_${userIdOrEmail}_${featureKey}_${today}`;
  const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const remaining = Math.max(0, DEMO_MAX_RESPONSES_PER_FEATURE - current);
  return {
    count: current,
    remaining,
    max: DEMO_MAX_RESPONSES_PER_FEATURE,
    allowed: current < DEMO_MAX_RESPONSES_PER_FEATURE,
  };
}

/**
 * Tambah hitungan pemakaian kuota demo untuk fitur tertentu hari ini
 */
export function recordDemoUsage(userIdOrEmail: string, featureKey: string): {
  success: boolean;
  count: number;
  remaining: number;
} {
  if (typeof window === 'undefined') {
    return { success: true, count: 0, remaining: DEMO_MAX_RESPONSES_PER_FEATURE };
  }
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `demo_usage_${userIdOrEmail}_${featureKey}_${today}`;
  const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
  if (current >= DEMO_MAX_RESPONSES_PER_FEATURE) {
    return { success: false, count: current, remaining: 0 };
  }
  const newCount = current + 1;
  localStorage.setItem(storageKey, newCount.toString());
  // Dispatch custom event agar komponen UI kuota langsung terupdate
  window.dispatchEvent(new CustomEvent('demo_usage_updated', { detail: { featureKey, count: newCount } }));
  return {
    success: true,
    count: newCount,
    remaining: DEMO_MAX_RESPONSES_PER_FEATURE - newCount,
  };
}

/**
 * Verifikasi dan catat aksi demo. Jika kuota habis, lemparkan error ramah pengguna.
 */
export function enforceDemoLimit(user: User | null | undefined, featureKey: string, featureLabel: string): void {
  if (!isDemoUser(user)) return;
  const userIdentifier = user?.email || user?.id || 'demo_user';
  const { allowed } = getDemoUsage(userIdentifier, featureKey);
  if (!allowed) {
    const errorMsg = `Batas demo tercapai: Akun demo hanya dapat membuat maksimal ${DEMO_MAX_RESPONSES_PER_FEATURE} respon di fitur ${featureLabel} per hari. Silakan coba fitur lain atau gunakan akun resmi.`;
    alert(errorMsg);
    throw new Error(errorMsg);
  }
  recordDemoUsage(userIdentifier, featureKey);
}
