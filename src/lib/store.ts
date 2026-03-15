import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { db, auth } from "../firebase";
import { collection, doc, setDoc, getDocs, onSnapshot, query, where, writeBatch, getDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";

export interface Product {
  id: string;
  name: string;
  emoji: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  unit: "kg" | "piece";
  threshold: number;
  isActive: boolean;
  priceHistory: { price: number; date: string }[];
}

export interface JuiceRecipeItem {
  productId: string;
  productName: string;
  qtyPerGlass: number;
  unit: string;
}

export interface Juice {
  id: string;
  name: string;
  emoji: string;
  sellingPrice: number;
  isActive: boolean;
  recipe: JuiceRecipeItem[];
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  date: string;
  type?: "fruit" | "juice";
  items: SaleItem[];
  grandTotal: number;
  paymentMethod: "Cash" | "UPI";
}

export interface StockAdjustment {
  type: "Delivery" | "Wastage" | "Correction" | "juice_usage";
  qty: number;
  reason: string;
  timestamp: string;
}

export interface Stock {
  date: string;
  productId: string;
  openingStock: number;
  currentStock: number;
  adjustments: StockAdjustment[];
}

export interface ExpenseItem {
  productId: string;
  productName: string;
  qty: number;
  unit: string;
  costPricePerUnit: number;
  totalCost: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
  timestamp: string;
  items?: ExpenseItem[];
}

export interface Settings {
  shopName: string;
  currency: string;
  language: string;
  defaultPayment: "Cash" | "UPI";
}

const seedProducts: Product[] = [
  { id: "p1", name: "Banana", emoji: "🍌", category: "Fruit", sellingPrice: 40, costPrice: 25, unit: "kg", threshold: 3, isActive: true, priceHistory: [] },
  { id: "p2", name: "Apple", emoji: "🍎", category: "Fruit", sellingPrice: 150, costPrice: 100, unit: "kg", threshold: 2, isActive: true, priceHistory: [] },
  { id: "p3", name: "Mango", emoji: "🥭", category: "Fruit", sellingPrice: 80, costPrice: 50, unit: "kg", threshold: 4, isActive: true, priceHistory: [] },
  { id: "p4", name: "Grapes", emoji: "🍇", category: "Fruit", sellingPrice: 90, costPrice: 60, unit: "kg", threshold: 2, isActive: true, priceHistory: [] },
  { id: "p5", name: "Orange", emoji: "🍊", category: "Fruit", sellingPrice: 60, costPrice: 40, unit: "kg", threshold: 3, isActive: true, priceHistory: [] },
  { id: "p6", name: "Pineapple", emoji: "🍍", category: "Fruit", sellingPrice: 50, costPrice: 35, unit: "piece", threshold: 5, isActive: true, priceHistory: [] },
  { id: "p7", name: "Watermelon", emoji: "🍉", category: "Fruit", sellingPrice: 80, costPrice: 55, unit: "piece", threshold: 3, isActive: true, priceHistory: [] },
];

const seedJuices: Juice[] = [
  {
    id: "j1",
    name: "Mango Juice",
    emoji: "🥤",
    sellingPrice: 60,
    isActive: true,
    recipe: [{ productId: "p3", productName: "Mango", qtyPerGlass: 0.25, unit: "kg" }]
  },
  {
    id: "j2",
    name: "Banana Shake",
    emoji: "🥤",
    sellingPrice: 50,
    isActive: true,
    recipe: [{ productId: "p1", productName: "Banana", qtyPerGlass: 0.2, unit: "kg" }]
  }
];

export const useStore = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [products, setProductsState] = useState<Product[]>([]);
  const [juices, setJuicesState] = useState<Juice[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [stock, setStockState] = useState<Stock[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [settings, setSettingsState] = useState<Settings>({
    shopName: "FruitTrack Pro",
    currency: "₹",
    language: "English",
    defaultPayment: "Cash",
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    const uid = user.uid;

    const unsubProducts = onSnapshot(collection(db, `users/${uid}/products`), (snap) => {
      if (snap.empty) {
        // Seed products
        seedProducts.forEach(p => setDoc(doc(db, `users/${uid}/products`, p.id), p));
      } else {
        setProductsState(snap.docs.map(d => d.data() as Product));
      }
    });

    const unsubJuices = onSnapshot(collection(db, `users/${uid}/juices`), (snap) => {
      if (snap.empty) {
        // Seed juices
        seedJuices.forEach(j => setDoc(doc(db, `users/${uid}/juices`, j.id), j));
      } else {
        setJuicesState(snap.docs.map(d => d.data() as Juice));
      }
    });

    const unsubSettings = onSnapshot(doc(db, `users/${uid}/settings/shop`), (docSnap) => {
      if (docSnap.exists()) {
        setSettingsState(docSnap.data() as Settings);
      } else {
        setDoc(doc(db, `users/${uid}/settings/shop`), settings);
      }
    });

    // Fetch today's sales and expenses by default, and stock
    const today = format(new Date(), "yyyy-MM-dd");
    
    const unsubSales = onSnapshot(collection(db, `users/${uid}/sales`), (snap) => {
      setSalesState(snap.docs.map(d => d.data() as Sale).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });

    const unsubExpenses = onSnapshot(collection(db, `users/${uid}/expenses`), (snap) => {
      setExpensesState(snap.docs.map(d => d.data() as Expense).sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });

    const unsubStock = onSnapshot(collection(db, `users/${uid}/stock`), (snap) => {
      setStockState(snap.docs.map(d => d.data() as Stock));
    });

    return () => {
      unsubProducts();
      unsubJuices();
      unsubSettings();
      unsubSales();
      unsubExpenses();
      unsubStock();
    };
  }, [isAuthReady]);

  const setProducts = async (newProducts: Product[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    newProducts.forEach(p => {
      batch.set(doc(db, `users/${uid}/products`, p.id), p);
    });
    // For deletions, we'd need to track them, but for now we just add/update.
    // If we need to delete, we should do it explicitly.
    await batch.commit();
  };

  const deleteProduct = async (id: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, `users/${uid}/products`, id), { isActive: false }, { merge: true });
  };

  const setJuices = async (newJuices: Juice[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    newJuices.forEach(j => {
      batch.set(doc(db, `users/${uid}/juices`, j.id), j);
    });
    await batch.commit();
  };

  const deleteJuice = async (id: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, `users/${uid}/juices`, id), { isActive: false }, { merge: true });
  };

  const setSettings = async (newSettings: Settings) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, `users/${uid}/settings/shop`), newSettings);
  };

  const setSales = async (newSales: Sale[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    
    // Find deleted sales
    const deletedSales = sales.filter(s => !newSales.find(ns => ns.id === s.id));
    deletedSales.forEach(s => {
      batch.delete(doc(db, `users/${uid}/sales`, s.id));
    });

    // Add/Update new sales
    newSales.forEach(s => {
      batch.set(doc(db, `users/${uid}/sales`, s.id), s);
    });
    await batch.commit();
  };

  const setExpenses = async (newExpenses: Expense[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    
    // Find deleted expenses
    const deletedExpenses = expenses.filter(e => !newExpenses.find(ne => ne.id === e.id));
    deletedExpenses.forEach(e => {
      batch.delete(doc(db, `users/${uid}/expenses`, e.id));
    });

    // Add/Update new expenses
    newExpenses.forEach(e => {
      batch.set(doc(db, `users/${uid}/expenses`, e.id), e);
    });
    await batch.commit();
  };

  const setStock = async (newStock: Stock[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    newStock.forEach(s => {
      batch.set(doc(db, `users/${uid}/stock`, `${s.date}_${s.productId}`), s);
    });
    await batch.commit();
  };

  return {
    isOffline,
    isAuthReady,
    user, login, logout,
    products, setProducts, deleteProduct,
    juices, setJuices, deleteJuice,
    sales, setSales,
    stock, setStock,
    expenses, setExpenses,
    settings, setSettings,
  };
};

const translations: Record<string, Record<string, string>> = {
  English: {
    'Home': 'Home',
    'Sales': 'Sales',
    'Inventory': 'Inventory',
    'Money': 'Money',
    'Settings': 'Settings',
    'Good morning': 'Good morning',
    'Today\'s Sales': 'Today\'s Sales',
    'Today\'s Profit': 'Today\'s Profit',
    'Items Sold': 'Items Sold',
    'Cash in Hand': 'Cash in Hand',
    'Weekly Sales': 'Weekly Sales',
    'Best Sellers': 'Best Sellers',
    'Low Stock Alerts': 'Low Stock Alerts',
    'Recent Sales': 'Recent Sales',
    'New Sale': 'New Sale',
    'History': 'History',
    'Current Bill': 'Current Bill',
    'Confirm Sale': 'Confirm Sale',
    'Total Amount': 'Total Amount',
    'Stock Overview': 'Stock Overview',
    'Current Stock': 'Current Stock',
    'Wastage Log': 'Wastage Log',
    'Summary': 'Summary',
    'Money Manager': 'Money Manager',
    'Revenue': 'Revenue',
    'Expenses': 'Expenses',
    'Net Profit': 'Net Profit',
    'Add Expense': 'Add Expense',
    'Profit & Loss': 'Profit & Loss',
    'Payment Split': 'Payment Split',
    'My Products': 'My Products',
    'Shop Settings': 'Shop Settings',
    'Price History': 'Price History',
    'Danger Zone': 'Danger Zone',
  },
  Tamil: {
    'Home': 'முகப்பு',
    'Sales': 'விற்பனை',
    'Inventory': 'இருப்பு',
    'Money': 'பணம்',
    'Settings': 'அமைப்புகள்',
    'Good morning': 'காலை வணக்கம்',
    'Today\'s Sales': 'இன்றைய விற்பனை',
    'Today\'s Profit': 'இன்றைய லாபம்',
    'Items Sold': 'விற்கப்பட்டவை',
    'Cash in Hand': 'கையிருப்பு',
    'Weekly Sales': 'வாராந்திர விற்பனை',
    'Best Sellers': 'அதிகம் விற்றவை',
    'Low Stock Alerts': 'குறைந்த இருப்பு',
    'Recent Sales': 'சமீபத்திய விற்பனை',
    'New Sale': 'புதிய விற்பனை',
    'History': 'வரலாறு',
    'Current Bill': 'தற்போதைய பில்',
    'Confirm Sale': 'உறுதி செய்',
    'Total Amount': 'மொத்த தொகை',
    'Stock Overview': 'இருப்பு விவரம்',
    'Current Stock': 'தற்போதைய இருப்பு',
    'Wastage Log': 'வீணானவை',
    'Summary': 'சுருக்கம்',
    'Money Manager': 'பண மேலாளர்',
    'Revenue': 'வருவாய்',
    'Expenses': 'செலவுகள்',
    'Net Profit': 'நிகர லாபம்',
    'Add Expense': 'செலவு சேர்',
    'Profit & Loss': 'லாப நஷ்டம்',
    'Payment Split': 'பணம் செலுத்தும் முறை',
    'My Products': 'என் பொருட்கள்',
    'Shop Settings': 'கடை அமைப்புகள்',
    'Price History': 'விலை வரலாறு',
    'Danger Zone': 'ஆபத்து பகுதி',
  }
};

export const useTranslation = () => {
  const { settings } = useStore();
  const t = (key: string) => {
    return translations[settings.language]?.[key] || key;
  };
  return { t };
};
