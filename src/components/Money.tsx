import React, { useState, useMemo } from 'react';
import { useStore, Expense, ExpenseItem, useTranslation } from '../lib/store';
import { formatCurrency, formatWeight } from '../lib/utils';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, IndianRupee, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';

export const Money = () => {
  const { sales, expenses, setExpenses, products, setProducts, stock, setStock, settings } = useStore();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState('Fruit Purchase');
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  // Fruit Purchase specific state
  const [purchaseItems, setPurchaseItems] = useState<ExpenseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCostPerUnit, setPurchaseCostPerUnit] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  const activeProducts = products.filter(p => p.isActive);

  const handleAddPurchaseItem = () => {
    if (!selectedProductId || !purchaseQty || !purchaseCostPerUnit) {
      showToast('Please fill all fields for the item', 'error');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qty = Number(purchaseQty);
    const costPerUnit = Number(purchaseCostPerUnit);
    const totalCost = qty * costPerUnit;

    const newItem: ExpenseItem = {
      productId: product.id,
      productName: product.name,
      qty,
      unit: product.unit,
      costPricePerUnit: costPerUnit,
      totalCost
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedProductId('');
    setPurchaseQty('');
    setPurchaseCostPerUnit('');
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.totalCost, 0);

  const handleSaveExpense = () => {
    if (expCategory !== 'Fruit Purchase' && (!expAmount || isNaN(Number(expAmount)) || Number(expAmount) <= 0)) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (expCategory === 'Fruit Purchase' && purchaseItems.length === 0) {
      showToast('Please add at least one item to the purchase', 'error');
      return;
    }

    const amountToSave = expCategory === 'Fruit Purchase' ? totalPurchaseAmount : Number(expAmount);

    const newExpense: Expense = {
      id: `e_${Date.now()}`,
      date: expDate,
      category: expCategory,
      amount: amountToSave,
      note: expNote,
      timestamp: new Date().toISOString(),
      ...(expCategory === 'Fruit Purchase' && { items: purchaseItems })
    };

    setExpenses([newExpense, ...expenses]);

    // If it's a Fruit Purchase, update product costs and inventory
    if (expCategory === 'Fruit Purchase') {
      const newProducts = [...products];
      const newStock = [...stock];

      purchaseItems.forEach(item => {
        // Update product cost
        const productIndex = newProducts.findIndex(p => p.id === item.productId);
        if (productIndex >= 0) {
          newProducts[productIndex] = {
            ...newProducts[productIndex],
            costPrice: item.costPricePerUnit
          };
        }

        // Update inventory
        const stockIndex = newStock.findIndex(s => s.productId === item.productId && s.date === today);
        if (stockIndex >= 0) {
          newStock[stockIndex] = {
            ...newStock[stockIndex],
            currentStock: newStock[stockIndex].currentStock + item.qty,
            adjustments: [
              ...newStock[stockIndex].adjustments,
              {
                type: 'Delivery',
                qty: item.qty,
                reason: 'Fruit Purchase',
                timestamp: new Date().toISOString()
              }
            ]
          };
        } else {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const latestStock = stock.filter(s => s.productId === item.productId).sort((a, b) => b.date.localeCompare(a.date))[0];
            const openingStock = latestStock ? latestStock.currentStock : 0;
            
            newStock.push({
              date: today,
              productId: item.productId,
              openingStock: openingStock,
              currentStock: openingStock + item.qty,
              adjustments: [{
                type: 'Delivery',
                qty: item.qty,
                reason: 'Fruit Purchase',
                timestamp: new Date().toISOString()
              }]
            });
          }
        }
      });

      setProducts(newProducts);
      setStock(newStock);
    }

    setIsExpenseModalOpen(false);
    setExpAmount('');
    setExpNote('');
    setPurchaseItems([]);
    showToast('Expense added successfully', 'success');
  };

  const todaySales = sales.filter(s => s.date === today);
  const todayExpenses = expenses.filter(e => e.date === today);

  const totalRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalExpense = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpense;
  const cashInHand = todaySales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0) - totalExpense; // Assuming expenses are paid in cash

  const weeklyData = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySales = sales.filter(s => s.date === dateStr);
      const dayExpenses = expenses.filter(e => e.date === dateStr);
      
      return {
        name: format(day, 'EEE'),
        revenue: daySales.reduce((sum, s) => sum + s.grandTotal, 0),
        expense: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
      };
    });
  }, [sales, expenses]);

  const paymentSplit = useMemo(() => {
    const cash = todaySales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.grandTotal, 0);
    const upi = todaySales.filter(s => s.paymentMethod === 'UPI').reduce((sum, s) => sum + s.grandTotal, 0);
    return [
      { name: 'Cash', value: cash, color: '#8B5CF6' },
      { name: 'UPI', value: upi, color: '#3B82F6' }
    ];
  }, [todaySales]);

  const categories = ['Fruit Purchase', 'Purchase', 'Labour', 'Rent', 'Electricity', 'Packing', 'Other'];

  return (
    <div className="pb-24 pt-6 px-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t('Money Manager')}</h1>
      </div>

      <div className="flex md:grid md:grid-cols-4 overflow-x-auto gap-3 pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className="snap-center shrink-0 w-[200px] md:w-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#2ECC71]">
            <div className="p-2 bg-[#2ECC71]/10 rounded-full"><TrendingUp size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t('Revenue')}</span>
          </div>
          <p className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(totalRevenue, settings.currency)}</p>
        </div>

        <div className="snap-center shrink-0 w-[200px] md:w-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#EF4444]">
            <div className="p-2 bg-[#EF4444]/10 rounded-full"><TrendingDown size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t('Expenses')}</span>
          </div>
          <p className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(totalExpense, settings.currency)}</p>
        </div>

        <div className="snap-center shrink-0 w-[200px] md:w-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#FF6B35]">
            <div className="p-2 bg-[#FF6B35]/10 rounded-full"><IndianRupee size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">{t('Net Profit')}</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-[#2ECC71]' : 'text-[#EF4444]'}`}>
            {formatCurrency(netProfit, settings.currency)}
          </p>
        </div>

        <div className="snap-center shrink-0 w-[200px] md:w-auto bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-purple-500">
            <div className="p-2 bg-purple-500/10 rounded-full"><Wallet size={16} /></div>
            <span className="text-xs font-semibold uppercase tracking-wider">Cash in Hand</span>
          </div>
          <p className="text-2xl font-bold text-[#1A1A2E]">{formatCurrency(cashInHand, settings.currency)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-[#1A1A2E]">Profit & Loss</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['Daily', 'Weekly', 'Monthly'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === range ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#6B7280]'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#2ECC71" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Payment Split</h2>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentSplit} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                    {paymentSplit.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#6B7280]"><div className="w-2 h-2 rounded-full bg-[#8B5CF6]"></div>Cash</div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#6B7280]"><div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>UPI</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="w-16 h-16 bg-[#FF6B35] text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
            >
              <Plus size={32} />
            </button>
            <span className="text-sm font-bold text-[#1A1A2E]">Add Expense</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A2E]">Today's Expenses</h2>
          {todayExpenses.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-[#6B7280] text-sm">
              No expenses recorded today.
            </div>
          ) : (
            <div className="space-y-2">
              {todayExpenses.map(expense => (
                <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                      <TrendingDown size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A2E]">{expense.category}</p>
                      {expense.note && <p className="text-xs text-[#6B7280]">{expense.note}</p>}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm font-bold text-[#EF4444]">{formatCurrency(expense.amount, settings.currency)}</p>
                    <button 
                      onClick={() => {
                        if(window.confirm('Delete this expense?')) {
                          setExpenses(expenses.filter(e => e.id !== expense.id));
                          showToast('Expense deleted', 'success');
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Expense">
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setExpCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                    expCategory === cat ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {expCategory === 'Fruit Purchase' ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h3 className="text-sm font-bold text-[#1A1A2E]">Add Item</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50"
                  >
                    <option value="">Select Fruit</option>
                    {activeProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder="Qty"
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50"
                  />
                  <input
                    type="number"
                    value={purchaseCostPerUnit}
                    onChange={(e) => setPurchaseCostPerUnit(e.target.value)}
                    placeholder={`Cost/${selectedProductId ? activeProducts.find(p => p.id === selectedProductId)?.unit : 'unit'}`}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50"
                  />
                  <button
                    onClick={handleAddPurchaseItem}
                    className="col-span-2 bg-[#1A1A2E] text-white py-2 rounded-lg text-sm font-bold"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {purchaseItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#1A1A2E]">Purchase List</h3>
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 text-sm">
                      <div>
                        <p className="font-bold text-[#1A1A2E]">{item.productName}</p>
                        <p className="text-xs text-[#6B7280]">{formatWeight(item.qty, item.unit)} × {formatCurrency(item.costPricePerUnit, settings.currency)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#EF4444]">{formatCurrency(item.totalCost, settings.currency)}</span>
                        <button onClick={() => handleRemovePurchaseItem(idx)} className="text-gray-400 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-[#6B7280]">Total</span>
                    <span className="text-lg font-bold text-[#EF4444]">{formatCurrency(totalPurchaseAmount, settings.currency)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Amount ({settings.currency})</label>
              <input
                type="number"
                inputMode="decimal"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Note (Optional)</label>
            <input
              type="text"
              value={expNote}
              onChange={(e) => setExpNote(e.target.value)}
              placeholder="e.g., Bought 5kg sugar"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
            />
          </div>

          <button
            onClick={handleSaveExpense}
            className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Save Expense
          </button>
        </div>
      </Modal>
    </div>
  );
};
