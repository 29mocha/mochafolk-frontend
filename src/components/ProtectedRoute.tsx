// src/components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Jangan lakukan apa-apa selagi status login masih diperiksa
    if (isLoading) return;

    // Jika tidak ada token, arahkan ke halaman login
    if (!accessToken) {
      router.push('/login');
    }
  }, [accessToken, isLoading, router]);

  // Jika sudah login, tampilkan halaman yang diminta
  if (accessToken) {
    return <>{children}</>;
  }

  // Tampilkan null atau halaman loading selagi proses redirect
  return null;
}