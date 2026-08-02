'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MENU_ITEMS, MenuItem } from '@/config/menu';
import { ShoppingBag, Sparkles, CheckCircle, Clock, Wifi, Compass, ChevronRight } from 'lucide-react';

interface CartItem extends MenuItem {
  quantity: number;
}

export default function TablePage() {
  const params = useParams();
  const tableId = typeof params?.table_id === 'string' ? parseInt(params.table_id, 10) : 1;

  const [status, setStatus] = useState<'vacant' | 'unpaid' | 'paid'>('vacant');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data: tableData } = await supabase
        .from('tables')
        .select('status')
        .eq('id', tableId)
        .single();
      
      if (tableData) {
        setStatus(tableData.status as any);
      }

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (orderData && orderData.length > 0) {
        setActiveOrder(orderData[0]);
      }
      setIsLoading(false);
    };

    fetchInitialData();

    const tableSubscription = supabase
      .channel(`table-${tableId}-changes`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'tables', 
        filter: `id=eq.${tableId}` 
      }, (payload) => {
        setStatus(payload.new.status);
      })
      .subscribe();

    const orderSubscription = supabase
      .channel(`order-${tableId}-changes`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders', 
        filter: `table_id=eq.${tableId}` 
      }, () => {
        supabase
          .from('orders')
          .select('*')
          .eq('table_id', tableId)
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setActiveOrder(data[0]);
            }
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tableSubscription);
      supabase.removeChannel(orderSubscription);
    };
  }, [tableId]);

  const updateCartQuantity = (item: MenuItem, change: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + change;
        if (nextQty <= 0) return prevCart.filter((i) => i.id !== item.id);
        return prevCart.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i));
      }
      if (change > 0) {
        return [...prevCart, { ...item, quantity: 1 }];
      }
      return prevCart;
    });
  };

  const getQuantityInCart = (itemId: string) => {
    return cart.find((i) => i.id === itemId)?.quantity || 0;
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const orderPayload = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: tableId,
          items: orderPayload,
          total_price: totalPrice,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'unpaid' })
        .eq('id', tableId);

      if (tableError) throw tableError;

      setCart([]);
      setStatus('unpaid');
      setActiveOrder(orderData);
    } catch (err) {
      console.error(err);
      alert('Pemesanan gagal. Hubungi staf.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-zinc-300 border-t-zinc-850 rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400 font-medium">Memuat Menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {status === 'vacant' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-[24px] p-6 border border-zinc-200/60 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-[11px] font-semibold tracking-wider text-zinc-600 uppercase mb-3">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Premium Experience
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-800">Bento Café & Atelier</h1>
                  <p className="text-sm text-zinc-500 mt-1">Savor architectural blends of artisan coffee & premium pastries.</p>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-zinc-200/60 shadow-sm flex flex-col justify-between items-center text-center">
                <span className="text-xs uppercase font-medium tracking-widest text-zinc-400">Nomor Meja</span>
                <span className="text-6xl font-black text-zinc-800">{String(tableId).padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-zinc-500 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">Ready to Order</span>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-4 border border-zinc-200/60 shadow-sm">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {['All', 'Coffee', 'Matcha', 'Bakery', 'Mains', 'Snacks'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      activeCategory === cat ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/75'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {MENU_ITEMS.filter((item) => activeCategory === 'All' || item.category === activeCategory).map((item) => {
                const cartQty = getQuantityInCart(item.id);
                return (
                  <div key={item.id} className="bg-white rounded-[24px] p-4 border border-zinc-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
                    <div className="flex gap-4">
                      <img src={item.imageUrl} alt={item.name} className="w-24 h-24 rounded-2xl object-cover border border-zinc-100" />
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.category}</span>
                        <h3 className="font-semibold text-zinc-800 text-base leading-tight">{item.name}</h3>
                        <p className="text-xs text-zinc-500 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
                      <span className="font-bold text-zinc-800 text-sm">{formatRupiah(item.price)}</span>
                      <div className="flex items-center gap-1.5 bg-zinc-100 rounded-full p-1 border border-zinc-200/40">
                        {cartQty > 0 ? (
                          <>
                            <button onClick={() => updateCartQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-zinc-200 shadow-sm text-sm font-semibold text-zinc-700 transition">-</button>
                            <span className="w-6 text-center text-xs font-bold text-zinc-800">{cartQty}</span>
                            <button onClick={() => updateCartQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-zinc-200 shadow-sm text-sm font-semibold text-zinc-700 transition">+</button>
                          </>
                        ) : (
                          <button onClick={() => updateCartQuantity(item, 1)} className="px-4 py-1 flex items-center justify-center rounded-full bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 transition">Tambah</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {cart.length > 0 && (
              <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto z-40 bg-white/80 backdrop-blur-md rounded-[24px] p-4 border border-zinc-300/80 shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Total Pesanan ({cart.reduce((a, b) => a + b.quantity, 0)} Item)</p>
                  <p className="text-lg font-bold text-zinc-900">{formatRupiah(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}</p>
                </div>
                <button onClick={handlePlaceOrder} disabled={isSubmitting} className="bg-zinc-950 text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-zinc-850 flex items-center gap-2 shadow transition disabled:opacity-50">
                  <ShoppingBag className="w-4 h-4" />
                  {isSubmitting ? 'Mengirim...' : 'Kirim Pesanan'}
                </button>
              </div>
            )}
          </>
        )}

        {status === 'unpaid' && activeOrder && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="md:col-span-2 bg-white rounded-[32px] p-8 border border-amber-200 bg-gradient-to-br from-amber-50/20 to-transparent shadow-sm flex flex-col justify-between min-h-[300px]">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-6">
                <Clock className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-zinc-800">Pesanan Sedang Diproses</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">Kami telah meneruskan menu pilihan Anda ke bagian dapur. Silakan tunjukkan layar ini ke kasir untuk memverifikasi pembayaran Anda.</p>
              </div>
              <div className="pt-6 border-t border-zinc-100 flex items-center justify-between mt-6">
                <span className="text-xs text-zinc-400 font-medium">Status</span>
                <span className="text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">Menunggu Pembayaran</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-zinc-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold block mb-2">Total Tagihan</span>
                <span className="text-2xl font-black text-zinc-800 tracking-tight">{formatRupiah(activeOrder.total_price)}</span>
                <p className="text-xs text-zinc-400 mt-2">Meja {tableId}</p>
              </div>
              <div className="space-y-2 pt-4 border-t border-zinc-100 text-xs">
                {activeOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-zinc-600">
                    <span className="truncate max-w-[120px]">{item.name} <span className="text-zinc-400 font-bold">x${item.quantity}</span></span>
                    <span>{formatRupiah(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 border border-zinc-200/60 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Wi-Fi Atelier</h4>
                <p className="text-sm font-semibold text-zinc-800">BentoAtelier_5G</p>
                <p className="text-[11px] text-zinc-400 font-medium">password: espresso101</p>
              </div>
            </div>
          </div>
        )}

        {status === 'paid' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="md:col-span-2 bg-white rounded-[32px] p-8 border border-emerald-200 bg-gradient-to-br from-emerald-50/20 to-transparent shadow-sm flex flex-col justify-between min-h-[300px]">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-6 animate-bounce">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-zinc-800">Pembayaran Terkonfirmasi</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">Terima kasih banyak atas kunjungan Anda ke Bento Café. Transaksi Anda berhasil diproses secara aman.</p>
              </div>
              <div className="pt-6 border-t border-zinc-100 flex items-center justify-between mt-6">
                <span className="text-xs text-zinc-400 font-medium">Metode Pembayaran</span>
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">Lunas / Paid</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-zinc-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold block mb-2">ID Transaksi</span>
                <span className="text-xs font-mono font-medium text-zinc-600 block truncate">{activeOrder?.id || 'RECEIPT-N/A'}</span>
                <p className="text-[11px] text-zinc-400 mt-1">{activeOrder?.created_at ? new Date(activeOrder.created_at).toLocaleTimeString() : ''}</p>
              </div>
              <div className="pt-4 border-t border-zinc-100">
                <p className="text-xs text-zinc-400">Simpan tangkapan layar ini sebagai struk digital sah Anda.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
