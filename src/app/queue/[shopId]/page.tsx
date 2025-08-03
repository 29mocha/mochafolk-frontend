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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const wsUrl = apiUrl.replace(/^http/, 'ws');

  const [shop, setShop] = useState<CoffeeShop | null>(null);
  const [yourQueueInfo, setYourQueueInfo] = useState<StoredQueueInfo | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // --- Logika Push Notification ---
  const syncPushSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      await navigator.serviceWorker.register('/sw.js');
      const swRegistration = await navigator.serviceWorker.ready;
      let subscription = await swRegistration.pushManager.getSubscription();
      if (!subscription) {
        const vapidResponse = await axios.get(`${apiUrl}/api/shops/vapid-public-key/`);
        const vapidPublicKey = vapidResponse.data.public_key;
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }
      await axios.post(`${apiUrl}/api/shops/${shopId}/save-subscription/`, { subscription_info: subscription });
      setNotificationStatus('subscribed');
      return true;
    } catch (error) {
      console.error("Gagal sinkronisasi langganan:", error);
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setNotificationStatus('denied');
      }
      return false;
    }
  }, [shopId, apiUrl]);

  const handleEnableNotifications = async () => {
    setNotificationStatus('subscribing');
    if (typeof Notification === 'undefined') {
        setNotificationStatus('unsupported');
        return;
    }
    const permission = await Notification.requestPermission();
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

  // Efek utama untuk memuat data dan koneksi
  useEffect(() => {
    if (!shopId) return;
    
    // Deteksi perangkat Apple saat komponen dimuat
    // KUNCI PERBAIKAN: Gunakan 'any' untuk menghindari error TypeScript
    setIsAppleDevice(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        syncPushSubscription();
      } else if (Notification.permission === 'denied') {
        setNotificationStatus('denied');
      }
    } else {
      setNotificationStatus('unsupported');
    }

    axios.get(`${apiUrl}/api/shops/${shopId}/`).then(res => setShop(res.data));
    const savedQueue = localStorage.getItem('mochafolk-queue');
    if (savedQueue) {
      const parsedQueue: StoredQueueInfo = JSON.parse(savedQueue);
      if (parsedQueue.shopId === shopId) {
        setYourQueueInfo(parsedQueue);
        axios.get(`${apiUrl}/api/shops/${shopId}/queues/${parsedQueue.id}/`)
          .then(res => { if (res.data.status === 'ready') setIsReady(true); });
      }
    }
    setIsLoading(false);

    const socket = new WebSocket(`${wsUrl}/ws/queue/${shopId}/`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const updatedQueue: QueueItem = data.message;
      const latestQueueInfo: StoredQueueInfo | null = JSON.parse(localStorage.getItem('mochafolk-queue') || 'null');
      if (latestQueueInfo && updatedQueue.id === latestQueueInfo.id) {
        if (data.type === 'queue_update' && updatedQueue.status === 'ready') {
          setIsReady(true);
        } else if (data.type === 'pager_ring') {
          audioRef.current?.play();
        }
      }
    };
    return () => socket.close();
  }, [shopId, apiUrl, wsUrl, syncPushSubscription]);

  // Efek untuk notifikasi layar penuh
  useEffect(() => {
    if (isReady && !audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.wav');
      audioRef.current.loop = true;
    }
    if (isReady) {
      audioRef.current?.play().catch(e => console.log("Audio diblokir, perlu interaksi"));
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    } else {
      audioRef.current?.pause();
    }
  }, [isReady]);

  const handleGetQueueNumber = async () => {
    if (!audioUnlockedRef.current) {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.play().catch(() => {});
      audioUnlockedRef.current = true;
    }
    try {
      const response = await axios.post(`${apiUrl}/api/shops/${shopId}/queues/`, {});
      const newQueueInfo: StoredQueueInfo = { id: response.data.id, queue_number: response.data.queue_number, shopId: shopId };
      localStorage.setItem('mochafolk-queue', JSON.stringify(newQueueInfo));
      setYourQueueInfo(newQueueInfo);
      setIsReady(false);
    } catch (error) {
      alert("Gagal mengambil nomor antrian.");
    }
  };

  const handleSessionEnd = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    localStorage.removeItem('mochafolk-queue');
    setYourQueueInfo(null);
    setIsReady(false);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111]">
        <p className="text-gray-400">Memeriksa status antrian...</p>
      </main>
    );
  }

  if (isReady) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-green-500 text-white animate-pulse">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-widest">PESANAN SIAP</h1>
          <p className="text-9xl font-bold my-4">{yourQueueInfo?.queue_number}</p>
          <p className="text-xl">Silakan ambil pesanan Anda</p>
          <button
            onClick={handleSessionEnd}
            className="mt-8 w-full bg-white text-green-600 font-bold py-4 rounded-lg text-lg"
          >
            Selesai
          </button>
        </div>
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
                src={`${apiUrl}${shop.logo}`} 
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
            <>
              <div className="p-8 rounded-lg" style={{ backgroundColor: 'rgba(20, 20, 20, 0.5)', backdropFilter: 'blur(8px)', border: '1px solid #52525b' }}>
                <p className="font-bold text-sm text-gray-400">NOMOR ANTRIAN ANDA</p>
                <p className="text-7xl font-extrabold my-2 text-gray-200">{yourQueueInfo.queue_number}</p>
                <p className="text-gray-400">Mohon tunggu, pesanan sedang dibuat.</p>
              </div>
              <div className="mt-6 p-3 bg-yellow-900/50 border border-yellow-700/50 rounded-lg text-yellow-300 text-xs">
                <p className="font-semibold">🔔 PENTING</p>
                <p className="mt-1">Untuk notifikasi suara, jangan tutup halaman ini.</p>
              </div>
            </>
          )}
          
           <div className="mt-6 text-center">
            {notificationStatus === 'idle' && !isAppleDevice && (
              <button onClick={handleEnableNotifications} className="text-xs text-gray-400 hover:text-white underline">
                Aktifkan Notifikasi Lanjutan (jika browser ditutup)
              </button>
            )}
            {notificationStatus === 'idle' && isAppleDevice && (
              <p className="text-xs text-gray-500">
                Untuk notifikasi di luar browser, tambahkan halaman ini ke Layar Utama Anda.
              </p>
            )}
            {notificationStatus === 'subscribing' && <p className="text-xs text-yellow-400">Mengaktifkan...</p>}
            {notificationStatus === 'subscribed' && <p className="text-xs text-green-400">✓ Notifikasi lanjutan aktif.</p>}
            {notificationStatus === 'denied' && <p className="text-xs text-red-400">Anda telah memblokir notifikasi.</p>}
            {notificationStatus === 'unsupported' && <p className="text-xs text-gray-500">Browser tidak mendukung fitur ini.</p>}
          </div>
        </div>
      </main>
    </>
  );
}
