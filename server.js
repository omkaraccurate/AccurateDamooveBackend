const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cors());
// Correct file path
const dbPath = "/home/accurate/AndroidStudioProjects/AccurateDamooveBackend/db/tracking_raw_DB_150525.db";
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

const insertBulkData = (table, columns, records, res) => {
 

  const data = records;

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: "No records provided!" });
  }

  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  try {
    const stmt = db.prepare(sql);
    let insertedCount = 0;
    let hasError = false;

    db.serialize(() => {
      data.forEach((record, index) => {
        stmt.run(columns.map(col => record[col]), function (err) {
          if (err) {
            hasError = true;
            console.error(`❌ Error inserting into ${table} at index ${index}:`, err.message);
            
            if (err.message.includes("no such table")) {
              return res.status(500).json({
                success: false,
                error: `Table ${table} does not exist!`,
              });
            }
          } else {
            insertedCount++;
          }

          if (insertedCount + (hasError ? 1 : 0) === data.length) {
            stmt.finalize();
            if (hasError) {
              res.status(500).json({ success: false, error: "Some records failed to insert." });
            } else {
              res.status(200).json({ success: true, message: `✅ ${insertedCount} record(s) inserted successfully!` });
            }
          }
        });
      });
    });
  } catch (error) {
    console.error(`❌ Unexpected error in ${table}:`, error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// check server is up and running

app.get('/health', (req, res) => {
  res.sendStatus(200);
});


// ✅ Insert into `TrackTable`
app.post("/api/TrackTable", (req, res) => {
  console.log("Received body:", req.body);

  if (!req.body.data || !Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, error: "Invalid request format!" });
  }

  insertBulkData("TrackTable", ["id", "track_id", "track_state", "start_date", "stop_reason", "start_reason","device_id"], req.body.data, res);
});


// ✅ Insert into `LastKnownPointTable`
app.post("/api/LastKnownPointTable", (req, res) => {
  //console.log("Received body:", req.body);

  if (!req.body.data || !Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, error: "Invalid request format!" });
  }
  insertBulkData("LastKnownPointTable", ["id","track_id", "latitude", "longitude","accuracy","point_date","point_origin","device_id"], req.body.data, res);
});

// ✅ Insert into `EventsTable`
app.post("/api/EventsTable", (req, res) => {
  insertBulkData("EventsTable", ["ID","UUID", "timeStart", "duration","pureDuration","speedStart","speedStop","speedMedian","prevEventSpeed","accelerationDirect","accelerationLateral","accelerationVertical","accelerationDirectEnd","accelerationLateralEnd","accelerationVerticalEnd","UNIQUE_ID","type","accidentTrigger","reliability","device_id"], req.body.data, res);
});

