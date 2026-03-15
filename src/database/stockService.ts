/**
 * Stock Service - Handles all stock-related database operations
 */

import { execute, query } from "./database";

export interface StockAdjustment {
  id?: number;
  stockId?: number;
  type: "Delivery" | "Wastage" | "Correction" | "juice_usage";
  qty: number;
  reason: string;
  timestamp: string;
}

export interface Stock {
  id?: number;
  date: string;
  productId: string;
  openingStock: number;
  currentStock: number;
  adjustments?: StockAdjustment[];
}

/**
 * Update or create stock entry
 */
export const updateStock = async (stock: Stock): Promise<void> => {
  // Check if entry exists for this date and product
  const existing = await query("SELECT id FROM stock WHERE date = ? AND productId = ?", [
    stock.date,
    stock.productId,
  ]);

  if (existing.values && existing.values.length > 0) {
    // Update existing
    const sql = `
      UPDATE stock 
      SET openingStock = ?, currentStock = ?
      WHERE date = ? AND productId = ?
    `;
    await execute(sql, [stock.openingStock, stock.currentStock, stock.date, stock.productId]);
  } else {
    // Insert new
    const sql = `
      INSERT INTO stock (date, productId, openingStock, currentStock)
      VALUES (?, ?, ?, ?)
    `;
    await execute(sql, [stock.date, stock.productId, stock.openingStock, stock.currentStock]);
  }
};

/**
 * Get stock for a product on a specific date
 */
export const getStock = async (productId: string, date: string): Promise<Stock | null> => {
  const result = await query("SELECT * FROM stock WHERE productId = ? AND date = ?", [productId, date]);

  if (result.values && result.values.length > 0) {
    const stock = result.values[0];
    stock.adjustments = await getStockAdjustments(stock.id);
    return stock;
  }
  return null;
};

/**
 * Get latest stock for a product
 */
export const getLatestStock = async (productId: string): Promise<Stock | null> => {
  const result = await query("SELECT * FROM stock WHERE productId = ? ORDER BY date DESC LIMIT 1", [
    productId,
  ]);

  if (result.values && result.values.length > 0) {
    const stock = result.values[0];
    stock.adjustments = await getStockAdjustments(stock.id);
    return stock;
  }
  return null;
};

/**
 * Get all stock entries
 */
export const getAllStock = async (): Promise<Stock[]> => {
  const result = await query("SELECT * FROM stock ORDER BY date DESC, productId", []);
  const stocks = result.values || [];

  // Fetch adjustments for each stock entry
  for (const stock of stocks) {
    stock.adjustments = await getStockAdjustments(stock.id);
  }

  return stocks;
};

/**
 * Get stock for all products on a specific date
 */
export const getStockByDate = async (date: string): Promise<Stock[]> => {
  const result = await query("SELECT * FROM stock WHERE date = ? ORDER BY productId", [date]);
  const stocks = result.values || [];

  // Fetch adjustments for each stock entry
  for (const stock of stocks) {
    stock.adjustments = await getStockAdjustments(stock.id);
  }

  return stocks;
};

/**
 * Add a stock adjustment
 */
export const addStockAdjustment = async (adjustment: StockAdjustment): Promise<void> => {
  const sql = `
    INSERT INTO stock_adjustments (stockId, type, qty, reason, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;
  await execute(sql, [
    adjustment.stockId,
    adjustment.type,
    adjustment.qty,
    adjustment.reason,
    adjustment.timestamp,
  ]);
};

/**
 * Get stock adjustments for a stock entry
 */
export const getStockAdjustments = async (stockId: number): Promise<StockAdjustment[]> => {
  const result = await query("SELECT * FROM stock_adjustments WHERE stockId = ? ORDER BY timestamp DESC", [
    stockId,
  ]);
  return result.values || [];
};

/**
 * Delete a stock adjustment
 */
export const deleteStockAdjustment = async (adjustmentId: number): Promise<void> => {
  await execute("DELETE FROM stock_adjustments WHERE id = ?", [adjustmentId]);
};

/**
 * Get current stock level for a product
 */
export const getCurrentStockLevel = async (productId: string): Promise<number> => {
  const stock = await getLatestStock(productId);
  return stock ? stock.currentStock : 0;
};
