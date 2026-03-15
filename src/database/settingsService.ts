/**
 * Settings Service - Handles application settings
 */

import { execute, query } from "./database";

export interface Settings {
  id?: number;
  shopName: string;
  currency: string;
  language: string;
  defaultPayment: string;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  shopName: "FruitTrack Pro",
  currency: "₹",
  language: "English",
  defaultPayment: "Cash",
};

/**
 * Get settings
 */
export const getSettings = async (): Promise<Settings> => {
  const result = await query("SELECT * FROM settings WHERE id = 1", []);

  if (result.values && result.values.length > 0) {
    return result.values[0];
  }

  // If not found, create default settings
  await setSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
};

/**
 * Update settings
 */
export const setSettings = async (settings: Settings): Promise<void> => {
  // Check if settings exist
  const existing = await query("SELECT id FROM settings WHERE id = 1", []);

  if (existing.values && existing.values.length > 0) {
    // Update existing
    const sql = `
      UPDATE settings 
      SET shopName = ?, currency = ?, language = ?, defaultPayment = ?
      WHERE id = 1
    `;
    await execute(sql, [settings.shopName, settings.currency, settings.language, settings.defaultPayment]);
  } else {
    // Insert new
    const sql = `
      INSERT INTO settings (id, shopName, currency, language, defaultPayment)
      VALUES (1, ?, ?, ?, ?)
    `;
    await execute(sql, [settings.shopName, settings.currency, settings.language, settings.defaultPayment]);
  }
};
