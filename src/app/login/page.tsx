// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      if (err instanceof Error)
        setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ParticleBackground />
      <div className="min-h-screen text-gray-200 relative">
        <header className="absolute top-0 left-0 z-20 p-4 sm:p-6">
          <img src="/logo/logo3.png" alt="MochaFolk Logo" className="h-24 sm:h-32 w-auto" />
        </header>

        <main className="relative z-10 flex items-center justify-center min-h-screen bg-transparent p-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <div className="w-full max-w-md p-8 space-y-4">
            <h1 className="text-3xl font-bold text-center text-white" style={{ fontFamily: 'Amatic SC, cursive', fontSize: '3rem', letterSpacing: '2px' }}>
              Pager Online Login
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-300 block mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A47E65] text-white"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-300 block mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A47E65] text-white"
                  required
                />
              </div>
              {error && <p className="text-sm text-center text-red-400">{error}</p>}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-2 bg-[#A47E65] hover:opacity-90 text-white font-bold rounded-md transition-opacity disabled:bg-gray-500 border border-gray-600"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>

            <div className="text-center text-sm text-gray-400 pt-2 space-y-2">
              <p>
                Belum punya akun?{' '}
                <Link href="/register" className="font-medium text-[#A47E65] hover:underline">
                  Daftar di sini
                </Link>
              </p>
               {/* Link Lupa Password ditambahkan di sini */}
              <p>
                <Link href="/forgot-password" className="font-medium text-[#A47E65] hover:underline">
                  Lupa Password?
                </Link>
              </p>
              <button onClick={() => setIsModalOpen(true)} className="text-xs text-gray-500 hover:underline">
                How to use
              </button>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-[#1c1c1c] text-gray-300 p-8 rounded-lg max-w-lg w-full mx-4 border border-gray-700">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Amatic SC, cursive' }}>
              Cara Menggunakan <span style={{ color: '#A47E65' }}>MochaFolk</span>
            </h2>
            <div className="space-y-3 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <p>1. <span className="font-semibold">Daftar & Login:</span> Buat akun untuk coffee shop Anda, lalu login ke dasbor pemilik.</p>
              <p>2. <span className="font-semibold">Download QR Code:</span> Di dasbor, unduh QR Code unik untuk toko Anda dan letakkan di kasir.</p>
              <p>3. <span className="font-semibold">Pelanggan Scan:</span> Pelanggan memindai QR Code setelah membayar untuk mendapatkan nomor antrian digital di ponsel mereka.</p>
              <p>4. <span className="font-semibold">Kelola Antrian:</span> Gunakan "Dasbor Barista" untuk melihat antrian masuk dan menandai pesanan sebagai "Siap" jika sudah selesai.</p>
              <p>5. <span className="font-semibold">Notifikasi Instan:</span> Pelanggan akan menerima notifikasi visual dan suara saat pesanan mereka siap diambil. Sederhana dan efisien!</p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-6 w-full py-2 px-4 bg-[#A47E65] hover:opacity-90 text-white font-semibold rounded-md"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
