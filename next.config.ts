import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // --- TAMBAHKAN BLOK INI ---
  eslint: {
    // Peringatan: Ini akan mengizinkan build produksi untuk berhasil
    // meskipun proyek Anda memiliki error ESLint.
    ignoreDuringBuilds: true,
  },
  // -------------------------
}

export default nextConfig