/**
 * Product Service - Handles all product-related database operations
 */

import { execute, query } from "./database";

export interface Product {
  id: string;
  name: string;
  emoji: string;
  category: string;
  unit: "kg" | "piece";
  sellingPrice: number;
  costPrice: number;
  threshold: number;
  isActive: number;
  priceHistory?: { id: number; productId: string; price: number; date: string }[];
}

/**
 * Add a new product
 */
export const addProduct = async (product: Product): Promise<void> => {
  const sql = `
    INSERT INTO products (id, name, emoji, category, unit, sellingPrice, costPrice, threshold, isActive)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [
    product.id,
    product.name,
    product.emoji,
    product.category,
    product.unit,
    product.sellingPrice,
    product.costPrice,
    product.threshold,
    product.isActive ? 1 : 0,
  ]);
};

/**
 * Get all products
 */
export const getProducts = async (): Promise<Product[]> => {
  const result = await query("SELECT * FROM products WHERE isActive = 1 ORDER BY name", []);
  return result.values || [];
};

/**
 * Get all products including inactive ones
 */
export const getAllProducts = async (): Promise<Product[]> => {
  const result = await query("SELECT * FROM products ORDER BY name", []);
  return result.values || [];
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  const result = await query("SELECT * FROM products WHERE id = ?", [id]);
  return result.values && result.values.length > 0 ? result.values[0] : null;
};

/**
 * Update a product
 */
export const updateProduct = async (product: Product): Promise<void> => {
  const sql = `
    UPDATE products 
    SET name = ?, emoji = ?, category = ?, unit = ?, sellingPrice = ?, costPrice = ?, threshold = ?, isActive = ?
    WHERE id = ?
  `;
  await execute(sql, [
    product.name,
    product.emoji,
    product.category,
    product.unit,
    product.sellingPrice,
    product.costPrice,
    product.threshold,
    product.isActive ? 1 : 0,
    product.id,
  ]);
};

/**
 * Deactivate a product (soft delete)
 */
export const deactivateProduct = async (productId: string): Promise<void> => {
  await execute("UPDATE products SET isActive = 0 WHERE id = ?", [productId]);
};

/**
 * Add product price history entry
 */
export const addPriceHistory = async (
  productId: string,
  price: number,
  date: string
): Promise<void> => {
  await execute("INSERT INTO product_price_history (productId, price, date) VALUES (?, ?, ?)", [
    productId,
    price,
    date,
  ]);
};

/**
 * Get price history for a product
 */
export const getPriceHistory = async (productId: string): Promise<any[]> => {
  const result = await query(
    "SELECT * FROM product_price_history WHERE productId = ? ORDER BY date DESC",
    [productId]
  );
  return result.values || [];
};
