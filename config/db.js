const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Set database file path
const dbPath = "/home/accurate/AccurateDamoov/raxel_traker_db_100325.db";

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

module.exports = db;
