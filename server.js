import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cors());

async function createDatabaseIfNotExists() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password"
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS tracking_db_2_0`);
  console.log("✅ Database 'tracking_db_2_0' checked/created.");
  await connection.end();
}

await createDatabaseIfNotExists();

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "tracking_db_2_0",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function verifyDatabaseAndTables() {
  const connection = await pool.getConnection();

 const tableDefinitions = {
 users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255)
    )`,
  devices: `
    CREATE TABLE IF NOT EXISTS devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255) UNIQUE,
      device_name VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  TrackTable: `
    CREATE TABLE IF NOT EXISTS TrackTable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      track_id VARCHAR(255),
      track_state VARCHAR(255),
      start_date BIGINT,
      stop_reason VARCHAR(255),
      start_reason VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  LastKnownPointTable: `
    CREATE TABLE IF NOT EXISTS LastKnownPointTable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      track_id VARCHAR(255),
      latitude DOUBLE,
      longitude DOUBLE,
      accuracy FLOAT,
      point_date VARCHAR(255),
      point_origin VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  EventsTable: `
    CREATE TABLE IF NOT EXISTS EventsTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      UUID VARCHAR(255),
      timeStart BIGINT,
      duration FLOAT,
      pureDuration FLOAT,
      speedStart FLOAT,
      speedStop FLOAT,
      speedMedian FLOAT,
      prevEventSpeed FLOAT,
      accelerationDirect FLOAT,
      accelerationLateral FLOAT,
      accelerationVertical FLOAT,
      accelerationDirectEnd FLOAT,
      accelerationLateralEnd FLOAT,
      accelerationVerticalEnd FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      accidentTrigger VARCHAR(255),
      reliability FLOAT,
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  EventsStartPointTable: `
    CREATE TABLE IF NOT EXISTS EventsStartPointTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      latitude DOUBLE,
      longitude DOUBLE,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  EventsStopPointTable: `
    CREATE TABLE IF NOT EXISTS EventsStopPointTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      latitude DOUBLE,
      longitude DOUBLE,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  RangeDirectTable: `
    CREATE TABLE IF NOT EXISTS RangeDirectTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      max FLOAT,
      min FLOAT,
      median FLOAT,
      quantile_05 FLOAT,
      quantile_95 FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  RangeLateralTable: `
    CREATE TABLE IF NOT EXISTS RangeLateralTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      max FLOAT,
      min FLOAT,
      median FLOAT,
      quantile_05 FLOAT,
      quantile_95 FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  RangeVerticalTable: `
    CREATE TABLE IF NOT EXISTS RangeVerticalTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      max FLOAT,
      min FLOAT,
      median FLOAT,
      quantile_05 FLOAT,
      quantile_95 FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  RangeAccuracyTable: `
    CREATE TABLE IF NOT EXISTS RangeAccuracyTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      max FLOAT,
      min FLOAT,
      median FLOAT,
      quantile_05 FLOAT,
      quantile_95 FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  RangeSpeedTable: `
    CREATE TABLE IF NOT EXISTS RangeSpeedTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      max FLOAT,
      min FLOAT,
      median FLOAT,
      quantile_05 FLOAT,
      quantile_95 FLOAT,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  SampleTable: `
    CREATE TABLE IF NOT EXISTS SampleTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      latitude DOUBLE,
      longitude DOUBLE,
      timestamp BIGINT,
      tick_timestamp BIGINT,
      speed_kmh FLOAT,
      midSpeed FLOAT,
      course FLOAT,
      height FLOAT,
      acceleration FLOAT,
      deceleration FLOAT,
      \`lateral\` FLOAT,
      yaw FLOAT,
      total_meters FLOAT,
      established_indexA INT,
      established_indexB INT,
      start_date TEXT,
      end_date TEXT,
      unique_id VARCHAR(255),
      number VARCHAR(255),
      device_id VARCHAR(255),
      user_id INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      acceleration_x FLOAT,
      acceleration_y FLOAT,
      acceleration_z FLOAT,
      gyroscope_x FLOAT,
      gyroscope_y FLOAT,
      gyroscope_z FLOAT,
      acceleration_x_original FLOAT,
      acceleration_y_original FLOAT,
      acceleration_z_original FLOAT,
      gyroscope_x_original FLOAT,
      gyroscope_y_original FLOAT,
      gyroscope_z_original FLOAT,
      accuracy FLOAT,
      screen_on BOOLEAN,
      screen_blocked BOOLEAN,
      vehicle_indicators VARCHAR(255),
      quantile TEXT
    )`
};


  for (const [tableName, createSQL] of Object.entries(tableDefinitions)) {
    try {
      await connection.query(createSQL);
      console.log(`✅ Table "${tableName}" is ready.`);
    } catch (err) {
      console.error(`❌ Failed to create table "${tableName}":`, err.message);
    }
  }

  connection.release();
}

