// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ParticleBackground from '@/components/ParticleBackground';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/password-reset/', { email });
      setMessage(response.data.message);
    } catch (err) {
      setError('Gagal mengirim email. Periksa kembali alamat email Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-sm p-8 space-y-4">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white font-amatic tracking-wider mb-6">
                Reset Password
            </h1>
        </div>

        {/* Tampilkan pesan sukses jika ada */}
        {message ? (
          <div className="text-center bg-green-800/50 border border-green-700 p-4 rounded-lg">
            <p className="text-green-200">{message}</p>
            <p className="text-green-300 text-sm mt-2">Silakan periksa terminal backend Anda untuk melihat email yang dikirim.</p>
             <Link href="/login" className="font-medium text-amber-400 hover:underline mt-4 inline-block">
                Kembali ke Login
              </Link>
          </div>
        ) : (
          // Tampilkan form jika belum ada pesan
          <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-center text-sm text-gray-400">
                Masukkan alamat email Anda untuk menerima link reset password.
              </p>
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

              {error && <p className="text-sm text-center text-red-400">{error}</p>}

              <div>
                  <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 bg-amber-600/80 hover:bg-amber-700/80 border border-amber-500/50 rounded-lg text-white font-semibold transition duration-300 disabled:bg-gray-600"
                  >
                      {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                  </button>
              </div>
          </form>
        )}
      </div>
    </main>
  );
}
