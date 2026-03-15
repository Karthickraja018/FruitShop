/**
 * Sales Service - Handles all sales-related database operations
 */

import { execute, query } from "./database";

export interface SaleItem {
  id?: number;
  saleId?: string;
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
  type: "fruit" | "juice";
  grandTotal: number;
  paymentMethod: string;
  items?: SaleItem[];
}

/**
 * Add a new sale with items
 */
export const addSale = async (sale: Sale): Promise<void> => {
  const sql = `
    INSERT INTO sales (id, timestamp, date, type, grandTotal, paymentMethod)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [sale.id, sale.timestamp, sale.date, sale.type, sale.grandTotal, sale.paymentMethod]);

  // Add sale items
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      await addSaleItem(sale.id, item);
    }
  }
};

/**
 * Get all sales
 */
export const getSales = async (): Promise<Sale[]> => {
  const result = await query("SELECT * FROM sales ORDER BY timestamp DESC", []);
  const sales = result.values || [];

  // Fetch items for each sale
  for (const sale of sales) {
    sale.items = await getSaleItems(sale.id);
  }

  return sales;
};

/**
 * Get sales by date
 */
export const getSalesByDate = async (date: string): Promise<Sale[]> => {
  const result = await query("SELECT * FROM sales WHERE date = ? ORDER BY timestamp DESC", [date]);
  const sales = result.values || [];

  // Fetch items for each sale
  for (const sale of sales) {
    sale.items = await getSaleItems(sale.id);
  }

  return sales;
};

/**
 * Get a single sale by ID
 */
export const getSaleById = async (id: string): Promise<Sale | null> => {
  const result = await query("SELECT * FROM sales WHERE id = ?", [id]);
  if (result.values && result.values.length > 0) {
    const sale = result.values[0];
    sale.items = await getSaleItems(id);
    return sale;
  }
  return null;
};

/**
 * Update a sale
 */
export const updateSale = async (sale: Sale): Promise<void> => {
  const sql = `
    UPDATE sales 
    SET timestamp = ?, date = ?, type = ?, grandTotal = ?, paymentMethod = ?
    WHERE id = ?
  `;
  await execute(sql, [sale.timestamp, sale.date, sale.type, sale.grandTotal, sale.paymentMethod, sale.id]);

  // Update items
  if (sale.items) {
    // Clear existing items
    await execute("DELETE FROM sale_items WHERE saleId = ?", [sale.id]);
    // Add new items
    for (const item of sale.items) {
      await addSaleItem(sale.id, item);
    }
  }
};

/**
 * Delete a sale
 */
export const deleteSale = async (saleId: string): Promise<void> => {
  // Delete items first (foreign key constraint)
  await execute("DELETE FROM sale_items WHERE saleId = ?", [saleId]);
  // Delete sale
  await execute("DELETE FROM sales WHERE id = ?", [saleId]);
};

/**
 * Add a sale item
 */
export const addSaleItem = async (saleId: string, item: SaleItem): Promise<void> => {
  const sql = `
    INSERT INTO sale_items (saleId, productId, name, qty, unit, unitPrice, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [saleId, item.productId, item.name, item.qty, item.unit, item.unitPrice, item.total]);
};

/**
 * Get all items for a sale
 */
export const getSaleItems = async (saleId: string): Promise<SaleItem[]> => {
  const result = await query("SELECT * FROM sale_items WHERE saleId = ?", [saleId]);
  return result.values || [];
};

/**
 * Delete a sale item
 */
export const deleteSaleItem = async (itemId: number): Promise<void> => {
  await execute("DELETE FROM sale_items WHERE id = ?", [itemId]);
};

/**
 * Get sales summary by date range
 */
export const getSalesSummary = async (
  startDate: string,
  endDate: string
): Promise<{
  totalRevenue: number;
  totalItems: number;
  totalTransactions: number;
}> => {
  const result = await query(
    "SELECT COUNT(*) as count, SUM(grandTotal) as total FROM sales WHERE date BETWEEN ? AND ?",
    [startDate, endDate]
  );

  const row = result.values?.[0];
  const itemsResult = await query(
    "SELECT SUM(qty) as total FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE date BETWEEN ? AND ?)",
    [startDate, endDate]
  );
  const itemsRow = itemsResult.values?.[0];

  return {
    totalRevenue: row?.total || 0,
    totalItems: itemsRow?.total || 0,
    totalTransactions: row?.count || 0,
  };
};
