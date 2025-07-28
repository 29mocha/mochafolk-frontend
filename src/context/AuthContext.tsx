// src/context/AuthContext.tsx
'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode

// Definisikan tipe untuk data di dalam token
interface DecodedToken {
  username: string;
  role: 'OWNER' | 'STAFF';
  shop_id: number;
}

// Definisikan tipe data untuk konteks
interface AuthContextType {
  accessToken: string | null;
  userRole: 'OWNER' | 'STAFF' | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'OWNER' | 'STAFF' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      setAccessToken(token);
      setUserRole(decoded.role);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/token/', {
        username,
        password,
      });
      // --- PERBARUI BAGIAN INI ---
      const { access, refresh } = response.data; // Ambil refresh token juga
      
      const decoded: DecodedToken = jwtDecode(access);
      
      setAccessToken(access);
      setUserRole(decoded.role);
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh); // Simpan refresh token
      // -----------------------------
      
      if (decoded.role === 'OWNER') {
        router.push('/owner/dashboard');
      } else if (decoded.role === 'STAFF') {
        router.push(`/dashboard/${decoded.shop_id}`);
      } else {
        router.push('/login');
      }

    } catch (error) {
      console.error('Login gagal:', error);
      throw new Error('Username atau password salah.');
    }
  };

  const logout = () => {
    setAccessToken(null);
    setUserRole(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken'); // Hapus refresh token juga
    router.push('/login');
  };
  return (
    <AuthContext.Provider value={{ accessToken, userRole, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}