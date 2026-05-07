const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function checkDB() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  console.log("--- USERS TABLE ---");
  const users = await db.all("SELECT id, username FROM users");
  console.log(users.length > 0 ? users : "No users registered yet.");

  console.log("\n--- HEALTH LOGS TABLE ---");
  const logs = await db.all("SELECT * FROM health_logs");
  console.log(logs.length > 0 ? logs : "No health logs recorded yet.");

  await db.close();
}

checkDB();
