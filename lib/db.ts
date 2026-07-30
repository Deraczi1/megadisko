import mysql from "mysql2/promise"

// Konfiguracja połączenia z MySQL.
// Wartości można nadpisać przez zmienne środowiskowe.
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "widenka1",
  database: process.env.DB_NAME || "LLPKDatabase",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

let schemaReady = false

// Sprawdza czy kolumna istnieje (do bezpiecznych migracji).
async function columnExists(table: string, column: string): Promise<boolean> {
  const p = getPool()
  const [rows]: any = await p.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, table, column],
  )
  return rows[0].c > 0
}

// Tworzy tabele przy pierwszym użyciu, jeśli jeszcze nie istnieją.
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return
  const p = getPool()

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      assigned_user_id INT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      notification_email VARCHAR(255) NULL,
      config JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_forms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Migracje dla istniejących baz (dodanie brakujących kolumn).
  if (!(await columnExists("users", "role"))) {
    await p.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'`)
  }
  if (!(await columnExists("forms", "assigned_user_id"))) {
    await p.query(`ALTER TABLE forms ADD COLUMN assigned_user_id INT NULL`)
  }

  await p.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_id INT NOT NULL,
      name VARCHAR(255) NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      select_value VARCHAR(255) NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_submissions_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Połączone czaty Telegram, które otrzymują powiadomienia o zgłoszeniach.
  // chat_id trzymamy jako VARCHAR, bo identyfikatory grup/kanałów bywają bardzo duże i ujemne.
  await p.query(`
    CREATE TABLE IF NOT EXISTS telegram_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_id INT NOT NULL,
      chat_id VARCHAR(32) NOT NULL,
      chat_title VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_form_chat (form_id, chat_id),
      CONSTRAINT fk_tg_link_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Jednorazowe kody aktywacyjne (ważne 10 minut) używane w komendzie /polacz.
  await p.query(`
    CREATE TABLE IF NOT EXISTS telegram_codes (
      code VARCHAR(16) PRIMARY KEY,
      form_id INT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_tg_code_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  schemaReady = true
}

// Pomocnicza funkcja do zapytań z automatyczną inicjalizacją schematu.
export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  await ensureSchema()
  const [rows] = await getPool().query(sql, params)
  return rows as T
}
