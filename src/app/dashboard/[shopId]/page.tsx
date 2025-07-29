// src/app/dashboard/[shopId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ThemeSwitcher } from '@/components/ThemeSwitcher'; // Impor ThemeSwitcher

// Definisikan tipe data
interface QueueItem {
  id: number;
  queue_number: number;
  status: string;
}

export default function BaristaDashboard() {
  const params = useParams();
  const shopId = params.shopId as string;
  const { accessToken, logout } = useAuth();

  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shopId || !accessToken) return;

    const fetchInitialData = async () => {
      try {
        const [shopResponse, queuesResponse] = await Promise.all([
          api.get(`/shops/${shopId}/`),
          api.get(`/shops/${shopId}/queues/`)
        ]);
        setShopName(shopResponse.data.name);
        setQueues(queuesResponse.data.filter((q: QueueItem) => q.status !== 'done'));
      } catch (error) {
        console.error("Gagal mengambil data awal dasbor:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
      
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/queue/${shopId}/`);
    socket.onopen = () => console.log("Dasbor terhubung ke WebSocket");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'queue_new') {
        setQueues(prevQueues => [...prevQueues, data.message]);
      } else if (data.type === 'queue_update') {
        setQueues(prevQueues =>
          prevQueues.map(q =>
            q.id === data.message.id ? { ...q, status: data.message.status } : q
          )
        );
      }
    };
    
    return () => socket.close();

  }, [shopId, accessToken]);

  const handleMarkAsReady = async (queueId: number) => {
    try {
      setQueues(prevQueues => prevQueues.map(q => q.id === queueId ? { ...q, status: 'ready' } : q));
      await api.patch(`/shops/${shopId}/queues/${queueId}/`, { status: 'ready' });
    } catch (_error) {
      alert("Gagal mengubah status.");
    }
  };
  
  const handleRingPager = async (queueId: number) => {
    try {
      await api.post(`/shops/${shopId}/queues/${queueId}/ring/`, {});
    } catch (_error) {
      alert("Gagal mengirim sinyal pager.");
    }
  };

  const handleResetQueue = async () => {
    if (confirm("Apakah Anda yakin ingin mereset semua antrian yang aktif?")) {
        try {
            await api.post(`/shops/${shopId}/reset-queue/`, {});
            setQueues([]);
            alert("Antrian berhasil direset.");
        } catch (_error) {
            alert("Gagal mereset antrian.");
        }
    }
  };
  
  const waitingQueues = queues.filter(q => q.status === 'waiting');
  const readyQueues = queues.filter(q => q.status === 'ready');

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">Memuat dasbor barista...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
        <header className="bg-white dark:bg-gray-800 dark:border-b dark:border-gray-700 shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold">{shopName || 'Dasbor Barista'}</h1>
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <button onClick={handleResetQueue} className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">
              Reset Antrian
            </button>
            <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg text-sm">
              Logout
            </button>
          </div>
        </header>
        <main className="flex flex-col md:flex-row flex-grow p-4">
          <div className="w-full md:w-1/2 md:pr-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full">
              <h2 className="text-2xl font-bold border-b dark:border-gray-700 pb-4 mb-4">
                Menunggu Dibuat ({waitingQueues.length})
              </h2>
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-150px)]">
                {waitingQueues.map(queue => (
                  <div key={queue.id} className="flex justify-between items-center bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg">
                    <span className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{queue.queue_number}</span>
                    <button
                      onClick={() => handleMarkAsReady(queue.id)}
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Siap
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 md:pl-2 mt-4 md:mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 h-full">
              <h2 className="text-2xl font-bold border-b dark:border-gray-700 pb-4 mb-4">
                Siap Diambil ({readyQueues.length})
              </h2>
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-150px)]">
                {readyQueues.map(queue => (
                  <div key={queue.id} className="flex justify-between items-center bg-green-200 dark:bg-green-900/50 p-4 rounded-lg">
                    <span className="text-2xl font-bold text-green-800 dark:text-green-200">{queue.queue_number}</span>
                    <button
                      onClick={() => handleRingPager(queue.id)}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-3 rounded-lg text-sm"
                    >
                      Bunyikan Pager
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
