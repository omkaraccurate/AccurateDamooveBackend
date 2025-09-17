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
    user: "fleet",
    password: "fleetpass"
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS accurate_tracking_db`);
  console.log("✅ Database 'accurate_tracking_db' checked/created.");
  await connection.end();
}

await createDatabaseIfNotExists();

const pool = mysql.createPool({
  host: "localhost",
  user: "fleet",
  password: "fleetpass",
  database: "accurate_tracking_db",
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

  SampleTable: `
    CREATE TABLE IF NOT EXISTS SampleTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
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
    )`,
  
  SystemEventsTable: `
    CREATE TABLE IF NOT EXISTS SystemEventsTable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255),
      user_id INT,
      event_message TEXT NOT NULL,
      event_type VARCHAR(100),            
      timestamp BIGINT NOT NULL,  
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

const insertBulkData = async (table, columns, records, res, chunkSize = 500) => {
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: "No records provided!" });
  }

  const escapedColumns = columns.map(col => `\`${col}\``).join(", ");
  const warnings = [];

  // Helper to process a single record
  const processRecord = (record, index) => {
    return columns.map(col => {
      let val = record[col];

      if (val === undefined || val === null) {
        warnings.push(`⚠️ [${table}] Undefined/null value for '${col}' at index ${index}, set to NULL`);
        return null;
      }

      // Latitude/Longitude: store as string to preserve exact formatting
      if (col === "latitude" || col === "longitude") {
        if (typeof val === "number" || typeof val === "string") {
          return val.toString(); // ✅ preserve all decimals & trailing zeros
        } else {
          warnings.push(`⚠️ [${table}] Invalid ${col} at index ${index}, set to NULL`);
          return null;
        }
      }

      return val; // other columns unchanged
    });
  };

  if (warnings.length > 0) {
    console.warn(`Bulk insert warnings for table "${table}" (${warnings.length}):`, warnings.slice(0, 10));
  }

  let connection;
  try {
    connection = await pool.getConnection();

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const placeholders = `(${columns.map(() => "?").join(", ")})`;
      const sql = `INSERT INTO \`${table}\` (${escapedColumns}) VALUES ${chunk.map(() => placeholders).join(", ")}`;

      const values = [];
      chunk.forEach((record, idx) => {
        values.push(...processRecord(record, i + idx));
      });

      await connection.query(sql, values);
    }

    return res.status(200).json({
      success: true,
      message: `✅ Inserted ${records.length} record(s) into ${table}.`
    });

  } catch (err) {
    console.error(`❌ Insert failed in table "${table}":`, err);
    return res.status(500).json({ success: false, error: "Bulk insert failed.", details: err.message });
  } finally {
    if (connection) connection.release();
  }
};



app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Sample route setup for bulk insert
const routes = [
  { path: "/api/TrackTable", table: "TrackTable", columns: ["id", "track_id", "track_state", "start_date", "stop_reason", "start_reason", "device_id", "user_id"] },
  { path: "/api/LastKnownPointTable", table: "LastKnownPointTable", columns: ["id", "track_id", "latitude", "longitude", "accuracy", "point_date", "point_origin", "device_id", "user_id"] },
  { path: "/api/EventsStartPointTable", table: "EventsStartPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id", "user_id"] },
  { path: "/api/EventsStopPointTable", table: "EventsStopPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id", "user_id"] },
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
  "EventsStartPointTable",
  "EventsStopPointTable",
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
    DATE_FORMAT(FROM_UNIXTIME(MIN(s.tick_timestamp)), '%Y-%m-%d %H:%i:%s') AS start_date_ist,
    DATE_FORMAT(FROM_UNIXTIME(MAX(s.tick_timestamp)), '%Y-%m-%d %H:%i:%s') AS end_date_ist,
    DATE_FORMAT(SEC_TO_TIME(MAX(s.tick_timestamp) - MIN(s.tick_timestamp)), '%H:%i') AS duration_hh_mm,
    ROUND(MAX(s.total_meters) / 1000, 2) AS distance_km,
    CONCAT(MIN(s.latitude), ',', MIN(s.longitude)) AS start_coordinates,
    CONCAT(MAX(s.latitude), ',', MAX(s.longitude)) AS end_coordinates
   FROM SampleTable s
   WHERE s.tick_timestamp IS NOT NULL
     AND s.user_id = ?
     AND s.latitude IS NOT NULL
     AND s.longitude IS NOT NULL
   GROUP BY s.unique_id
   HAVING
       distance_km >= 0.2
       AND start_coordinates IS NOT NULL
       AND end_coordinates IS NOT NULL
       AND start_coordinates <> end_coordinates
   ORDER BY start_date_ist DESC
   LIMIT 100
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query("SET time_zone = '+05:30'");

    const [rows] = await connection.query({ sql: query, timeout: 10000 }, [user_id]);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error in /triprecordfordevice:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    if (connection) connection.release();
  }
});





