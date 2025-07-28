// src/app/owner/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import DailyCountChart from '@/components/DailyCountChart';
import PeakHoursChart from '@/components/PeakHoursChart';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import axios from 'axios';

// --- Tipe Data ---
interface MyShop { id: number; name: string; address: string | null; logo: string | null; plan: 'BASIC' | 'PRO'; }
interface StaffMember { id: number; username: string; }
interface DailyCountData { date: string; count: number; }
interface AvgWaitTimeData { average_wait_seconds: number; }

// --- Komponen Utama ---
export default function OwnerDashboard() {
  const { accessToken, logout } = useAuth();
  const [shop, setShop] = useState<MyShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAddress, setEditedAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [dailyCountData, setDailyCountData] = useState<DailyCountData[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<number[]>([]);
  const [avgWaitTime, setAvgWaitTime] = useState<AvgWaitTimeData>({ average_wait_seconds: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalyticsData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dailyCountRes, peakHoursRes, avgWaitTimeRes] = await Promise.all([
        api.get('/shops/my-shop/analytics/daily-counts/'),
        api.get('/shops/my-shop/analytics/peak-hours/'),
        api.get('/shops/my-shop/analytics/avg-wait-time/')
      ]);
      setDailyCountData(dailyCountRes.data);
      setPeakHoursData(peakHoursRes.data);
      setAvgWaitTime(avgWaitTimeRes.data);
    } catch (error) {
      console.error("Gagal memuat ulang data analitik:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const fetchInitialData = async () => {
      try {
        const [shopRes, staffRes] = await Promise.all([
          api.get('/shops/my-shop/'),
          api.get('/shops/my-shop/staff/'),
        ]);
        setShop(shopRes.data);
        setEditedName(shopRes.data.name);
        setEditedAddress(shopRes.data.address || '');
        setStaffList(staffRes.data);
        if (shopRes.data.plan === 'PRO') {
          await fetchAnalyticsData();
        }
      } catch (error) {
        console.error("Gagal mengambil data dasbor:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [accessToken, fetchAnalyticsData]);

  const handleShopUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setSuccessMessage('');
    const formData = new FormData();
    formData.append('name', editedName);
    formData.append('address', editedAddress);
    if (logoFile) formData.append('logo', logoFile);
    try {
      const response = await api.patch('/shops/my-shop/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShop(response.data);
      setIsEditing(false);
      setSuccessMessage('Detail toko berhasil diperbarui!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Gagal memperbarui detail toko:", error);
    }
  };

  const handleCancelEdit = () => {
    if (shop) {
      setEditedName(shop.name);
      setEditedAddress(shop.address || '');
    }
    setIsEditing(false);
  };
  
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    try {
      const response = await api.post('/shops/my-shop/add-staff/', {
        username: newStaffUsername,
        password: newStaffPassword,
      });
      setStaffList(prevList => [...prevList, response.data]);
      setNewStaffUsername('');
      setNewStaffPassword('');
    } catch (error: any) {
      setStaffError('Gagal menambah staf. Coba username lain.');
    }
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus staf ini?")) {
      try {
        await api.delete(`/shops/my-shop/staff/${staffId}/delete/`);
        setStaffList(prevList => prevList.filter(staff => staff.id !== staffId));
      } catch (error) {
        alert("Gagal menghapus staf.");
      }
    }
  };
  
  const formatSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes} menit ${seconds} detik`;
  };

  const handleUpgrade = async () => {
    if (confirm("Anda akan diarahkan ke halaman pembayaran untuk upgrade ke paket Pro. Lanjutkan?")) {
      try {
        const response = await api.post('/shops/my-shop/upgrade-midtrans/');
        if (response.data.payment_url) {
          window.location.href = response.data.payment_url;
        }
      } catch (error) {
        alert("Terjadi kesalahan saat memulai proses upgrade.");
      }
    }
  };

  const handleDownloadQRCode = async () => {
    if (!shop) return;
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/shops/${shop.id}/qr-code/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `qr-code-${shop.name.replace(/\s+/g, '-')}.png`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal men-download QR code:", error);
      alert("Gagal men-download QR code.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">Memuat dasbor...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
        <header className="bg-white dark:bg-gray-800 dark:border-b dark:border-gray-700 shadow-md p-4 flex justify-between items-center sticky top-0 z-20">
          <h1 className="text-xl font-bold">Dasbor Pemilik Toko</h1>
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">Logout</button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {shop && (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className={shop.plan === 'PRO' ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-6" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-6"}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Paket {shop.plan}</h2>
                    <p className="text-sm opacity-90">{shop.plan === 'PRO' ? 'Anda memiliki akses ke semua fitur tanpa batas.' : 'Batas 30 antrian per hari. Upgrade untuk fitur lebih.'}</p>
                  </div>
                  {shop.plan === 'BASIC' && (<button onClick={handleUpgrade} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">Upgrade ke Pro</button>)}
                </div>
              </div>

              {shop.plan === 'PRO' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Analitik Toko</h2>
                    <button onClick={fetchAnalyticsData} disabled={isRefreshing} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:bg-gray-400">{isRefreshing ? 'Memuat...' : 'Refresh Data'}</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-lg flex flex-col justify-center items-center">
                      <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Waktu Tunggu Rata-rata</h3>
                      <p className="text-3xl font-bold text-indigo-900 dark:text-white mt-2">{formatSeconds(avgWaitTime.average_wait_seconds)}</p>
                    </div>
                    <div className="md:col-span-2 h-64 relative"><DailyCountChart chartData={dailyCountData} /></div>
                  </div>
                  <div className="mt-8 h-80 relative"><PeakHoursChart chartData={peakHoursData} /></div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                  <h3 className="text-xl font-bold">Fitur Analitik Terkunci</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Tingkatkan ke paket Pro untuk melihat data analitik performa toko Anda.</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    {!isEditing ? (
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-4">
                            {shop.logo && <img src={shop.logo} alt="Logo" className="w-16 h-16 rounded-full object-cover"/>}
                            <div>
                              <h2 className="text-3xl font-bold">{shop.name}</h2>
                              <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">{shop.address || 'Alamat belum diatur'}</p>
                            </div>
                          </div>
                          <button onClick={() => setIsEditing(true)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold py-2 px-4 rounded-lg text-sm flex-shrink-0">Pengaturan</button>
                        </div>
                        {successMessage && <p className="text-sm text-green-600 mt-2">{successMessage}</p>}
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold mb-4">Pengaturan Toko</h3>
                        <form onSubmit={handleShopUpdate}>
                          <div className="space-y-4">
                            <div><label htmlFor="shopName" className="text-sm font-medium">Nama Toko</label><input id="shopName" type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="w-full p-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/></div>
                            <div><label htmlFor="shopAddress" className="text-sm font-medium">Alamat Toko</label><textarea id="shopAddress" rows={3} value={editedAddress} onChange={(e) => setEditedAddress(e.target.value)} className="w-full p-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"/></div>
                            <div><label htmlFor="shopLogo" className="text-sm font-medium">Logo Toko</label><input id="shopLogo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800/50"/></div>
                          </div>
                          <div className="flex items-center space-x-4 mt-6">
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Simpan</button>
                            <button type="button" onClick={handleCancelEdit} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 font-semibold py-2 px-4 rounded-lg">Batal</button>
                          </div>
                        </form>
                      </>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                    <h3 className="text-lg font-semibold mb-2">QR Code Antrian</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Klik gambar untuk melihat, atau klik tombol untuk download.</p>
                    <div className="flex justify-center my-4">
                      <a href={`http://127.0.0.1:8000/api/shops/${shop.id}/qr-code/`} target="_blank" rel="noopener noreferrer" className="inline-block bg-white p-2 rounded-lg">
                        <img src={`http://127.0.0.1:8000/api/shops/${shop.id}/qr-code/`} alt={`QR Code for ${shop.name}`} className="w-48 h-48" />
                      </a>
                    </div>
                    <button onClick={handleDownloadQRCode} className="block mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Download</button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-6">Manajemen Staf</h2>
                  {shop.plan === 'PRO' ? (
                    <>
                      <form onSubmit={handleAddStaff} className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h3 className="font-semibold mb-2">Tambah Staf Baru</h3>
                        <div className="space-y-3">
                          <input type="text" placeholder="Username Staf Baru" value={newStaffUsername} onChange={e => setNewStaffUsername(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" required />
                          <input type="password" placeholder="Password Sementara" value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" required />
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Tambah Staf</button>
                          {staffError && <p className="text-sm text-red-500 mt-2">{staffError}</p>}
                        </div>
                      </form>
                      <div>
                        <h3 className="font-semibold mb-2">Daftar Staf Saat Ini</h3>
                        <ul className="space-y-2">
                          {staffList.map(staff => (
                            <li key={staff.id} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <span>{staff.username}</span>
                              <button onClick={() => handleDeleteStaff(staff.id)} className="bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 font-semibold py-1 px-3 rounded-lg text-xs">Hapus</button>
                            </li>
                          ))}
                          {staffList.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada staf.</p>}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-gray-600 dark:text-gray-400">Fitur tambah staf hanya tersedia di paket Pro.</p>
                    </div>
                  )}
                  <div className="mt-8 border-t dark:border-gray-700 pt-6 text-center">
                    <Link href={`/dashboard/${shop.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">Buka Dasbor Barista &rarr;</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