// ✅ Insert into `EventsStartPointTable`
app.post("/api/EventsStartPointTable", (req, res) => {
  insertBulkData("EventsStartPointTable", ["ID", "timeStart", "latitude","longitude","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `EventsStopPointTable`
app.post("/api/EventsStopPointTable", (req, res) => {
  insertBulkData("EventsStopPointTable", ["ID", "timeStart", "latitude","longitude","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `RangeDirectTable`
app.post("/api/RangeDirectTable", (req, res) => {
  insertBulkData("RangeDirectTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `RangeLateralTable`
app.post("/api/RangeLateralTable", (req, res) => {
  insertBulkData("RangeLateralTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `RangeVerticalTable`
app.post("/api/RangeVerticalTable", (req, res) => {
  insertBulkData("RangeVerticalTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `RangeAccuracyTable`
app.post("/api/RangeAccuracyTable", (req, res) => {
  insertBulkData("RangeAccuracyTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type","device_id"], req.body.data, res);
});

// ✅ Insert into `RangeSpeedTable`
app.post("/api/RangeSpeedTable", (req, res) => {
  insertBulkData("RangeSpeedTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type","device_id"], req.body.data, res);
});

app.post('/api/devices', (req, res) => {
  const { device_id, device_name } = req.body;

  if (!device_id || !device_name) {
    return res.status(400).json({ error: 'device_id and device_name are required' });
  }

  const insertQuery = `
    INSERT INTO devices (device_id, device_name)
    VALUES (?, ?);
  `;

  db.run(insertQuery, [device_id, device_name], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Device ID or name already exists' });
      }
      return res.status(500).json({ error: 'Failed to insert device' });
    }

    res.status(200).json({ message: 'Device added', id: this.lastID });
  });
});


app.get("/", (req, res) => {
  res.send("Welcome to fleet management");
});

// Generic GET endpoint to fetch all rows from a table
const getTableData = (table, res) => {
  const sql = `SELECT * FROM ${table}`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(`❌ Error fetching from ${table}:`, err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(200).json({ success: true, data: rows });
   // console.log(rows)
  });
};

// ✅ Insert into `SampleTable`
app.post("/api/SampleTable", (req, res) => {
  //console.log("Received body:", req.body);

  if (!req.body.data || !Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, error: "Invalid request format!" });
  }

  insertBulkData("SampleTable", [
    "ID",
    "latitude",
    "longitude",
    "timestamp",
    "tick_timestamp",
    "speed_kmh",
    "midSpeed",
    "course",
    "height",
    "acceleration",
    "deceleration",
    "lateral",
    "yaw",
    "total_meters",
    "established_indexA",
    "established_indexB",
    "start_date",
    "end_date",
    "unique_id",
    "number",
    "device_id",
    "acceleration_x",
    "acceleration_y",
    "acceleration_z",
    "gyroscope_x",
    "gyroscope_y",
    "gyroscope_z",
    "acceleration_x_original",
    "acceleration_y_original",
    "acceleration_z_original",
    "gyroscope_x_original",
    "gyroscope_y_original",
    "gyroscope_z_original",
    "accuracy",
    "screen_on",
    "screen_blocked",
    "vehicle_indicators",
    "quantile"
  ], req.body.data, res);
});


app.get("/api/:table", (req, res) => {
  const tableName = req.params.table.replace(/-/g, '_');
  const allowedTables = [
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
  ];

  if (!allowedTables.includes(tableName)) {
    console.log(tableName)
    return res.status(400).json({ success: false, error: "Invalid table name" });
  }

  getTableData(tableName, res);
});
const path = require("path");

// Serve index.html statically
app.use(express.static(path.join(__dirname)));

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

WHERE
    -- Ensure latitudes and longitudes are not 0 or invalid
    start_points.latitude != 0 AND start_points.longitude != 0
    AND end_points.latitude != 0 AND end_points.longitude != 0
    
    -- Distance should be greater than or equal to 1 km
    AND 6371 * acos(
        cos(radians(start_points.latitude)) * cos(radians(end_points.latitude)) *
        cos(radians(end_points.longitude) - radians(start_points.longitude)) +
        sin(radians(start_points.latitude)) * sin(radians(end_points.latitude))
    ) >= 1;


  `;

  console.log("Executing query: ", query);  // Debugging log

  db.all(query, [], (err, rows) => {
      if (err) {
          console.error('SQL Error:', err.message);
          res.status(500).json({ error: err.message });
      } else {
          console.log("Query result: ", rows);  // Debugging log
          res.status(200).json({ success: true, data: rows });
      }
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

  db.all(sql, [unique_id, unique_id], (err, rows) => {
    if (err) {
      console.error('❌ Query error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
      });
    }

    res.status(200).json({
      success: true,
      data: rows, // [{ latitude, longitude }, ...]
    });
  });
});


app.get('/triprecordfordevice', (req, res) => {
  console.log("Entering /triprecords");

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

  console.log("Executing query for device_id:", device_id);

  db.all(query, [device_id], (err, rows) => {
      if (err) {
          console.error('SQL Error:', err.message);
          res.status(500).json({ error: err.message });
      } else {
          console.log("Query result: ", rows);
          res.status(200).json({ success: true, data: rows });
      }
  });
});



// Replace "0.0.0.0" with your local IP (e.g., "192.168.1.100")
const LOCAL_IP =  "192.168.0.198"; // Change this to your IP
const PORT = 5000;

app.listen(PORT, LOCAL_IP, () => console.log(`✅ API running at http://${LOCAL_IP}:${PORT}`));



// Handle server shutdown gracefully
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
