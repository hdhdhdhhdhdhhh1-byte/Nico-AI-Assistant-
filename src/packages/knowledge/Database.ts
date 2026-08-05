let database: any = null;
let sqliteConn: any = null;
let dbConn: any = null;

export async function getDatabase() {
  if (database || dbConn) return database || dbConn;

  let isNative = false;
  if (typeof window !== "undefined") {
    const cap = (window as any).Capacitor;
    isNative = Boolean(cap?.isNativePlatform?.());
  }

  if (isNative) {
    try {
      const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
      sqliteConn = new SQLiteConnection(CapacitorSQLite);
      dbConn = await sqliteConn.createConnection(
        "nico_knowledge",
        false,
        "no-encryption",
        1,
        false,
      );
      await dbConn.open();

      await dbConn.execute(`
        CREATE TABLE IF NOT EXISTS knowledge(
          id INTEGER PRIMARY KEY,
          title TEXT,
          content TEXT,
          category TEXT,
          keywords TEXT,
          importance_weight REAL DEFAULT 1.0
        );
      `);
      return dbConn;
    } catch (e) {
      console.warn("Native SQLite failed, falling back to SQL.js", e);
    }
  }

  // Fallback to SQL.js for Web
  try {
    if (typeof window !== "undefined") {
      const initSqlJs = (await import("sql.js")).default;
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });
      database = new SQL.Database();
      database.run(`
        CREATE TABLE IF NOT EXISTS knowledge(
          id INTEGER PRIMARY KEY,
          title TEXT,
          content TEXT,
          category TEXT,
          keywords TEXT,
          importance_weight REAL DEFAULT 1.0
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
        CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
      `);
      return database;
    }
  } catch (e) {
    console.warn("SQL.js init failed", e);
  }

  // In-memory stub for server-side / SSR
  return {
    exec: () => [],
    run: () => {},
    prepare: () => ({
      get: () => null,
      all: () => [],
      run: () => ({ changes: 0 }),
      free: () => {},
    }),
    export: () => new Uint8Array(),
  };
}

export async function saveDatabase() {
  if (dbConn) {
    return;
  }

  if (database && typeof database.export === "function") {
    try {
      const data = database.export();
      console.log("SQL.js database exported, size:", data.length);
    } catch {}
  }
}
