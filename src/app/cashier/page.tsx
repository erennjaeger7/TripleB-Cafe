'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, Trash2, TrendingUp, Coffee, Lock, User, Eye, EyeOff } from 'lucide-react';

interface Table {
  id: number;
  status: 'vacant' | 'unpaid' | 'paid';
}

interface Order {
  id: string;
  table_id: number;
  items: any[];
  total_price: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export default function CashierPage() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  // Dashboard State
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [popularItems, setPopularItems] = useState<Array<{ name: string; quantity: number }>>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'analytics'>('tables');

  // Hardcoded simple credentials
  const SECURE_USERNAME = "cashier";
  const SECURE_PASSWORD = "bentoAtelier101";

  useEffect(() => {
    const authStatus = sessionStorage.getItem('cashier_authenticated');
    if (authStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchData();

    const tableSub = supabase.channel('cashier-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => { fetchData(); })
      .subscribe();

    const orderSub = supabase.channel('cashier-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchData(); })
      .subscribe();

    const salesSub = supabase.channel('cashier-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => { fetchData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(tableSub);
      supabase.removeChannel(orderSub);
      supabase.removeChannel(salesSub);
    };
  }, [isLoggedIn]);

  const fetchData = async () => {
    const { data: tableData } = await supabase.from('tables').select('*').order('id', { ascending: true });
    if (tableData) setTables(tableData);

    const { data: orderData } = await supabase.from('orders').select('*').eq('status', 'pending').order('created_at', { ascending: true });
    if (orderData) setOrders(orderData);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: salesData } = await supabase.from('sales').select('*').gte('created_at', startOfToday.toISOString());
    if (salesData) {
      const revenue = salesData.reduce((acc, sale) => acc + Number(sale.total_revenue), 0);
      setTodayRevenue(revenue);

      const counts: Record<string, { name: string; quantity: number }> = {};
      salesData.forEach((row: any) => {
        const items = row.items || [];
        items.forEach((item: any) => {
          if (!counts[item.id]) {
            counts[item.id] = { name: item.name, quantity: 0 };
          }
          counts[item.id].quantity += item.quantity;
        });
      });

      const sorted = Object.values(counts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      setPopularItems(sorted);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === SECURE_USERNAME && password === SECURE_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('cashier_authenticated', 'true');
      setLoginError('');
    } else {
      setLoginError('Username atau password salah.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('cashier_authenticated');
    setUsername('');
    setPassword('');
  };

  const handleMarkAsPaid = async (tableId: number, order: Order) => {
    try {
      const { error: salesErr } = await supabase.from('sales').insert({
        table_id: tableId,
        items: order.items,
        total_revenue: order.total_price,
      });
      if (salesErr) throw salesErr;

      await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);
      await supabase.from('tables').update({ status: 'paid' }).eq('id', tableId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearTable = async (tableId: number) => {
    try {
      await supabase.from('tables').update({ status: 'vacant' }).eq('id', tableId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 border border-zinc-200/80 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-zinc-800 tracking-tight">Atelier Guard</h1>
            <p className="text-xs text-zinc-400">Gunakan kredensial kasir Anda untuk mengakses dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-transparent focus:border-zinc-300 focus:bg-white outline-none rounded-2xl pl-10 pr-4 py-3 text-sm font-medium transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-transparent focus:border-zinc-300 focus:bg-white outline-none rounded-2xl pl-10 pr-10 py-3 text-sm font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-xl">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-sm py-3 rounded-2xl transition shadow-sm mt-2"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Atelier Controller</h1>
          <p className="text-xs text-zinc-400">Cashier Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'tables' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Meja Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'analytics' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Analytics
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-zinc-400 hover:text-rose-500 transition ml-2"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {activeTab === 'tables' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Layout Meja Aktif</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {tables.map((table) => {
                  const activeOrder = orders.find((o) => o.table_id === table.id);
                  return (
                    <div
                      key={table.id}
                      className={`rounded-[24px] p-5 border shadow-sm transition flex flex-col justify-between min-h-[160px] ${
                        table.status === 'unpaid'
                          ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-400/10'
                          : table.status === 'paid'
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : 'bg-white border-zinc-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Meja</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            table.status === 'unpaid' ? 'bg-amber-500 animate-pulse' : table.status === 'paid' ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`} />
                        </div>
                        <h3 className="text-3xl font-black text-zinc-800 mt-1">{String(table.id).padStart(2, '0')}</h3>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 mt-4 space-y-3">
                        {table.status === 'unpaid' && activeOrder && (
                          <div className="space-y-2">
                            <div className="text-[11px] text-zinc-500 truncate font-medium">
                              Total: <span className="font-bold text-zinc-800">{formatRupiah(activeOrder.total_price)}</span>
                            </div>
                            <button
                              onClick={() => handleMarkAsPaid(table.id, activeOrder)}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Konfirmasi Bayar
                            </button>
                          </div>
                        )}

                        {table.status === 'paid' && (
                          <button
                            onClick={() => handleClearTable(table.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Kosongkan Meja
                          </button>
                        )}

                        {table.status === 'vacant' && (
                          <span className="text-[10px] font-bold text-zinc-400 uppercase text-center block">Kosong / Vacant</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Daftar Antrean Pesanan</h2>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-8 text-center border border-zinc-200">
                    <p className="text-xs text-zinc-400">Tidak ada pesanan masuk saat ini.</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-[24px] p-5 border border-amber-200 bg-gradient-to-tr from-amber-50/5 to-transparent space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                        <div>
                          <span className="text-xs text-zinc-400">Meja</span>
                          <span className="text-lg font-bold block">Meja {order.table_id}</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">{new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-600">{item.name} <span className="font-bold text-zinc-400">x{item.quantity}</span></span>
                            <span>{formatRupiah(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                        <span className="text-xs text-zinc-400">Total</span>
                        <span className="text-base font-black text-zinc-800">{formatRupiah(order.total_price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Bento Analytics System</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-[32px] p-8 border border-zinc-200/60 shadow-sm flex flex-col justify-between min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Total Revenue</h3>
                    <p className="text-xs text-zinc-400 mt-1">Total akumulasi transaksi yang disetujui hari ini.</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-5xl font-black text-zinc-800 tracking-tight block">
                    {formatRupiah(todayRevenue)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-zinc-200/60 shadow-sm flex flex-col justify-between md:row-span-2">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Most Popular Items</h3>
                  <p className="text-xs text-zinc-400 mb-6">Penjualan tertinggi berdasarkan pesanan terbayar.</p>
                </div>

                <div className="space-y-4">
                  {popularItems.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-6">Belum ada data penjualan hari ini.</p>
                  ) : (
                    popularItems.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-700 truncate">{item.name}</span>
                          <span className="text-zinc-900 font-bold">{item.quantity} Qty</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="bg-zinc-800 h-full rounded-full"
                            style={{
                              width: `${(item.quantity / Math.max(...popularItems.map((i) => i.quantity))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-zinc-200/60 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-700">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Atelier Operations</h4>
                  <p className="text-sm font-semibold text-zinc-800">10 Tables Operational</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