await verifyDatabaseAndTables();

const insertBulkData = async (table, columns, records, res) => {
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: "No records provided!" });
  }

  // Escape column names
  const placeholders = columns.map(() => "?").join(", ");
  const escapedColumns = columns.map(col => `\`${col}\``).join(", ");
  const sql = `INSERT INTO \`${table}\` (${escapedColumns}) VALUES (${placeholders})`;

  try {
    const connection = await pool.getConnection();
    let insertedCount = 0;

    for (const [index, record] of records.entries()) {
      try {
        // Clean undefined -> null
        const values = columns.map(col => record[col] === undefined ? null : record[col]);

        await connection.execute(sql, values);
        insertedCount++;
      } catch (err) {
        // Show which values are undefined
        columns.forEach((col) => {
          if (record[col] === undefined) {
            console.warn(`⚠️ Undefined value for column '${col}' at index ${index}`);
          }
        });

        console.error(`❌ Insert failed at index ${index} in ${table}:`, err.message);

        if (err.message.includes("doesn't exist")) {
          connection.release();
          return res.status(500).json({ success: false, error: `Table "${table}" does not exist!` });
        }
      }
    }

    connection.release();

    if (insertedCount === records.length) {
      res.status(200).json({ success: true, message: `✅ ${insertedCount} record(s) inserted.` });
    } else {
      res.status(500).json({ success: false, error: "Some records failed to insert." });
    }

  } catch (err) {
    console.error(`❌ Error inserting into ${table}:`, err.message);
    res.status(500).json({ success: false, error: "Database connection error." });
  }
};



app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Sample route setup for bulk insert
const routes = [
  { path: "/api/TrackTable", table: "TrackTable", columns: ["id", "track_id", "track_state", "start_date", "stop_reason", "start_reason", "device_id", "user_id"] },
  { path: "/api/LastKnownPointTable", table: "LastKnownPointTable", columns: ["id", "track_id", "latitude", "longitude", "accuracy", "point_date", "point_origin", "device_id", "user_id"] },
  { path: "/api/EventsTable", table: "EventsTable", columns: ["ID", "UUID", "timeStart", "duration", "pureDuration", "speedStart", "speedStop", "speedMedian", "prevEventSpeed", "accelerationDirect", "accelerationLateral", "accelerationVertical", "accelerationDirectEnd", "accelerationLateralEnd", "accelerationVerticalEnd", "UNIQUE_ID", "type", "accidentTrigger", "reliability", "device_id", "user_id"] },
  { path: "/api/EventsStartPointTable", table: "EventsStartPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/EventsStopPointTable", table: "EventsStopPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/RangeDirectTable", table: "RangeDirectTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/RangeLateralTable", table: "RangeLateralTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/RangeVerticalTable", table: "RangeVerticalTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/RangeAccuracyTable", table: "RangeAccuracyTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/RangeSpeedTable", table: "RangeSpeedTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/SampleTable", table: "SampleTable", columns: [
    "ID", "latitude", "longitude", "timestamp", "tick_timestamp", "speed_kmh", "midSpeed", "course", "height", "acceleration", "deceleration", "lateral", "yaw", "total_meters", "established_indexA", "established_indexB", "start_date", "end_date", "unique_id", "number", "device_id", "user_id", "acceleration_x", "acceleration_y", "acceleration_z", "gyroscope_x", "gyroscope_y", "gyroscope_z", "acceleration_x_original", "acceleration_y_original", "acceleration_z_original", "gyroscope_x_original", "gyroscope_y_original", "gyroscope_z_original", "accuracy", "screen_on", "screen_blocked", "vehicle_indicators", "quantile"] }
];

routes.forEach(({ path, table, columns }) => {
  app.post(path, (req, res) => {
    if (!req.body.data || !Array.isArray(req.body.data)) {
      return res.status(400).json({ success: false, error: "Invalid request format!" });
    }
    insertBulkData(table, columns, req.body.data, res);
  });
});

