import React, { useMemo } from 'react';
import { useStore, useTranslation } from '../lib/store';
import { formatCurrency } from '../lib/utils';
import { format, isToday, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, IndianRupee, ShoppingBag, AlertCircle, Wallet } from 'lucide-react';

export const Home = () => {
  const { sales, stock, products, settings } = useStore();
  const { t } = useTranslation();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySales = sales.filter(s => s.date === today);
  
  const totalRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const itemsSold = todaySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.qty, 0), 0);
  
  const totalProfit = todaySales.reduce((sum, s) => {
    return sum + s.items.reduce((iSum, item) => {
      const product = products.find(p => p.id === item.productId);
      const cost = product ? product.costPrice * item.qty : 0;
      return iSum + (item.total - cost);
    }, 0);
  }, 0);

  const cashInHand = todaySales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0);

  const weeklyData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySales = sales.filter(s => s.date === dateStr);
      const total = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
      return {
        name: format(day, 'EEE'),
        total,
        isToday: dateStr === today
      };
    });
  }, [sales, today]);

  const maxSale = Math.max(...weeklyData.map(d => d.total));

  const bestSellers = useMemo(() => {
    const itemMap = new Map<string, { qty: number, revenue: number }>();
    todaySales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = itemMap.get(item.productId) || { qty: 0, revenue: 0 };
        itemMap.set(item.productId, {
          qty: existing.qty + item.qty,
          revenue: existing.revenue + item.total
        });
      });
    });
    
    return Array.from(itemMap.entries())
      .map(([id, data]) => {
        const product = products.find(p => p.id === id);
        return { product, ...data };
      })
      .filter(item => item.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [todaySales, products]);

  const lowStockItems = useMemo(() => {
    return products.filter(p => {
      const latestStock = stock.filter(s => s.productId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      const current = latestStock ? latestStock.currentStock : 0;
      return current <= p.threshold;
    }).map(p => {
      const latestStock = stock.filter(s => s.productId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return { ...p, currentStock: latestStock ? latestStock.currentStock : 0 };
    });
  }, [products, stock]);

  const recentSales = [...todaySales].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);

  return (
    <div className="pb-24 pt-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t('Good morning')}, 🍊 {settings.shopName}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#2ECC71]">
            <div className="p-2 bg-[#2ECC71]/10 rounded-full"><IndianRupee size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t("Today's Sales")}</span>
          </div>
          <p className="text-xl font-bold text-[#1A1A2E]">{formatCurrency(totalRevenue, settings.currency)}</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#FF6B35]">
            <div className="p-2 bg-[#FF6B35]/10 rounded-full"><TrendingUp size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t("Today's Profit")}</span>
          </div>
          <p className="text-xl font-bold text-[#1A1A2E]">{formatCurrency(totalProfit, settings.currency)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-500">
            <div className="p-2 bg-blue-500/10 rounded-full"><ShoppingBag size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t('Items Sold')}</span>
          </div>
          <p className="text-xl font-bold text-[#1A1A2E]">{itemsSold}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-purple-500">
            <div className="p-2 bg-purple-500/10 rounded-full"><Wallet size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t('Cash in Hand')}</span>
          </div>
          <p className="text-xl font-bold text-[#1A1A2E]">{formatCurrency(cashInHand, settings.currency)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">{t('Weekly Sales')}</h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(val) => `₹${val}`} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.total === maxSale && entry.total > 0 ? '#FF6B35' : '#2ECC71'} fillOpacity={entry.total === maxSale && entry.total > 0 ? 1 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2 text-xs text-[#6B7280]">
          {maxSale > 0 && <span>🔥 Best Day: {weeklyData.find(d => d.total === maxSale)?.name}</span>}
        </div>
      </div>

      {bestSellers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A2E]">{t('Best Sellers')}</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {bestSellers.map((item, i) => (
              <div key={item.product!.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.product!.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">{item.product!.name}</p>
                    <p className="text-xs text-[#6B7280]">{item.qty} {item.product!.unit} sold</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#2ECC71]">{formatCurrency(item.revenue, settings.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
            <AlertCircle size={16} className="text-[#EF4444]" /> {t('Low Stock Alerts')}
          </h2>
          <div className="space-y-2">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-red-900">{item.name}</p>
                    <p className="text-xs text-red-600">Only {item.currentStock} {item.unit} left (Min: {item.threshold})</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentSales.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A2E]">{t('Recent Sales')}</h2>
          <div className="space-y-2">
            {recentSales.map(sale => (
              <div key={sale.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-[#6B7280]">{format(parseISO(sale.timestamp), 'hh:mm a')}</p>
                  <p className="text-sm font-medium text-[#1A1A2E] truncate max-w-[180px]">
                    {sale.items.map(i => `${i.name} (${i.qty})`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1A1A2E]">{formatCurrency(sale.grandTotal, settings.currency)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    sale.paymentMethod === 'Cash' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {sale.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
