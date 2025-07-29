// src/app/queue/[shopId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import ParticleBackground from '@/components/ParticleBackground';

// --- Tipe Data ---
interface QueueItem { id: number; queue_number: number; status: string; }
interface CoffeeShop { id: number; name: string; logo: string | null; }
interface StoredQueueInfo { id: number; queue_number: number; shopId: string; }

// --- Fungsi Helper ---
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- Komponen Utama ---
export default function QueuePage() {
  const params = useParams();
  const shopId = params.shopId as string;

  const [shop, setShop] = useState<CoffeeShop | null>(null);
  const [yourQueueInfo, setYourQueueInfo] = useState<StoredQueueInfo | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied'>('idle');
  const hasBeenNotified = useRef(false);

  // --- Fungsi untuk Mendaftar & Sinkronisasi Notifikasi ---
  const syncPushSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    
    try {
      await navigator.serviceWorker.register('/sw.js');
      const swRegistration = await navigator.serviceWorker.ready;
      let subscription = await swRegistration.pushManager.getSubscription();

      // Jika belum ada langganan, buat yang baru
      if (!subscription) {
        const vapidResponse = await axios.get('http://127.0.0.1:8000/api/shops/vapid-public-key/');
        const vapidPublicKey = vapidResponse.data.public_key;
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      // Kirim (atau kirim ulang) langganan ke backend untuk sinkronisasi
      await axios.post(
        `http://127.0.0.1:8000/api/shops/${shopId}/save-subscription/`,
        { subscription_info: subscription }
      );
      
      setNotificationStatus('subscribed');
      return true; // Sukses
    } catch (error) {
      console.error("Gagal sinkronisasi langganan:", error);
      // Jangan set 'denied' di sini, biarkan 'idle' agar bisa dicoba lagi
      if (Notification.permission === 'denied') {
        setNotificationStatus('denied');
      }
      return false; // Gagal
    }
  }, [shopId]);

  const handleEnableNotifications = async () => {
    setNotificationStatus('subscribing');
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') {
      setNotificationStatus('denied');
      return;
    }
    const success = await syncPushSubscription();
    if (success) {
      alert('Notifikasi lanjutan berhasil diaktifkan!');
    } else {
      alert('Gagal mengaktifkan notifikasi lanjutan.');
      setNotificationStatus('idle');
    }
  };

  // Efek utama untuk memuat data awal
  useEffect(() => {
    if (!shopId) return;

    // KUNCI PERBAIKAN: Selalu coba sinkronkan jika izin sudah diberikan
    if (Notification.permission === 'granted') {
      syncPushSubscription();
    } else if (Notification.permission === 'denied') {
      setNotificationStatus('denied');
    }

    axios.get(`http://127.0.0.1:8000/api/shops/${shopId}/`).then(res => setShop(res.data));
    const savedQueue = localStorage.getItem('mochafolk-queue');
    if (savedQueue) {
      const parsedQueue: StoredQueueInfo = JSON.parse(savedQueue);
      if (parsedQueue.shopId === shopId) {
        setYourQueueInfo(parsedQueue);
        axios.get(`http://127.0.0.1:8000/api/shops/${shopId}/queues/${parsedQueue.id}/`)
          .then(res => { if (res.data.status === 'ready') setIsReady(true); });
      }
    }
    setIsLoading(false);

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/queue/${shopId}/`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const updatedQueue: QueueItem = data.message;
      const latestQueueInfo: StoredQueueInfo | null = JSON.parse(localStorage.getItem('mochafolk-queue') || 'null');
      
      if (latestQueueInfo && updatedQueue.id === latestQueueInfo.id) {
        if (data.type === 'queue_update' && updatedQueue.status === 'ready') {
          setIsReady(true);
        } else if (data.type === 'pager_ring') {
          new Audio('/sounds/notification.wav').play().catch(e => console.log("Gagal memutar suara pager:", e));
        }
      }
    };
    return () => socket.close();
  }, [shopId, syncPushSubscription]);
  
  // Efek terpisah untuk notifikasi alert
  useEffect(() => {
    if (isReady && yourQueueInfo && !hasBeenNotified.current) {
        new Audio('/sounds/notification.wav').play().catch(e => console.log("Gagal memutar suara notifikasi:", e));
        alert(`🔔 Pesanan Anda #${yourQueueInfo.queue_number} sudah SIAP diambil!`);
        hasBeenNotified.current = true;
    }
  }, [isReady, yourQueueInfo]);

  const handleGetQueueNumber = async () => {
      try {
        const response = await axios.post(`http://127.0.0.1:8000/api/shops/${shopId}/queues/`, {});
        const newQueueItem: QueueItem = response.data;
        const newQueueInfo = { id: newQueueItem.id, queue_number: newQueueItem.queue_number, shopId: shopId };
        localStorage.setItem('mochafolk-queue', JSON.stringify(newQueueInfo));
        setYourQueueInfo(newQueueInfo);
        setIsReady(false);
        hasBeenNotified.current = false;
      } catch (error) {
        console.error("Gagal mengambil data:", error);
        alert("Gagal mengambil nomor antrian.");
      }
  };
  const handleSessionEnd = () => {
      localStorage.removeItem('mochafolk-queue');
      setYourQueueInfo(null);
      setIsReady(false);
      hasBeenNotified.current = false;
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111]">
        <p className="text-gray-400">Memeriksa status antrian...</p>
      </main>
    );
  }

  return (
    <>
      <ParticleBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 bg-transparent" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="w-full max-w-sm text-center text-white">
          <div className="flex justify-center items-center flex-col mb-8">
            {shop?.logo && (
              <img 
                src={shop.logo} 
                alt="Logo Toko"
                className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-[#A47E65]/50"
              />
            )}
            <h1 className="text-5xl font-bold" style={{ fontFamily: 'Amatic SC, cursive' }}>
              {shop?.name || 'MochaFolk'}
            </h1>
            <p className="text-gray-400 text-sm tracking-widest mt-1">SISTEM ANTRIAN</p>
          </div>
          
          {!yourQueueInfo ? (
            <button
              onClick={handleGetQueueNumber}
              className="w-full py-3 px-4 bg-[#A47E65] hover:opacity-90 text-white font-bold text-lg rounded-md transition-opacity border border-gray-600"
            >
              Ambil Nomor Antrian
            </button>
          ) : (
            <div className="p-8 rounded-lg" style={{ backgroundColor: 'rgba(20, 20, 20, 0.5)', backdropFilter: 'blur(8px)', border: '1px solid #52525b' }}>
              {isReady ? (
                <div>
                  <p className="font-bold text-green-400 animate-pulse">PESANAN ANDA SIAP!</p>
                  <p className="text-8xl font-extrabold my-2 text-green-300">{yourQueueInfo.queue_number}</p>
                  <button
                    onClick={handleSessionEnd}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
                  >
                    Selesai
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-gray-400">NOMOR ANTRIAN ANDA</p>
                  <p className="text-7xl font-extrabold my-2 text-gray-200">{yourQueueInfo.queue_number}</p>
                  <p className="text-gray-400">Mohon tunggu, pesanan sedang dibuat.</p>
                </div>
              )}
            </div>
          )}
          
           <div className="mt-6 text-center">
            {notificationStatus === 'idle' && (
              <button onClick={handleEnableNotifications} className="text-xs text-gray-400 hover:text-white underline">
                Aktifkan Notifikasi Lanjutan (jika browser ditutup)
              </button>
            )}
            {notificationStatus === 'subscribing' && <p className="text-xs text-yellow-400">Mengaktifkan...</p>}
            {notificationStatus === 'subscribed' && <p className="text-xs text-green-400">✓ Notifikasi lanjutan aktif.</p>}
            {notificationStatus === 'denied' && <p className="text-xs text-red-400">Anda telah memblokir notifikasi.</p>}
          </div>
        </div>
      </main>
    </>
  );
}