app.post('/api/devices', async (req, res) => {
  const { device_id, device_name } = req.body;
  if (!device_id || !device_name) {
    return res.status(400).json({ error: 'device_id and device_name are required' });
  }

  try {
    const [result] = await pool.execute(`
      INSERT INTO devices (device_id, device_name) VALUES (?, ?)
    `, [device_id, device_name]);

    res.status(200).json({ message: 'Device added', id: result.insertId });
  } catch (err) {
    if (err.message.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'Device ID or name already exists' });
    }
    res.status(500).json({ error: 'Failed to insert device' });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to fleet management");
});

app.use(express.static(path.join(__dirname)));

app.get("/ui", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


////////////////////////////////////////////////////////////////
// Generic GET endpoint to fetch all rows from a table
// Allowed tables to prevent SQL injection
const ALLOWED_TABLES = new Set([
  "TrackTable",
  "LastKnownPointTable",
  "EventsTable",
  "EventsStartPointTable",
  "EventsStopPointTable",
  "RangeDirectTable",
  "RangeLateralTable",
  "RangeVerticalTable",
  "RangeAccuracyTable",
  "RangeSpeedTable",
  "SampleTable",
  "devices",
  "users"
  
]);

const getTableData = async (table, res) => {
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: "Invalid table name" });
  }

  try {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error(`❌ Error fetching from ${table}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};




app.get("/api/:table", (req, res) => {
  const tableName = req.params.table.replace(/-/g, '_');
  getTableData(tableName, res);
});


// Serve index.html on /ui route
app.get("/ui", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get('/triprecords', (req, res) => {
  console.log("Entering /triprecords");

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id query parameter' });
  }

  const query = `
    SELECT 
  s1.UNIQUE_ID,
  ROUND(SUM(
    6371 * ACOS(
      COS(RADIANS(s1.latitude)) * COS(RADIANS(s2.latitude)) *
      COS(RADIANS(s2.longitude) - RADIANS(s1.longitude)) +
      SIN(RADIANS(s1.latitude)) * SIN(RADIANS(s2.latitude))
    )
  ), 2) AS distance_km
FROM SampleTable s1
JOIN SampleTable s2
  ON s1.UNIQUE_ID = s2.UNIQUE_ID
  AND s2.id = s1.id + 1
WHERE s1.latitude != 0 AND s1.longitude != 0
  AND s2.latitude != 0 AND s2.longitude != 0
GROUP BY s1.UNIQUE_ID;


  `;

  pool.query(query, [user_id])
    .then(([rows]) => {
      res.status(200).json({ success: true, data: rows });
    })
    .catch((err) => {
      console.error('SQL Error:', err.message);
      res.status(500).json({ error: err.message });
    });

});




app.get('/geopoints', (req, res) => {
  const { unique_id, user_id } = req.query;
  console.log("🔎 /geopoints?unique_id=", unique_id, "user_id=", user_id);

  if (!unique_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing unique_id or user_id query parameter',
    });
  }

  const sql = `
      SELECT latitude, longitude 
    FROM SampleTable 
    WHERE unique_id = ? AND user_id = ? 
      AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY timestamp ASC;

  `;

  pool.query(sql, [unique_id, user_id, unique_id, user_id])
    .then(([rows]) => {
      res.status(200).json({ success: true, data: rows });
    })
    .catch((err) => {
      console.error('❌ Query error:', err);
      res.status(500).json({ success: false, error: err.message });
    });
});



app.get('/triprecordfordevice', async (req, res) => {
  console.log("Entering /triprecordfordevice");

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id query parameter' });
  }

  const query = `
    SELECT 
      s.unique_id,

      DATE_FORMAT(
        FROM_UNIXTIME(MIN(s.tick_timestamp)),
        '%Y-%m-%d %H:%i:%s'
      ) AS start_date_ist,

      DATE_FORMAT(
        FROM_UNIXTIME(MAX(s.tick_timestamp)),
        '%Y-%m-%d %H:%i:%s'
      ) AS end_date_ist,

      DATE_FORMAT(
        SEC_TO_TIME(MAX(s.tick_timestamp) - MIN(s.tick_timestamp)),
        '%H:%i'
      ) AS duration_hh_mm,

      ROUND(MAX(s.total_meters) / 1000, 2) AS distance_km,

      (
        SELECT CONCAT_WS(',', s2.latitude, s2.longitude)
        FROM SampleTable s2
        WHERE s2.unique_id = s.unique_id
          AND s2.latitude IS NOT NULL AND s2.longitude IS NOT NULL
        ORDER BY s2.tick_timestamp ASC
        LIMIT 1
      ) AS start_coordinates,

      (
        SELECT CONCAT_WS(',', s3.latitude, s3.longitude)
        FROM SampleTable s3
        WHERE s3.unique_id = s.unique_id
          AND s3.latitude IS NOT NULL AND s3.longitude IS NOT NULL
        ORDER BY s3.tick_timestamp DESC
        LIMIT 1
      ) AS end_coordinates

    FROM SampleTable s
    WHERE s.tick_timestamp IS NOT NULL
      AND s.user_id = ?
    GROUP BY s.unique_id
    HAVING 
      distance_km >= 0.2
      AND start_coordinates IS NOT NULL
      AND end_coordinates IS NOT NULL
      AND start_coordinates <> end_coordinates
    ORDER BY start_date_ist DESC;
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query("SET time_zone = '+05:30'");

    const [rows] = await connection.query(query, [user_id]);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error in /triprecordfordevice:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    // if (connection) connection.release();
  }
});







