import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function initDB() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      steps INTEGER,
      calories INTEGER,
      water INTEGER,
      date TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  return db;
}

export { initDB };
