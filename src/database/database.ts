/**
 * SQLite Database Initialization for FruitShop POS
 * Initializes the database and creates all necessary tables
 */

import { CapacitorSQLite } from "@capacitor-community/sqlite";

const DB_NAME = "fruitshopDB";
const DB_VERSION = 1;

/**
 * Get the database plugin interface
 */
export const getDB = () => {
  return CapacitorSQLite;
};

/**
 * Execute a SQL statement. Always forwards an explicit values array.
 */
export const execute = async (statement: string, values: any[] = []) => {
  const db = getDB();
  return db.run({
    database: DB_NAME,
    statement,
    values,
  });
};

/**
 * Query SQL data. Always forwards an explicit values array.
 */
export const query = async (statement: string, values: any[] = []) => {
  const db = getDB();
  return db.query({
    database: DB_NAME,
    statement,
    values,
  });
};

/**
 * Initialize the database and create all tables if they don't exist
 */
export const initDB = async () => {
  try {
    const db = getDB();
    
    // Create/initialize connection
    try {
      // First try to create a new connection
      await db.createConnection({
        database: DB_NAME,
        version: DB_VERSION,
        encrypted: false,
        mode: "no-encryption",
      });
    } catch (err) {
      // Connection might already exist, which is ok
      console.log("Connection already exists or error:", err);
    }

    // Ensure the connection is opened before any run/query calls.
    const openState = await db.isDBOpen({ database: DB_NAME });
    if (!openState.result) {
      await db.open({ database: DB_NAME });
    }

    // Create all tables
    await createTables();

    console.log("✓ Database initialized");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

/**
 * Create all database tables with their schemas
 */
const createTables = async () => {
  const tables = [
    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT,
      category TEXT,
      unit TEXT CHECK(unit IN ('kg','piece')),
      sellingPrice REAL,
      costPrice REAL,
      threshold REAL,
      isActive INTEGER DEFAULT 1
    )`,

    // Product Price History table
    `CREATE TABLE IF NOT EXISTS product_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId TEXT,
      price REAL,
      date TEXT,
      FOREIGN KEY(productId) REFERENCES products(id)
    )`,

    // Juices table
    `CREATE TABLE IF NOT EXISTS juices (
      id TEXT PRIMARY KEY,
      name TEXT,
      emoji TEXT,
      sellingPrice REAL,
      isActive INTEGER DEFAULT 1
    )`,

    // Juice Recipe table
    `CREATE TABLE IF NOT EXISTS juice_recipe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      juiceId TEXT,
      productId TEXT,
      productName TEXT,
      qtyPerGlass REAL,
      unit TEXT,
      FOREIGN KEY(juiceId) REFERENCES juices(id),
      FOREIGN KEY(productId) REFERENCES products(id)
    )`,

    // Sales table
    `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      date TEXT,
      type TEXT CHECK(type IN ('fruit','juice')),
      grandTotal REAL,
      paymentMethod TEXT
    )`,

    // Sale Items table
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId TEXT,
      productId TEXT,
      name TEXT,
      qty REAL,
      unit TEXT,
      unitPrice REAL,
      total REAL,
      FOREIGN KEY(saleId) REFERENCES sales(id)
    )`,

    // Expenses table
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT,
      category TEXT,
      amount REAL,
      note TEXT,
      timestamp TEXT
    )`,

    // Expense Items table
    `CREATE TABLE IF NOT EXISTS expense_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expenseId TEXT,
      productId TEXT,
      productName TEXT,
      qty REAL,
      unit TEXT,
      costPricePerUnit REAL,
      totalCost REAL,
      FOREIGN KEY(expenseId) REFERENCES expenses(id)
    )`,

    // Stock table
    `CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      productId TEXT,
      openingStock REAL,
      currentStock REAL
    )`,

    // Stock Adjustments table
    `CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stockId INTEGER,
      type TEXT CHECK(type IN ('Delivery','Wastage','Correction','juice_usage')),
      qty REAL,
      reason TEXT,
      timestamp TEXT,
      FOREIGN KEY(stockId) REFERENCES stock(id)
    )`,

    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      shopName TEXT,
      currency TEXT,
      language TEXT,
      defaultPayment TEXT
    )`,
  ];

  for (const tableQuery of tables) {
    await execute(tableQuery, []);
  }

  console.log("✓ Tables created");
};

/**
 * Close database connection
 */
export const closeDB = async () => {
  const db = getDB();
  try {
    await db.close({
      database: DB_NAME,
    });
  } catch (error) {
    console.warn("Database close warning:", error);
  }
};