app.post('/api/registerWithDevice', async (req, res) => {
  const { email, password, name, device_id, device_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const connection = await pool.getConnection();
  try {
    // Register user
    const password_hash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      [email, password_hash, name || null]
    );
    const user_id = userResult.insertId;

    // Register device if provided
    if (device_id && device_name) {
      try {
        await connection.execute(
          "INSERT INTO devices (device_id, device_name, user_id) VALUES (?, ?, ?)",
          [device_id, device_name, user_id]
        );
      } catch (err) {
        if (err.message.includes('Duplicate entry')) {
          console.log("duplicate entry")
          return res.status(409).json({ error: 'Device ID already exists', user_id });
        }
        throw err;
      }
    }

    res.status(201).json({ success: true, user_id, device_id: device_id || null });
  } catch (err) {
    if (err.message.includes("Duplicate entry")) {
      return res.status(409).json({ error: "Email already registered." });
    }
    res.status(500).json({ error: "Registration failed." });
  } finally {
   // connection.release();
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
      [email, password_hash, name || null]
    );
    res.status(201).json({ success: true, user_id: result.insertId });
  } catch (err) {
    if (err.message.includes("Duplicate entry")) {
      return res.status(409).json({ error: "Email already registered." });
    }
    res.status(500).json({ error: "Registration failed." });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const [rows] = await pool.execute(
      "SELECT id, password_hash, name FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "false" });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    res.status(200).json({ success: true, user_id: user.id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});


////device registration endpoint
app.post('/api/devices', async (req, res) => {
  const { device_id, device_name, user_id } = req.body;
  if (!device_id || !device_name || !user_id) {
    return res.status(400).json({ error: 'device_id, device_name, and user_id are required' });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO devices (device_id, device_name, user_id) VALUES (?, ?, ?)",
      [device_id, device_name, user_id]
    );
    res.status(201).json({ success: true, device_id, id: result.insertId });
  } catch (err) {
    if (err.message.includes('Duplicate entry')) {
      return res.status(409).json({ error: 'Device ID already exists' });
    }
    res.status(500).json({ error: 'Failed to insert device' });
  }
});


app.get('/userprofile', async (req, res) => {
   console.log("inside /api/userprofile");
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, error: "Missing user_id query parameter." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, email, name FROM users WHERE id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ Error fetching user profile:", err.message);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.get('/tripsummaryfordevice', async (req, res) => {
  console.log("Entering /tripsummaryfordevice");

  const { device_id, user_id } = req.query;

  if (!device_id || !user_id) {
    return res.status(400).json({ error: 'Missing device_id or user_id query parameter' });
  }

  const query = `
    SELECT 
      s.unique_id,

      DATE_FORMAT(
        FROM_UNIXTIME(MIN(s.tick_timestamp)),
        '%Y-%m-%d %H:%i:%s'
      ) AS start_date_ist,

      DATE_FORMAT(
        FROM_UNIXTIME(MAX(s.tick_timestamp)),
        '%Y-%m-%d %H:%i:%s'
      ) AS end_date_ist,

      DATE_FORMAT(
        SEC_TO_TIME(MAX(s.tick_timestamp) - MIN(s.tick_timestamp)),
        '%H:%i'
      ) AS duration_hh_mm,

      ROUND(MAX(s.total_meters) / 1000, 2) AS distance_km,

      (
        SELECT CONCAT_WS(',', s2.latitude, s2.longitude)
        FROM SampleTable s2
        WHERE s2.unique_id = s.unique_id
        ORDER BY s2.tick_timestamp ASC
        LIMIT 1
      ) AS start_coordinates,

      (
        SELECT CONCAT_WS(',', s3.latitude, s3.longitude)
        FROM SampleTable s3
        WHERE s3.unique_id = s.unique_id
        ORDER BY s3.tick_timestamp DESC
        LIMIT 1
      ) AS end_coordinates

    FROM SampleTable s
    WHERE s.tick_timestamp IS NOT NULL
      AND s.device_id = ?
      AND s.user_id = ?
    GROUP BY s.unique_id
    HAVING 
      distance_km >= 0.2 AND
      start_coordinates <> end_coordinates
    ORDER BY start_date_ist DESC;
  `;

  try {
    const connection = await pool.getConnection();
    try {
      await connection.query("SET time_zone = '+05:30'");

      const [rows] = await connection.query(query, [device_id, user_id]);

      res.status(200).json({
        success: true,
        data: rows
      });
    } finally {
      //connection.release();
    }
  } catch (err) {
    console.error('Error in /tripsummaryfordevice:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});




app.get('/triprecordsForUser', async (req, res) => {
  console.log("Entering /triprecordsForUser");

  const { user_id } = req.query;
  console.log("Running query for user_id:", user_id);

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id query parameter' });
  }

  const query = `
    SELECT DISTINCT
      sp.UNIQUE_ID,
      t.start_date,
      sp.latitude AS start_latitude,
      sp.longitude AS start_longitude,
      ep.latitude AS end_latitude,
      ep.longitude AS end_longitude,
      sp.device_id,
      d.device_name,
      u.name AS user_name,

      6371 * acos(
        cos(radians(sp.latitude)) * cos(radians(ep.latitude)) *
        cos(radians(ep.longitude) - radians(sp.longitude)) +
        sin(radians(sp.latitude)) * sin(radians(ep.latitude))
      ) AS distance_km

    FROM (
        SELECT e.*
        FROM EventsStartPointTable e
        INNER JOIN (
            SELECT UNIQUE_ID, MIN(ID) AS min_id
            FROM EventsStartPointTable
            GROUP BY UNIQUE_ID
        ) AS min_e
        ON e.UNIQUE_ID = min_e.UNIQUE_ID AND e.ID = min_e.min_id
    ) AS sp

    JOIN (
        SELECT e.*
        FROM EventsStopPointTable e
        INNER JOIN (
            SELECT UNIQUE_ID, MAX(ID) AS max_id
            FROM EventsStopPointTable
            GROUP BY UNIQUE_ID
        ) AS max_e
        ON e.UNIQUE_ID = max_e.UNIQUE_ID AND e.ID = max_e.max_id
    ) AS ep
    ON sp.UNIQUE_ID = ep.UNIQUE_ID AND sp.user_id = ep.user_id

    JOIN TrackTable t
    ON sp.UNIQUE_ID = t.track_id AND sp.user_id = t.user_id

    LEFT JOIN devices d
    ON sp.device_id = d.device_id AND sp.user_id = d.user_id

    LEFT JOIN users u
    ON sp.user_id = u.id

    WHERE
      sp.latitude != 0 AND sp.longitude != 0
      AND ep.latitude != 0 AND ep.longitude != 0
      AND 6371 * acos(
          cos(radians(sp.latitude)) * cos(radians(ep.latitude)) *
          cos(radians(ep.longitude) - radians(sp.longitude)) +
          sin(radians(sp.latitude)) * sin(radians(ep.latitude))
      ) >= 1
      AND t.user_id = ?
      ORDER BY t.start_date DESC;
      ;
  `;

  try {
    const [rows] = await pool.query(query, [user_id]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('SQL Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});



/////////////////////////////////////////////////

const LOCAL_IP = "0.0.0.0";
const PORT = 5555;

app.listen(PORT, LOCAL_IP, () => console.log(`✅ API running at http://${LOCAL_IP}:${PORT}`));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
