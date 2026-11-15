'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/app/lib/store';
import Sidebar from '@/app/components/Sidebar';
import TopBar from '@/app/components/TopBar';
import RealtimeListener from '@/app/components/RealtimeListener';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, checkSession } = useAppStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!currentUser) {
        await checkSession();
      }
      setIsChecking(false);
    };
    init();
  }, [checkSession, currentUser]);

  useEffect(() => {
    if (!isChecking && !currentUser) {
      router.push('/');
    }
  }, [currentUser, router, isChecking]);

  if (isChecking || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted animate-pulse">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <RealtimeListener />
      <Sidebar />
      <div className="lg:ml-[260px] pb-28 lg:pb-6">
        <TopBar />
        <main className="p-4 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
