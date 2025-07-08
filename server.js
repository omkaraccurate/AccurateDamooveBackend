import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

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
  await connection.query(`CREATE DATABASE IF NOT EXISTS tracking_db`);
  console.log("✅ Database 'tracking_db' checked/created.");
  await connection.end();
}

await createDatabaseIfNotExists();

const pool = mysql.createPool({
  host: "localhost",
  user: "fleet",
  password: "fleetpass",
  database: "tracking_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function verifyDatabaseAndTables() {
  const connection = await pool.getConnection();

 const tableDefinitions = {
  TrackTable: `
    CREATE TABLE IF NOT EXISTS TrackTable (
      id INT AUTO_INCREMENT PRIMARY KEY,
      track_id VARCHAR(255),
      track_state VARCHAR(255),
      start_date BIGINT,
      stop_reason VARCHAR(255),
      start_reason VARCHAR(255),
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
    )`,
  EventsStartPointTable: `
    CREATE TABLE IF NOT EXISTS EventsStartPointTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      latitude DOUBLE,
      longitude DOUBLE,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255)
    )`,
  EventsStopPointTable: `
    CREATE TABLE IF NOT EXISTS EventsStopPointTable (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      timeStart BIGINT,
      latitude DOUBLE,
      longitude DOUBLE,
      UNIQUE_ID VARCHAR(255),
      type VARCHAR(255),
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
      device_id VARCHAR(255)
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
  devices: `
    CREATE TABLE IF NOT EXISTS devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      device_id VARCHAR(255) UNIQUE,
      device_name VARCHAR(255) UNIQUE
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
  { path: "/api/TrackTable", table: "TrackTable", columns: ["id", "track_id", "track_state", "start_date", "stop_reason", "start_reason", "device_id"] },
  { path: "/api/LastKnownPointTable", table: "LastKnownPointTable", columns: ["id", "track_id", "latitude", "longitude", "accuracy", "point_date", "point_origin", "device_id"] },
  { path: "/api/EventsTable", table: "EventsTable", columns: ["ID", "UUID", "timeStart", "duration", "pureDuration", "speedStart", "speedStop", "speedMedian", "prevEventSpeed", "accelerationDirect", "accelerationLateral", "accelerationVertical", "accelerationDirectEnd", "accelerationLateralEnd", "accelerationVerticalEnd", "UNIQUE_ID", "type", "accidentTrigger", "reliability", "device_id"] },
  { path: "/api/EventsStartPointTable", table: "EventsStartPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/EventsStopPointTable", table: "EventsStopPointTable", columns: ["ID", "timeStart", "latitude", "longitude", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/RangeDirectTable", table: "RangeDirectTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/RangeLateralTable", table: "RangeLateralTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/RangeVerticalTable", table: "RangeVerticalTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/RangeAccuracyTable", table: "RangeAccuracyTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/RangeSpeedTable", table: "RangeSpeedTable", columns: ["ID", "timeStart", "max", "min", "median", "quantile_05", "quantile_95", "UNIQUE_ID", "type", "device_id"] },
  { path: "/api/SampleTable", table: "SampleTable", columns: [
    "ID", "latitude", "longitude", "timestamp", "tick_timestamp", "speed_kmh", "midSpeed", "course", "height", "acceleration", "deceleration", "lateral", "yaw", "total_meters", "established_indexA", "established_indexB", "start_date", "end_date", "unique_id", "number", "device_id", "acceleration_x", "acceleration_y", "acceleration_z", "gyroscope_x", "gyroscope_y", "gyroscope_z", "acceleration_x_original", "acceleration_y_original", "acceleration_z_original", "gyroscope_x_original", "gyroscope_y_original", "gyroscope_z_original", "accuracy", "screen_on", "screen_blocked", "vehicle_indicators", "quantile"] }
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
  "devices"
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

  const query = `
    SELECT 
      start_points.UNIQUE_ID,
      track.start_date,
      start_points.latitude AS start_latitude,
      start_points.longitude AS start_longitude,
      end_points.latitude AS end_latitude,
      end_points.longitude AS end_longitude,
      start_points.device_id,
      devices.device_name,

      6371 * acos(
          cos(radians(start_points.latitude)) * cos(radians(end_points.latitude)) *
          cos(radians(end_points.longitude) - radians(start_points.longitude)) +
          sin(radians(start_points.latitude)) * sin(radians(end_points.latitude))
      ) AS distance_km

    FROM
      (SELECT UNIQUE_ID, latitude, longitude, device_id
       FROM EventsStartPointTable
       WHERE ID IN (
           SELECT MIN(ID)
           FROM EventsStartPointTable
           GROUP BY UNIQUE_ID
       )) AS start_points

    JOIN
      (SELECT UNIQUE_ID, latitude, longitude
       FROM EventsStopPointTable
       WHERE ID IN (
           SELECT MAX(ID)
           FROM EventsStopPointTable
           GROUP BY UNIQUE_ID
       )) AS end_points
    ON start_points.UNIQUE_ID = end_points.UNIQUE_ID

    JOIN TrackTable AS track
    ON start_points.UNIQUE_ID = track.track_id

    LEFT JOIN devices
    ON start_points.device_id = devices.device_id

    WHERE
      start_points.latitude != 0 AND start_points.longitude != 0
      AND end_points.latitude != 0 AND end_points.longitude != 0
      AND 6371 * acos(
          cos(radians(start_points.latitude)) * cos(radians(end_points.latitude)) *
          cos(radians(end_points.longitude) - radians(start_points.longitude)) +
          sin(radians(start_points.latitude)) * sin(radians(end_points.latitude))
      ) >= 1;
  `;

  pool.query(query)
  .then(([rows]) => {
    res.status(200).json({ success: true, data: rows });
  })
  .catch((err) => {
    console.error('SQL Error:', err.message);
    res.status(500).json({ error: err.message });
  });

});




app.get('/geopoints', (req, res) => {
  const { unique_id } = req.query;

  if (!unique_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing unique_id query parameter',
    });
  }

  const sql = `
    SELECT latitude, longitude
    FROM (
        SELECT latitude, longitude, ID
        FROM EventsStartPointTable
        WHERE UNIQUE_ID = ?

        UNION ALL

        SELECT latitude, longitude, ID
        FROM EventsStopPointTable
        WHERE UNIQUE_ID = ?
    )
    ORDER BY ID ASC;
  `;

  pool.query(sql, [unique_id, unique_id])
  .then(([rows]) => {
    res.status(200).json({ success: true, data: rows });
  })
  .catch((err) => {
    console.error('❌ Query error:', err.message);
    res.status(500).json({ success: false, error: 'Database query failed' });
  });

});



app.get('/triprecordfordevice', (req, res) => {
  console.log("Entering /triprecordfordevice");

  const { device_id } = req.query;

  if (!device_id) {
    return res.status(400).json({ error: 'Missing device_id query parameter' });
  }

  const query = `
    SELECT 
      start_points.UNIQUE_ID,
      track.start_date,
      start_points.latitude AS start_latitude,
      start_points.longitude AS start_longitude,
      end_points.latitude AS end_latitude,
      end_points.longitude AS end_longitude,
      start_points.device_id,
      devices.device_name,

      6371 * acos(
          cos(radians(start_points.latitude)) * cos(radians(end_points.latitude)) *
          cos(radians(end_points.longitude) - radians(start_points.longitude)) +
          sin(radians(start_points.latitude)) * sin(radians(end_points.latitude))
      ) AS distance_km

    FROM
      (SELECT UNIQUE_ID, latitude, longitude, device_id
       FROM EventsStartPointTable
       WHERE ID IN (
           SELECT MIN(ID)
           FROM EventsStartPointTable
           GROUP BY UNIQUE_ID
       )) AS start_points

    JOIN
      (SELECT UNIQUE_ID, latitude, longitude
       FROM EventsStopPointTable
       WHERE ID IN (
           SELECT MAX(ID)
           FROM EventsStopPointTable
           GROUP BY UNIQUE_ID
       )) AS end_points
    ON start_points.UNIQUE_ID = end_points.UNIQUE_ID

    JOIN TrackTable AS track
    ON start_points.UNIQUE_ID = track.track_id

    LEFT JOIN devices
    ON start_points.device_id = devices.device_id

    WHERE
      start_points.latitude != 0 AND start_points.longitude != 0
      AND end_points.latitude != 0 AND end_points.longitude != 0
      AND 6371 * acos(
          cos(radians(start_points.latitude)) * cos(radians(end_points.latitude)) *
          cos(radians(end_points.longitude) - radians(start_points.longitude)) +
          sin(radians(start_points.latitude)) * sin(radians(end_points.latitude))
      ) >= 1
      AND track.device_id = ?;
  `;

 pool.query(query, [device_id])
  .then(([rows]) => {
    res.status(200).json({ success: true, data: rows });
  })
  .catch((err) => {
    console.error('SQL Error:', err.message);
    res.status(500).json({ error: err.message });
  });
});

/////////////////////////////////////////////////

const LOCAL_IP = "192.68.10.41";
const PORT = 5001;

app.listen(PORT, LOCAL_IP, () => console.log(`✅ API running at http://${LOCAL_IP}:${PORT}`));

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
