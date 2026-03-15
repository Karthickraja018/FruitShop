import React, { useState, useMemo } from 'react';
import { useStore, Product, Juice, SaleItem, Sale, useTranslation } from '../lib/store';
import { formatCurrency, formatWeight } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { X, Plus, Minus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Sales = () => {
  const { products, juices, sales, setSales, stock, setStock, settings } = useStore();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [productType, setProductType] = useState<'fruit' | 'juice'>('fruit');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedJuice, setSelectedJuice] = useState<Juice | null>(null);
  const [qtyInput, setQtyInput] = useState<string>('');
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>(settings.defaultPayment);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const activeProducts = products.filter(p => p.isActive);
  const activeJuices = juices.filter(j => j.isActive);
  const today = format(new Date(), 'yyyy-MM-dd');

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQtyInput('');
  };

  const handleJuiceClick = (juice: Juice) => {
    setSelectedJuice(juice);
    setQtyInput('');
  };

  const handleAddToBill = () => {
    const item = selectedProduct || selectedJuice;
    if (!item || !qtyInput || isNaN(Number(qtyInput)) || Number(qtyInput) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    const qty = Number(qtyInput);
    const total = qty * item.sellingPrice;
    const unit = 'unit' in item ? item.unit : 'glass';

    const existingItemIndex = billItems.findIndex(i => i.productId === item.id);
    if (existingItemIndex >= 0) {
      const newItems = [...billItems];
      newItems[existingItemIndex].qty += qty;
      newItems[existingItemIndex].total += total;
      setBillItems(newItems);
    } else {
      setBillItems([...billItems, {
        productId: item.id,
        name: item.name,
        qty,
        unit,
        unitPrice: item.sellingPrice,
        total
      }]);
    }

    setSelectedProduct(null);
    setSelectedJuice(null);
    setQtyInput('');
  };

  const handleRemoveFromBill = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const grandTotal = billItems.reduce((sum, item) => sum + item.total, 0);

  const handleConfirmSale = () => {
    if (billItems.length === 0) return;

    const newSale: Sale = {
      id: `s_${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: today,
      type: productType,
      items: billItems,
      grandTotal,
      paymentMethod
    };

    setSales([newSale, ...sales]);

    // Update stock
    const newStock = [...stock];
    billItems.forEach(item => {
      if (productType === 'fruit') {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const stockIndex = newStock.findIndex(s => s.productId === item.productId && s.date === today);
          if (stockIndex >= 0) {
            newStock[stockIndex].currentStock -= item.qty;
          } else {
            newStock.push({
              date: today,
              productId: item.productId,
              openingStock: product.unit === 'kg' ? 20 : 50,
              currentStock: (product.unit === 'kg' ? 20 : 50) - item.qty,
              adjustments: []
            });
          }
        }
      } else if (productType === 'juice') {
        const juice = juices.find(j => j.id === item.productId);
        if (juice && juice.recipe) {
          juice.recipe.forEach(recipeItem => {
            const totalQtyUsed = recipeItem.qtyPerGlass * item.qty;
            const stockIndex = newStock.findIndex(s => s.productId === recipeItem.productId && s.date === today);
            
            if (stockIndex >= 0) {
              newStock[stockIndex].currentStock -= totalQtyUsed;
              newStock[stockIndex].adjustments.push({
                type: 'juice_usage',
                qty: totalQtyUsed,
                reason: `Used for ${item.qty} ${juice.name}`,
                timestamp: new Date().toISOString()
              });
            } else {
              const product = products.find(p => p.id === recipeItem.productId);
              if (product) {
                newStock.push({
                  date: today,
                  productId: recipeItem.productId,
                  openingStock: product.unit === 'kg' ? 20 : 50,
                  currentStock: (product.unit === 'kg' ? 20 : 50) - totalQtyUsed,
                  adjustments: [{
                    type: 'juice_usage',
                    qty: totalQtyUsed,
                    reason: `Used for ${item.qty} ${juice.name}`,
                    timestamp: new Date().toISOString()
                  }]
                });
              }
            }
          });
        }
      }
    });
    setStock(newStock);

    setBillItems([]);
    showToast('Sale confirmed successfully!', 'success');
  };

  const groupedSales: Record<string, Sale[]> = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    const filteredSales = showFullHistory ? sales : sales.filter(s => s.date === today);
    
    filteredSales.forEach(sale => {
      let groupKey = sale.date;
      if (sale.date === today) groupKey = 'Today';
      else if (sale.date === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')) groupKey = 'Yesterday';
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(sale);
    });
    return groups;
  }, [sales, today, showFullHistory]);

  return (
    <div className="pb-24 pt-6 px-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'new' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
            onClick={() => setActiveTab('new')}
          >
            {t('New Sale')}
          </button>
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
            onClick={() => setActiveTab('history')}
          >
            {t('History')}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] bg-gray-100 px-3 py-2 rounded-xl">
          <Calendar size={14} />
          Today — {format(new Date(), 'MMM d')}
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${productType === 'fruit' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
              onClick={() => setProductType('fruit')}
            >
              🍎 Fruits
            </button>
            <button
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${productType === 'juice' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
              onClick={() => setProductType('juice')}
            >
              🥤 Juices
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain pb-4">
            <div className="grid grid-cols-2 gap-3">
              {productType === 'fruit' ? (
                activeProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span className="text-4xl">{product.emoji}</span>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#1A1A2E]">{product.name}</p>
                      <p className="text-xs text-[#6B7280]">{formatCurrency(product.sellingPrice, settings.currency)}/{product.unit}</p>
                    </div>
                  </button>
                ))
              ) : (
                activeJuices.map(juice => (
                  <button
                    key={juice.id}
                    onClick={() => handleJuiceClick(juice)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span className="text-4xl">{juice.emoji}</span>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#1A1A2E]">{juice.name}</p>
                      <p className="text-xs text-[#6B7280]">{formatCurrency(juice.sellingPrice, settings.currency)}/glass</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {billItems.length > 0 && (
            <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 p-5 shrink-0 -mx-4 -mb-6 pb-24">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#FF6B35]" /> {t('Current Bill')}
                </h3>
                <button onClick={() => setBillItems([])} className="text-xs text-red-500 font-medium">Clear</button>
              </div>
              
              <div className="max-h-[150px] overflow-y-auto mb-4 space-y-2">
                {billItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-[#1A1A2E]">{item.name}</p>
                      <p className="text-xs text-[#6B7280]">{formatWeight(item.qty, item.unit)} × {formatCurrency(item.unitPrice, settings.currency)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#1A1A2E]">{formatCurrency(item.total, settings.currency)}</span>
                      <button onClick={() => handleRemoveFromBill(idx)} className="text-gray-400 hover:text-red-500 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#6B7280]">{t('Total Amount')}</span>
                  <span className="text-2xl font-bold text-[#2ECC71]">{formatCurrency(grandTotal, settings.currency)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${paymentMethod === 'Cash' ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#6B7280]'}`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('UPI')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${paymentMethod === 'UPI' ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#6B7280]'}`}
                  >
                    UPI
                  </button>
                </div>

                <button
                  onClick={handleConfirmSale}
                  className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
                >
                  {t('Confirm Sale')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto space-y-6">
          {Object.keys(groupedSales).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <span className="text-6xl mb-4">🛒</span>
              <p className="text-[#1A1A2E] font-medium">No sales yet</p>
              <p className="text-sm text-[#6B7280]">Your sales history will appear here.</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedSales).map(([group, groupSales]) => (
                <div key={group} className="space-y-3">
                  <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider sticky top-0 bg-[#F9FAFB] py-2 z-10">{group}</h3>
                  <div className="space-y-2">
                    {groupSales.map(sale => (
                      <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div 
                          className="p-4 flex justify-between items-center cursor-pointer"
                          onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        >
                          <div>
                            <p className="text-xs text-[#6B7280] mb-1">{format(parseISO(sale.timestamp), 'hh:mm a')}</p>
                            <p className="text-sm font-bold text-[#1A1A2E]">{formatCurrency(sale.grandTotal, settings.currency)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                              sale.paymentMethod === 'Cash' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {sale.paymentMethod}
                            </span>
                            {expandedSaleId === sale.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedSaleId === sale.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-2"
                            >
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-[#6B7280]">{item.name} ({formatWeight(item.qty, item.unit)})</span>
                                  <span className="font-medium text-[#1A1A2E]">{formatCurrency(item.total, settings.currency)}</span>
                                </div>
                              ))}
                              <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-xs">
                                <button 
                                  onClick={() => {
                                    if(window.confirm('Delete this sale?')) {
                                      setSales(sales.filter(s => s.id !== sale.id));
                                      showToast('Sale deleted', 'success');
                                    }
                                  }}
                                  className="text-red-500 font-medium flex items-center gap-1"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!showFullHistory && (
                <button
                  onClick={() => setShowFullHistory(true)}
                  className="w-full py-4 text-sm font-bold text-[#FF6B35] bg-orange-50 rounded-xl"
                >
                  View Full History
                </button>
              )}
            </>
          )}
        </div>
      )}

      <Modal isOpen={!!selectedProduct || !!selectedJuice} onClose={() => { setSelectedProduct(null); setSelectedJuice(null); }} title={selectedProduct ? `Add ${selectedProduct.name}` : selectedJuice ? `Add ${selectedJuice.name}` : ''}>
        {(selectedProduct || selectedJuice) && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-6xl">{(selectedProduct || selectedJuice)?.emoji}</span>
              <div>
                <p className="text-xl font-bold text-[#1A1A2E]">{(selectedProduct || selectedJuice)?.name}</p>
                <p className="text-sm text-[#6B7280]">{formatCurrency((selectedProduct || selectedJuice)?.sellingPrice || 0, settings.currency)} / {selectedProduct ? selectedProduct.unit : 'glass'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#1A1A2E]">
                {selectedProduct?.unit === 'kg' ? 'Enter weight in kg' : selectedProduct?.unit === 'piece' ? 'Quantity (nos)' : 'Number of glasses'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                autoFocus
              />
            </div>

            {qtyInput && !isNaN(Number(qtyInput)) && (
              <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-center font-medium">
                {formatWeight(Number(qtyInput), selectedProduct ? selectedProduct.unit : 'glass')} × {formatCurrency((selectedProduct || selectedJuice)?.sellingPrice || 0, settings.currency)} = 
                <span className="text-xl font-bold ml-2">
                  {formatCurrency(Number(qtyInput) * ((selectedProduct || selectedJuice)?.sellingPrice || 0), settings.currency)}
                </span>
              </div>
            )}

            <button
              onClick={handleAddToBill}
              className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
            >
              Add to Bill
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
