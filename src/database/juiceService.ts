/**
 * Juice Service - Handles all juice-related database operations
 */

import { execute, query } from "./database";

export interface JuiceRecipeItem {
  id?: number;
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
  isActive: number;
  recipe?: JuiceRecipeItem[];
}

/**
 * Add a new juice
 */
export const addJuice = async (juice: Juice): Promise<void> => {
  const sql = `
    INSERT INTO juices (id, name, emoji, sellingPrice, isActive)
    VALUES (?, ?, ?, ?, ?)
  `;
  await execute(sql, [
    juice.id,
    juice.name,
    juice.emoji,
    juice.sellingPrice,
    juice.isActive ? 1 : 0,
  ]);

  // Add recipe items if provided
  if (juice.recipe && juice.recipe.length > 0) {
    for (const item of juice.recipe) {
      await addJuiceRecipeItem(juice.id, item);
    }
  }
};

/**
 * Get all juices
 */
export const getJuices = async (): Promise<Juice[]> => {
  const result = await query("SELECT * FROM juices WHERE isActive = 1 ORDER BY name", []);
  const juices = result.values || [];

  // Fetch recipe items for each juice
  for (const juice of juices) {
    juice.recipe = await getJuiceRecipe(juice.id);
  }

  return juices;
};

/**
 * Get all juices including inactive ones
 */
export const getAllJuices = async (): Promise<Juice[]> => {
  const result = await query("SELECT * FROM juices ORDER BY name", []);
  const juices = result.values || [];

  // Fetch recipe items for each juice
  for (const juice of juices) {
    juice.recipe = await getJuiceRecipe(juice.id);
  }

  return juices;
};

/**
 * Get a single juice by ID with recipe
 */
export const getJuiceById = async (id: string): Promise<Juice | null> => {
  const result = await query("SELECT * FROM juices WHERE id = ?", [id]);
  if (result.values && result.values.length > 0) {
    const juice = result.values[0];
    juice.recipe = await getJuiceRecipe(id);
    return juice;
  }
  return null;
};

/**
 * Update a juice
 */
export const updateJuice = async (juice: Juice): Promise<void> => {
  const sql = `
    UPDATE juices 
    SET name = ?, emoji = ?, sellingPrice = ?, isActive = ?
    WHERE id = ?
  `;
  await execute(sql, [juice.name, juice.emoji, juice.sellingPrice, juice.isActive ? 1 : 0, juice.id]);

  // Update recipe items
  if (juice.recipe) {
    // Clear existing recipe
    await execute("DELETE FROM juice_recipe WHERE juiceId = ?", [juice.id]);
    // Add new recipe items
    for (const item of juice.recipe) {
      await addJuiceRecipeItem(juice.id, item);
    }
  }
};

/**
 * Deactivate a juice (soft delete)
 */
export const deactivateJuice = async (juiceId: string): Promise<void> => {
  await execute("UPDATE juices SET isActive = 0 WHERE id = ?", [juiceId]);
};

/**
 * Add a juice recipe item
 */
export const addJuiceRecipeItem = async (juiceId: string, item: JuiceRecipeItem): Promise<void> => {
  const sql = `
    INSERT INTO juice_recipe (juiceId, productId, productName, qtyPerGlass, unit)
    VALUES (?, ?, ?, ?, ?)
  `;
  await execute(sql, [juiceId, item.productId, item.productName, item.qtyPerGlass, item.unit]);
};

/**
 * Get recipe items for a juice
 */
export const getJuiceRecipe = async (juiceId: string): Promise<JuiceRecipeItem[]> => {
  const result = await query("SELECT * FROM juice_recipe WHERE juiceId = ?", [juiceId]);
  return result.values || [];
};

/**
 * Delete a juice recipe item
 */
export const deleteJuiceRecipeItem = async (recipeItemId: number): Promise<void> => {
  await execute("DELETE FROM juice_recipe WHERE id = ?", [recipeItemId]);
};
