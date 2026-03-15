/**
 * Store - State management using SQLite database
 * Replaces Firebase with local SQLite for offline-first operation
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { initDB } from "../database/database";
import * as productService from "../database/productService";
import * as juiceService from "../database/juiceService";
import * as salesService from "../database/salesService";
import * as expenseService from "../database/expenseService";
import * as stockService from "../database/stockService";
import * as settingsService from "../database/settingsService";

// Export types from database services
export type Product = productService.Product;
export type JuiceRecipeItem = juiceService.JuiceRecipeItem;
export type Juice = juiceService.Juice;
export type SaleItem = salesService.SaleItem;
export type Sale = salesService.Sale;
export type StockAdjustment = stockService.StockAdjustment;
export type Stock = stockService.Stock;
export type ExpenseItem = expenseService.ExpenseItem;
export type Expense = expenseService.Expense;
export type Settings = settingsService.Settings;

// Seed data for initial database population
const seedProducts: Product[] = [
  {
    id: "p1",
    name: "Banana",
    emoji: "🍌",
    category: "Fruit",
    sellingPrice: 40,
    costPrice: 25,
    unit: "kg",
    threshold: 3,
    isActive: 1,
  },
  {
    id: "p2",
    name: "Apple",
    emoji: "🍎",
    category: "Fruit",
    sellingPrice: 150,
    costPrice: 100,
    unit: "kg",
    threshold: 2,
    isActive: 1,
  },
  {
    id: "p3",
    name: "Mango",
    emoji: "🥭",
    category: "Fruit",
    sellingPrice: 80,
    costPrice: 50,
    unit: "kg",
    threshold: 4,
    isActive: 1,
  },
  {
    id: "p4",
    name: "Grapes",
    emoji: "🍇",
    category: "Fruit",
    sellingPrice: 90,
    costPrice: 60,
    unit: "kg",
    threshold: 2,
    isActive: 1,
  },
  {
    id: "p5",
    name: "Orange",
    emoji: "🍊",
    category: "Fruit",
    sellingPrice: 60,
    costPrice: 40,
    unit: "kg",
    threshold: 3,
    isActive: 1,
  },
  {
    id: "p6",
    name: "Pineapple",
    emoji: "🍍",
    category: "Fruit",
    sellingPrice: 50,
    costPrice: 35,
    unit: "piece",
    threshold: 5,
    isActive: 1,
  },
  {
    id: "p7",
    name: "Watermelon",
    emoji: "🍉",
    category: "Fruit",
    sellingPrice: 80,
    costPrice: 55,
    unit: "piece",
    threshold: 3,
    isActive: 1,
  },
];

const seedJuices: Juice[] = [
  {
    id: "j1",
    name: "Mango Juice",
    emoji: "🥤",
    sellingPrice: 60,
    isActive: 1,
    recipe: [
      { productId: "p3", productName: "Mango", qtyPerGlass: 0.25, unit: "kg" },
    ],
  },
  {
    id: "j2",
    name: "Banana Shake",
    emoji: "🥤",
    sellingPrice: 50,
    isActive: 1,
    recipe: [{ productId: "p1", productName: "Banana", qtyPerGlass: 0.2, unit: "kg" }],
  },
];

let isStoreInitialized = false;

export const useStore = () => {
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [products, setProductsState] = useState<Product[]>([]);
  const [juices, setJuicesState] = useState<Juice[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [stock, setStockState] = useState<Stock[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [settings, setSettingsState] = useState<Settings>(settingsService.DEFAULT_SETTINGS);

  // Initialize database on mount
  useEffect(() => {
    let isMounted = true;

    const initializeStore = async () => {
      if (isStoreInitialized) {
        setIsReady(true);
        if (isMounted) {
          // Load data from database
          await loadAllData();
        }
        return;
      }

      try {
        // Initialize database
        await initDB();
        isStoreInitialized = true;

        // Seed initial data if needed
        const existingProducts = await productService.getProducts();
        if (existingProducts.length === 0) {
          for (const product of seedProducts) {
            await productService.addProduct(product);
          }
        }

        const existingJuices = await juiceService.getJuices();
        if (existingJuices.length === 0) {
          for (const juice of seedJuices) {
            await juiceService.addJuice(juice);
          }
        }

        // Get default settings - this will create them if they don't exist
        const storedSettings = await settingsService.getSettings();
        if (isMounted) {
          setSettingsState(storedSettings);
        }

        // Load all data
        if (isMounted) {
          await loadAllData();
          console.log("✓ Initial data loaded");
          setIsReady(true);
        }

        console.log("✓ Store initialized successfully");
      } catch (error) {
        console.error("Store initialization error:", error);
        if (isMounted) {
          setIsReady(true); // Set ready anyway to show UI
        }
      }
    };

    initializeStore();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadAllData = async () => {
    try {
      const [productsData, juicesData, salesData, stockData, expensesData] =
        await Promise.all([
          productService.getProducts(),
          juiceService.getJuices(),
          salesService.getSales(),
          stockService.getAllStock(),
          expenseService.getExpenses(),
        ]);

      setProductsState(productsData);
      setJuicesState(juicesData);
      setSalesState(salesData);
      setStockState(stockData);
      setExpensesState(expensesData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Product operations
  const setProducts = async (newProducts: Product[]) => {
    try {
      for (const product of newProducts) {
        await productService.updateProduct(product);
      }
      setProductsState(newProducts);
    } catch (error) {
      console.error("Error updating products:", error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productService.deactivateProduct(id);
      setProductsState((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // Juice operations
  const setJuices = async (newJuices: Juice[]) => {
    try {
      for (const juice of newJuices) {
        await juiceService.updateJuice(juice);
      }
      setJuicesState(newJuices);
    } catch (error) {
      console.error("Error updating juices:", error);
    }
  };

  const deleteJuice = async (id: string) => {
    try {
      await juiceService.deactivateJuice(id);
      setJuicesState((prev) => prev.filter((j) => j.id !== id));
    } catch (error) {
      console.error("Error deleting juice:", error);
    }
  };

  // Sales operations
  const setSales = async (newSales: Sale[]) => {
    try {
      // Find deleted sales
      const deletedSales = sales.filter(
        (s) => !newSales.find((ns) => ns.id === s.id)
      );
      for (const sale of deletedSales) {
        await salesService.deleteSale(sale.id);
      }

      // Add/Update new sales
      for (const sale of newSales) {
        const existing = await salesService.getSaleById(sale.id);
        if (existing) {
          await salesService.updateSale(sale);
        } else {
          await salesService.addSale(sale);
        }
      }
      setSalesState(newSales);
    } catch (error) {
      console.error("Error updating sales:", error);
    }
  };

  // Expense operations
  const setExpenses = async (newExpenses: Expense[]) => {
    try {
      // Find deleted expenses
      const deletedExpenses = expenses.filter(
        (e) => !newExpenses.find((ne) => ne.id === e.id)
      );
      for (const expense of deletedExpenses) {
        await expenseService.deleteExpense(expense.id);
      }

      // Add/Update new expenses
      for (const expense of newExpenses) {
        const existing = await expenseService.getExpenseById(expense.id);
        if (existing) {
          await expenseService.updateExpense(expense);
        } else {
          await expenseService.addExpense(expense);
        }
      }
      setExpensesState(newExpenses);
    } catch (error) {
      console.error("Error updating expenses:", error);
    }
  };

  // Stock operations
  const setStock = async (newStock: Stock[]) => {
    try {
      for (const stockEntry of newStock) {
        await stockService.updateStock(stockEntry);
      }
      setStockState(newStock);
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  // Settings operations
  const setSettings = async (newSettings: Settings) => {
    try {
      await settingsService.setSettings(newSettings);
      setSettingsState(newSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  return {
    isReady,
    isOffline,
    products,
    setProducts,
    deleteProduct,
    juices,
    setJuices,
    deleteJuice,
    sales,
    setSales,
    stock,
    setStock,
    expenses,
    setExpenses,
    settings,
    setSettings,
  };
};

// Translations
const translations: Record<string, Record<string, string>> = {
  English: {
    Home: "Home",
    Sales: "Sales",
    Inventory: "Inventory",
    Money: "Money",
    Settings: "Settings",
    "Good morning": "Good morning",
    "Today's Sales": "Today's Sales",
    "Today's Profit": "Today's Profit",
    "Items Sold": "Items Sold",
    "Cash in Hand": "Cash in Hand",
    "Weekly Sales": "Weekly Sales",
    "Best Sellers": "Best Sellers",
    "Low Stock Alerts": "Low Stock Alerts",
    "Recent Sales": "Recent Sales",
    "New Sale": "New Sale",
    History: "History",
    "Current Bill": "Current Bill",
    "Confirm Sale": "Confirm Sale",
    "Total Amount": "Total Amount",
    "Stock Overview": "Stock Overview",
    "Current Stock": "Current Stock",
    "Wastage Log": "Wastage Log",
    Summary: "Summary",
    "Money Manager": "Money Manager",
    Revenue: "Revenue",
    Expenses: "Expenses",
    "Net Profit": "Net Profit",
    "Add Expense": "Add Expense",
    "Profit & Loss": "Profit & Loss",
    "Payment Split": "Payment Split",
    "My Products": "My Products",
    "Shop Settings": "Shop Settings",
    "Price History": "Price History",
    "Danger Zone": "Danger Zone",
  },
  Tamil: {
    Home: "முகப்பு",
    Sales: "விற்பனை",
    Inventory: "இருப்பு",
    Money: "பணம்",
    Settings: "அமைப்புகள்",
    "Good morning": "காலை வணக்கம்",
    "Today's Sales": "இன்றைய விற்பனை",
    "Today's Profit": "இன்றைய லாபம்",
    "Items Sold": "விற்கப்பட்டவை",
    "Cash in Hand": "கையிருப்பு",
    "Weekly Sales": "வாராந்திர விற்பனை",
    "Best Sellers": "அதிகம் விற்றவை",
    "Low Stock Alerts": "குறைந்த இருப்பு",
    "Recent Sales": "சமீபத்திய விற்பனை",
    "New Sale": "புதிய விற்பனை",
    History: "வரலாறு",
    "Current Bill": "தற்போதைய பில்",
    "Confirm Sale": "உறுதி செய்",
    "Total Amount": "மொத்த தொகை",
    "Stock Overview": "இருப்பு விவரம்",
    "Current Stock": "தற்போதைய இருப்பு",
    "Wastage Log": "வீணானவை",
    Summary: "சுருக்கம்",
    "Money Manager": "பண மேலாளர்",
    Revenue: "வருவாய்",
    Expenses: "செலவுகள்",
    "Net Profit": "நிகர லாபம்",
    "Add Expense": "செலவு சேர்",
    "Profit & Loss": "லாப நஷ்டம்",
    "Payment Split": "பணம் செலுத்தும் முறை",
    "My Products": "என் பொருட்கள்",
    "Shop Settings": "கடை அமைப்புகள்",
    "Price History": "விலை வரலாறு",
    "Danger Zone": "ஆபத்து பகுதி",
  },
};

export const useTranslation = () => {
  const { settings } = useStore();
  const t = (key: string) => {
    return translations[settings.language]?.[key] || key;
  };
  return { t };
};
