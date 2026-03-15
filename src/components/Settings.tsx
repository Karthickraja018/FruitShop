import React, { useState } from 'react';
import { useStore, Product, Juice, JuiceRecipeItem, useTranslation } from '../lib/store';
import { formatCurrency } from '../lib/utils';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { Plus, Edit2, Trash2, Save, Store, Settings as SettingsIcon, AlertCircle, CupSoda } from 'lucide-react';

export const Settings = () => {
  const { products, setProducts, juices, setJuices, deleteJuice, settings, setSettings, setSales, setStock, setExpenses, logout } = useStore();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form State
  const [pName, setPName] = useState('');
  const [pEmoji, setPEmoji] = useState('🍎');
  const [pCategory, setPCategory] = useState('Fruit');
  const [pSellingPrice, setPSellingPrice] = useState('');
  const [pCostPrice, setPCostPrice] = useState('');
  const [pUnit, setPUnit] = useState<'kg' | 'piece'>('kg');
  const [pThreshold, setPThreshold] = useState('');
  const [pIsActive, setPIsActive] = useState(true);

  // Juice Form State
  const [isJuiceModalOpen, setIsJuiceModalOpen] = useState(false);
  const [editingJuice, setEditingJuice] = useState<Juice | null>(null);
  const [jName, setJName] = useState('');
  const [jEmoji, setJEmoji] = useState('🥤');
  const [jSellingPrice, setJSellingPrice] = useState('');
  const [jIsActive, setJIsActive] = useState(true);
  const [jRecipe, setJRecipe] = useState<JuiceRecipeItem[]>([]);

  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setPName(product.name);
      setPEmoji(product.emoji);
      setPCategory(product.category);
      setPSellingPrice(product.sellingPrice.toString());
      setPCostPrice(product.costPrice.toString());
      setPUnit(product.unit);
      setPThreshold(product.threshold.toString());
      setPIsActive(product.isActive);
    } else {
      setEditingProduct(null);
      setPName('');
      setPEmoji('🍎');
      setPCategory('Fruit');
      setPSellingPrice('');
      setPCostPrice('');
      setPUnit('kg');
      setPThreshold('5');
      setPIsActive(true);
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!pName || !pSellingPrice || !pCostPrice || !pThreshold) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `p_${Date.now()}`,
      name: pName,
      emoji: pEmoji,
      category: pCategory,
      sellingPrice: Number(pSellingPrice),
      costPrice: Number(pCostPrice),
      unit: pUnit,
      threshold: Number(pThreshold),
      isActive: pIsActive,
      priceHistory: editingProduct ? editingProduct.priceHistory : []
    };

    if (editingProduct && editingProduct.sellingPrice !== newProduct.sellingPrice) {
      newProduct.priceHistory.unshift({
        price: editingProduct.sellingPrice,
        date: new Date().toISOString()
      });
    }

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? newProduct : p));
      showToast('Product updated successfully', 'success');
    } else {
      setProducts([...products, newProduct]);
      showToast('Product added successfully', 'success');
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This may affect historical sales data.')) {
      setProducts(products.filter(p => p.id !== id));
      showToast('Product deleted', 'success');
    }
  };

  const handleOpenJuiceModal = (juice?: Juice) => {
    if (juice) {
      setEditingJuice(juice);
      setJName(juice.name);
      setJEmoji(juice.emoji);
      setJSellingPrice(juice.sellingPrice.toString());
      setJIsActive(juice.isActive);
      setJRecipe([...juice.recipe]);
    } else {
      setEditingJuice(null);
      setJName('');
      setJEmoji('🥤');
      setJSellingPrice('');
      setJIsActive(true);
      setJRecipe([]);
    }
    setIsJuiceModalOpen(true);
  };

  const handleSaveJuice = () => {
    if (!jName || !jSellingPrice) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const newJuice: Juice = {
      id: editingJuice ? editingJuice.id : `j_${Date.now()}`,
      name: jName,
      emoji: jEmoji,
      sellingPrice: Number(jSellingPrice),
      isActive: jIsActive,
      recipe: jRecipe
    };

    if (editingJuice) {
      setJuices(juices.map(j => j.id === editingJuice.id ? newJuice : j));
      showToast('Juice updated successfully', 'success');
    } else {
      setJuices([...juices, newJuice]);
      showToast('Juice added successfully', 'success');
    }

    setIsJuiceModalOpen(false);
  };

  const handleDeleteJuiceItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this juice?')) {
      deleteJuice(id);
      showToast('Juice deleted', 'success');
    }
  };

  const handleResetData = () => {
    if (window.confirm('WARNING: This will delete ALL sales, stock, and expense data. Products and settings will remain. Are you absolutely sure?')) {
      setSales([]);
      setStock([]);
      setExpenses([]);
      showToast('All transaction data has been reset', 'success');
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t('Settings')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
              <Store size={18} className="text-[#FF6B35]" /> {t('My Products')}
            </h2>
            <button
              onClick={() => handleOpenProductModal()}
              className="text-xs font-bold text-[#FF6B35] bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Plus size={14} /> Add New
            </button>
          </div>

          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center ${!product.isActive && 'opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{product.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">{product.name}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs font-bold text-[#2ECC71]">{formatCurrency(product.sellingPrice, settings.currency)}/{product.unit}</span>
                      <span className="text-[10px] text-[#6B7280]">Cost: {formatCurrency(product.costPrice, settings.currency)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenProductModal(product)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-full">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
              <CupSoda size={18} className="text-[#FF6B35]" /> Juice Menu
            </h2>
            <button
              onClick={() => handleOpenJuiceModal()}
              className="text-xs font-bold text-[#FF6B35] bg-orange-50 px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <Plus size={14} /> Add Juice
            </button>
          </div>

          <div className="space-y-3">
            {juices.map(juice => (
              <div key={juice.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center ${!juice.isActive && 'opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{juice.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">{juice.name}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs font-bold text-[#2ECC71]">{formatCurrency(juice.sellingPrice, settings.currency)}/glass</span>
                      <span className="text-[10px] text-[#6B7280]">{juice.recipe.length} ingredients</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpenJuiceModal(juice)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-full">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteJuiceItem(juice.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {juices.length === 0 && (
              <p className="text-sm text-[#6B7280] text-center py-4">No juices added yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
            <SettingsIcon size={18} className="text-[#6B7280]" /> {t('Shop Settings')}
          </h2>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Shop Name</label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Currency</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                >
                  <option value="English">English</option>
                  <option value="Tamil">தமிழ்</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Default Payment</label>
              <select
                value={settings.defaultPayment}
                onChange={(e) => setSettings({ ...settings, defaultPayment: e.target.value as 'Cash' | 'UPI' })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
            <AlertCircle size={18} /> {t('Danger Zone')}
          </h2>
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-xs text-red-800 mb-3">Resetting data will permanently delete all sales, stock history, and expenses. Products and settings will be kept.</p>
            <button
              onClick={handleResetData}
              className="w-full bg-white text-red-600 border border-red-200 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              Reset All Transaction Data
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
            <Store size={18} className="text-[#6B7280]" /> {t('Price History')}
          </h2>
          <div className="space-y-3">
            {products.filter(p => p.priceHistory && p.priceHistory.length > 0).map(product => (
              <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{product.emoji}</span>
                  <p className="text-sm font-bold text-[#1A1A2E]">{product.name}</p>
                </div>
                <div className="space-y-2">
                  {product.priceHistory.map((history, idx) => {
                    const nextPrice = idx === 0 ? product.sellingPrice : product.priceHistory[idx - 1].price;
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-[#6B7280]">{new Date(history.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through">{formatCurrency(history.price, settings.currency)}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-bold text-[#1A1A2E]">{formatCurrency(nextPrice, settings.currency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {products.filter(p => p.priceHistory && p.priceHistory.length > 0).length === 0 && (
              <p className="text-sm text-[#6B7280] text-center py-4">No price changes recorded yet.</p>
            )}
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={logout}
            className="w-full bg-gray-100 text-[#1A1A2E] border border-gray-200 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            Sign Out
          </button>
        </div>
      </div>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? "Edit Product" : "Add Product"} fullHeight>
        <div className="space-y-6 pb-24">
          <div className="flex gap-4">
            <div className="w-24">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Emoji</label>
              <input
                type="text"
                value={pEmoji}
                onChange={(e) => setPEmoji(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Product Name</label>
              <input
                type="text"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="e.g., Apple"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {['Fruit', 'Juice', 'Cut Fruit', 'Combo'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setPCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                    pCategory === cat ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Selling Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{settings.currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={pSellingPrice}
                  onChange={(e) => setPSellingPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Cost Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{settings.currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={pCostPrice}
                  onChange={(e) => setPCostPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3 block">Unit Type</label>
            <div className="flex gap-2">
              {(['kg', 'piece'] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => setPUnit(unit)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                    pUnit === unit ? 'bg-[#1A1A2E] text-white' : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {unit === 'kg' ? 'Per kg' : 'Per piece'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Low Stock Alert Threshold ({pUnit})</label>
            <input
              type="number"
              inputMode="decimal"
              value={pThreshold}
              onChange={(e) => setPThreshold(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">Active Product</p>
              <p className="text-xs text-[#6B7280]">Show in billing screen</p>
            </div>
            <button
              onClick={() => setPIsActive(!pIsActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${pIsActive ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${pIsActive ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button
            onClick={handleSaveProduct}
            className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Save size={20} /> Save Product
          </button>
        </div>
      </Modal>

      <Modal isOpen={isJuiceModalOpen} onClose={() => setIsJuiceModalOpen(false)} title={editingJuice ? "Edit Juice" : "Add Juice"} fullHeight>
        <div className="space-y-6 pb-24">
          <div className="flex gap-4">
            <div className="w-24">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Emoji</label>
              <input
                type="text"
                value={jEmoji}
                onChange={(e) => setJEmoji(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl text-center focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Juice Name</label>
              <input
                type="text"
                value={jName}
                onChange={(e) => setJName(e.target.value)}
                placeholder="e.g., Mango Juice"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2 block">Selling Price (per glass)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{settings.currency}</span>
              <input
                type="number"
                inputMode="decimal"
                value={jSellingPrice}
                onChange={(e) => setJSellingPrice(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">Recipe (Optional)</label>
              <button
                onClick={() => setJRecipe([...jRecipe, { productId: products[0]?.id || '', productName: products[0]?.name || '', qtyPerGlass: 0, unit: products[0]?.unit || 'kg' }])}
                className="text-xs font-bold text-[#FF6B35] flex items-center gap-1"
              >
                <Plus size={14} /> Add Ingredient
              </button>
            </div>
            <div className="space-y-3">
              {jRecipe.map((item, index) => (
                <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) {
                        const newRecipe = [...jRecipe];
                        newRecipe[index] = { ...item, productId: prod.id, productName: prod.name, unit: prod.unit };
                        setJRecipe(newRecipe);
                      }
                    }}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.qtyPerGlass || ''}
                    onChange={(e) => {
                      const newRecipe = [...jRecipe];
                      newRecipe[index].qtyPerGlass = Number(e.target.value);
                      setJRecipe(newRecipe);
                    }}
                    placeholder={`Qty (${item.unit})`}
                    className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50"
                  />
                  <button
                    onClick={() => {
                      const newRecipe = [...jRecipe];
                      newRecipe.splice(index, 1);
                      setJRecipe(newRecipe);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {jRecipe.length === 0 && (
                <p className="text-xs text-[#6B7280] text-center py-2">No ingredients added. This helps track fruit usage.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-bold text-[#1A1A2E]">Active Juice</p>
              <p className="text-xs text-[#6B7280]">Show in billing screen</p>
            </div>
            <button
              onClick={() => setJIsActive(!jIsActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${jIsActive ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${jIsActive ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button
            onClick={handleSaveJuice}
            className="w-full bg-[#FF6B35] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Save size={20} /> Save Juice
          </button>
        </div>
      </Modal>
    </div>
  );
};
