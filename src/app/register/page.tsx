// src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // State untuk email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/register/', {
        username,
        password,
        email, // Pastikan email dikirim
      });

      await login(username, password);

    } catch (err: unknown) {
      // KUNCI PERBAIKAN: Cek apakah error berasal dari Axios
      if (axios.isAxiosError(err) && err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.username) {
          setError(errorData.username[0]);
        } else if (errorData.email) {
          setError(errorData.email[0]);
        } else {
          setError('Gagal melakukan registrasi. Coba username lain.');
        }
      } else {
        setError('Gagal melakukan registrasi. Periksa koneksi Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <ParticleBackground />

      {/* Logo di pojok kiri atas */}
      <header className="absolute top-0 left-0 p-4 sm:p-6 z-20">
          <img src="/logo/logo3.png" alt="MochaFolk Logo" className="h-24 sm:h-32 w-auto"/>
      </header>

      <div className="relative z-10 w-full max-w-md p-8 space-y-4">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white font-amatic tracking-wider">
                Buat Akun Baru
            </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Username"
                    required
                />
            </div>
            {/* Input untuk Email (wajib) */}
            <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Email"
                    required
                />
            </div>
            <div>
                <label htmlFor="password"className="sr-only">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Password"
                    required
                />
            </div>
            <div>
                <label htmlFor="confirmPassword"className="sr-only">Konfirmasi Password</label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Konfirmasi Password"
                    required
                />
            </div>

            {error && <p className="text-sm text-center text-red-400">{error}</p>}

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-amber-600/80 hover:bg-amber-700/80 border border-amber-500/50 rounded-lg text-white font-semibold transition duration-300 disabled:bg-gray-600"
                >
                    {loading ? 'Mendaftarkan...' : 'Daftar'}
                </button>
            </div>
        </form>
        <p className="text-center text-sm text-gray-400">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-amber-400 hover:underline">
            Login di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
