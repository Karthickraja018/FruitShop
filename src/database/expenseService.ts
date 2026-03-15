/**
 * Expense Service - Handles all expense-related database operations
 */

import { execute, query } from "./database";

export interface ExpenseItem {
  id?: number;
  expenseId?: string;
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

/**
 * Add a new expense with items
 */
export const addExpense = async (expense: Expense): Promise<void> => {
  const sql = `
    INSERT INTO expenses (id, date, category, amount, note, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [expense.id, expense.date, expense.category, expense.amount, expense.note, expense.timestamp]);

  // Add expense items
  if (expense.items && expense.items.length > 0) {
    for (const item of expense.items) {
      await addExpenseItem(expense.id, item);
    }
  }
};

/**
 * Get all expenses
 */
export const getExpenses = async (): Promise<Expense[]> => {
  const result = await query("SELECT * FROM expenses ORDER BY timestamp DESC", []);
  const expenses = result.values || [];

  // Fetch items for each expense
  for (const expense of expenses) {
    expense.items = await getExpenseItems(expense.id);
  }

  return expenses;
};

/**
 * Get expenses by date
 */
export const getExpensesByDate = async (date: string): Promise<Expense[]> => {
  const result = await query("SELECT * FROM expenses WHERE date = ? ORDER BY timestamp DESC", [date]);
  const expenses = result.values || [];

  // Fetch items for each expense
  for (const expense of expenses) {
    expense.items = await getExpenseItems(expense.id);
  }

  return expenses;
};

/**
 * Get expenses by date range
 */
export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const result = await query("SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY timestamp DESC", [
    startDate,
    endDate,
  ]);
  const expenses = result.values || [];

  // Fetch items for each expense
  for (const expense of expenses) {
    expense.items = await getExpenseItems(expense.id);
  }

  return expenses;
};

/**
 * Get a single expense by ID
 */
export const getExpenseById = async (id: string): Promise<Expense | null> => {
  const result = await query("SELECT * FROM expenses WHERE id = ?", [id]);
  if (result.values && result.values.length > 0) {
    const expense = result.values[0];
    expense.items = await getExpenseItems(id);
    return expense;
  }
  return null;
};

/**
 * Update an expense
 */
export const updateExpense = async (expense: Expense): Promise<void> => {
  const sql = `
    UPDATE expenses 
    SET date = ?, category = ?, amount = ?, note = ?, timestamp = ?
    WHERE id = ?
  `;
  await execute(sql, [expense.date, expense.category, expense.amount, expense.note, expense.timestamp, expense.id]);

  // Update items
  if (expense.items) {
    // Clear existing items
    await execute("DELETE FROM expense_items WHERE expenseId = ?", [expense.id]);
    // Add new items
    for (const item of expense.items) {
      await addExpenseItem(expense.id, item);
    }
  }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (expenseId: string): Promise<void> => {
  // Delete items first (foreign key constraint)
  await execute("DELETE FROM expense_items WHERE expenseId = ?", [expenseId]);
  // Delete expense
  await execute("DELETE FROM expenses WHERE id = ?", [expenseId]);
};

/**
 * Add an expense item
 */
export const addExpenseItem = async (expenseId: string, item: ExpenseItem): Promise<void> => {
  const sql = `
    INSERT INTO expense_items (expenseId, productId, productName, qty, unit, costPricePerUnit, totalCost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await execute(sql, [
    expenseId,
    item.productId,
    item.productName,
    item.qty,
    item.unit,
    item.costPricePerUnit,
    item.totalCost,
  ]);
};

/**
 * Get all items for an expense
 */
export const getExpenseItems = async (expenseId: string): Promise<ExpenseItem[]> => {
  const result = await query("SELECT * FROM expense_items WHERE expenseId = ?", [expenseId]);
  return result.values || [];
};

/**
 * Delete an expense item
 */
export const deleteExpenseItem = async (itemId: number): Promise<void> => {
  await execute("DELETE FROM expense_items WHERE id = ?", [itemId]);
};

/**
 * Get total expenses by date range
 */
export const getTotalExpenses = async (startDate: string, endDate: string): Promise<number> => {
  const result = await query("SELECT SUM(amount) as total FROM expenses WHERE date BETWEEN ? AND ?", [
    startDate,
    endDate,
  ]);
  return result.values?.[0]?.total || 0;
};
