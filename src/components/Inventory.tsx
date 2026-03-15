import React, { useState, useMemo } from 'react';
import { useStore, Product, Stock, useTranslation } from '../lib/store';
import { formatCurrency, formatWeight } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { AlertTriangle, Plus, Minus, Save, History } from 'lucide-react';

export const Inventory = () => {
  const { products, stock, setStock, settings } = useStore();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<'Delivery' | 'Wastage' | 'Correction'>('Delivery');
  const [adjQty, setAdjQty] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stock' | 'wastage'>('stock');

  const today = format(new Date(), 'yyyy-MM-dd');

  const currentStockMap = useMemo(() => {
    const map = new Map<string, Stock>();
    products.forEach(p => {
      const latestStock = stock.filter(s => s.productId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latestStock) {
        map.set(p.id, latestStock);
      } else {
        map.set(p.id, {
          date: today,
          productId: p.id,
          openingStock: 0,
          currentStock: 0,
          adjustments: []
        });
      }
    });
    return map;
  }, [products, stock, today]);

  const handleSaveAdjustment = () => {
    if (!selectedProduct || !adjQty || isNaN(Number(adjQty)) || Number(adjQty) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    const qty = Number(adjQty);
    const newStock = [...stock];
    const stockIndex = newStock.findIndex(s => s.productId === selectedProduct.id && s.date === today);
    
    let currentEntry: Stock;
    
    if (stockIndex >= 0) {
      currentEntry = newStock[stockIndex];
    } else {
      const prevStock = currentStockMap.get(selectedProduct.id);
      currentEntry = {
        date: today,
        productId: selectedProduct.id,
        openingStock: prevStock ? prevStock.currentStock : 0,
        currentStock: prevStock ? prevStock.currentStock : 0,
        adjustments: []
      };
      newStock.push(currentEntry);
    }

    if (adjType === 'Delivery') {
      currentEntry.currentStock += qty;
    } else if (adjType === 'Wastage' || adjType === 'Correction') {
      currentEntry.currentStock -= qty;
      if (currentEntry.currentStock < 0) currentEntry.currentStock = 0;
    }

    currentEntry.adjustments.push({
      type: adjType,
      qty,
      reason: adjReason || adjType,
      timestamp: new Date().toISOString()
    });

    setStock(newStock);
    setSelectedProduct(null);
    setAdjQty('');
    setAdjReason('');
    showToast('Stock updated successfully', 'success');
  };

  const wastageLogs = useMemo(() => {
    const logs: any[] = [];
    stock.forEach(s => {
      s.adjustments.filter(a => a.type === 'Wastage').forEach(a => {
        const product = products.find(p => p.id === s.productId);
        if (product) {
          logs.push({
            ...a,
            product,
            date: s.date,
            loss: a.qty * product.costPrice
          });
        }
      });
    });
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [stock, products]);

  return (
    <div className="pb-24 pt-6 px-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t('Inventory')}</h1>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 shrink-0">
        <button
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'stock' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
          onClick={() => setActiveTab('stock')}
        >
          {t('Current Stock')}
        </button>
        <button
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'wastage' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
          onClick={() => setActiveTab('wastage')}
        >
          {t('Wastage Log')}
        </button>
        <button
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'summary' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
          onClick={() => setActiveTab('summary')}
        >
          {t('Summary')}
        </button>
      </div>

      {activeTab === 'stock' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {products.filter(p => p.isActive).map(product => {
            const stockData = currentStockMap.get(product.id)!;
            const percentage = stockData.openingStock > 0 ? (stockData.currentStock / stockData.openingStock) * 100 : 0;
            const isLow = stockData.currentStock <= product.threshold;
            
            let barColor = 'bg-[#2ECC71]';
            if (percentage < 20 || isLow) barColor = 'bg-[#EF4444]';
            else if (percentage < 50) barColor = 'bg-[#FF6B35]';

            return (
              <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{product.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A2E]">{product.name}</p>
                      <p className="text-xs text-[#6B7280]">Min: {formatWeight(product.threshold, product.unit)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isLow ? 'text-[#EF4444]' : 'text-[#1A1A2E]'}`}>
                      {formatWeight(stockData.currentStock, product.unit)}
                    </p>
                    {isLow && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">Low Stock</span>}
                  </div>
                </div>
                
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${barColor} transition-all duration-500`} 
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'wastage' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {wastageLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <span className="text-6xl mb-4">🗑️</span>
              <p className="text-[#1A1A2E] font-medium">No wastage logged</p>
            </div>
          ) : (
            wastageLogs.map((log, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{log.product.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">{log.product.name}</p>
                    <p className="text-xs text-[#6B7280]">{format(parseISO(log.timestamp), 'dd MMM, hh:mm a')}</p>
                    {log.reason && <p className="text-xs text-gray-500 italic mt-1">"{log.reason}"</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#EF4444]">-{formatWeight(log.qty, log.product.unit)}</p>
                  <p className="text-xs text-[#6B7280]">Loss: {formatCurrency(log.loss, settings.currency)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[#6B7280] uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 font-bold">Open</th>
                    <th className="px-4 py-3 font-bold">Sold</th>
                    <th className="px-4 py-3 font-bold">Waste</th>
                    <th className="px-4 py-3 font-bold">Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.filter(p => p.isActive).map(product => {
                    const stockData = currentStockMap.get(product.id)!;
                    const sold = stockData.openingStock - stockData.currentStock - stockData.adjustments.filter(a => a.type === 'Wastage').reduce((sum, a) => sum + a.qty, 0) + stockData.adjustments.filter(a => a.type === 'Delivery').reduce((sum, a) => sum + a.qty, 0);
                    const wasted = stockData.adjustments.filter(a => a.type === 'Wastage').reduce((sum, a) => sum + a.qty, 0);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-[#1A1A2E]">{product.emoji} {product.name}</td>
                        <td className="px-4 py-3 text-[#6B7280]">{formatWeight(stockData.openingStock, product.unit)}</td>
                        <td className="px-4 py-3 text-[#2ECC71]">{formatWeight(Math.max(0, sold), product.unit)}</td>
                        <td className="px-4 py-3 text-[#EF4444]">{formatWeight(wasted, product.unit)}</td>
                        <td className="px-4 py-3 font-bold text-[#1A1A2E]">{formatWeight(stockData.currentStock, product.unit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button
            onClick={() => showToast('Closing stock saved for today', 'success')}
            className="w-full bg-[#1A1A2E] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-gray-900/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Save size={20} /> Save Closing Stock
          </button>
        </div>
      )}

      <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="Update Stock">
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-6xl">{selectedProduct.emoji}</span>
              <div className="text-center">
                <p className="text-xl font-bold text-[#1A1A2E]">{selectedProduct.name}</p>
                <p className="text-sm text-[#6B7280]">Current: {formatWeight(currentStockMap.get(selectedProduct.id)?.currentStock || 0, selectedProduct.unit)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {(['Delivery', 'Wastage', 'Correction'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setAdjType(type)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    adjType === type 
                      ? type === 'Delivery' ? 'bg-[#2ECC71] text-white' : type === 'Wastage' ? 'bg-[#EF4444] text-white' : 'bg-[#1A1A2E] text-white'
                      : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">
                  Quantity ({selectedProduct.unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g., Spoiled, Supplier delivery"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                />
              </div>
            </div>

            <button
              onClick={handleSaveAdjustment}
              className="w-full bg-[#1A1A2E] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-gray-900/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Save size={20} /> Save Update
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