app.get('/triprecordfordevice2', async (req, res) => {
  console.log("Entering /triprecordfordevice");

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id query parameter' });
  }

  const query = `
SELECT
    t.unique_id,
    DATE_FORMAT(FROM_UNIXTIME(start_row.tick_timestamp), '%Y-%m-%d %H:%i:%s') AS start_date_ist,
    DATE_FORMAT(FROM_UNIXTIME(end_row.tick_timestamp), '%Y-%m-%d %H:%i:%s') AS end_date_ist,
    DATE_FORMAT(SEC_TO_TIME(end_row.tick_timestamp - start_row.tick_timestamp), '%H:%i') AS duration_hh_mm,
    ROUND(end_row.total_meters / 1000, 2) AS distance_km,
    CONCAT(MIN(s.latitude), ',', MIN(s.longitude)) AS start_coordinates,
    CONCAT(MAX(s.latitude), ',', MAX(s.longitude)) AS end_coordinates

FROM (
    -- Derived table: compute min/max timestamps per trip
    SELECT 
        unique_id,
        user_id,
        MIN(tick_timestamp) AS min_ts,
        MAX(tick_timestamp) AS max_ts
    FROM SampleTable
    WHERE user_id = ?
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    GROUP BY unique_id, user_id
) t
JOIN SampleTable start_row
    ON start_row.unique_id = t.unique_id
   AND start_row.user_id = t.user_id
   AND start_row.tick_timestamp = t.min_ts
JOIN SampleTable end_row
    ON end_row.unique_id = t.unique_id
   AND end_row.user_id = t.user_id
   AND end_row.tick_timestamp = t.max_ts
WHERE ROUND(end_row.total_meters / 1000, 2) >= 0.2
  AND (start_row.latitude <> end_row.latitude OR start_row.longitude <> end_row.longitude)
ORDER BY start_date_ist DESC
LIMIT 100



  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query("SET time_zone = '+05:30'");

    const [rows] = await connection.query({ sql: query, timeout: 10000 }, [user_id]);

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error in /triprecordfordevice:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    if (connection) connection.release();
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








// GET /api/users-with-devices
app.get('/api/userswithdevices', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        d.id AS device_id,
        d.device_id AS device_unique_id,
        d.device_name
      FROM \`tracking_db_2_0\`.\`users\` u
      LEFT JOIN \`tracking_db_2_0\`.\`devices\` d ON u.id = d.user_id
      ORDER BY u.id
    `);

    const usersMap = {};
    rows.forEach(u => {
      if (!usersMap[u.user_id]) {
        usersMap[u.user_id] = {
          id: u.user_id,
          name: u.user_name,
          email: u.email,
          devices: []
        };
      }
      if (u.device_id) {
        usersMap[u.user_id].devices.push({
          id: u.device_id,
          device_id: u.device_unique_id,
          device_name: u.device_name
        });
      }
    });

    res.json({ success: true, data: Object.values(usersMap) });
  } catch (err) {
    console.error("Error in /api/userswithdevices:", err);
    res.json({ success: false, error: err.message });
  }
});


// POST /api/system-events
// ✅ POST /api/systemevents
app.post("/systemevents", async (req, res) => {
  console.log("inside /systemevents");

  const { device_id, user_id, event_message, event_type, timestamp } = req.body;

  // 🔹 Validate input
  if (!device_id || !user_id || !event_message || !timestamp) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields (device_id, user_id, event_message, timestamp)",
    });
  }

  const query = `
    INSERT INTO SystemEventsTable (device_id, user_id, event_message, event_type, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await pool.execute(query, [
      device_id,
      user_id,
      event_message,
      event_type || null, // event_type can be optional
      timestamp,
    ]);

    res.status(201).json({
      success: true,
      message: "System event logged successfully",
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error("❌ Error inserting system event:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});








/////////////////////////////////////////////////

const LOCAL_IP = "0.0.0.0";
const PORT = 5556;

app.listen(PORT, LOCAL_IP, () => console.log(`✅ API running at http://${LOCAL_IP}:${PORT}`));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
