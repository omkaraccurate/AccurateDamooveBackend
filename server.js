const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cors());
// Correct file path
const dbPath = "C:/Users/Accurate AI/Desktop/tracking_raw_db_290325.db";
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
              res.json({ success: true, message: `✅ ${insertedCount} record(s) inserted successfully!` });
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



// ✅ Insert into `TrackTable`
app.post("/api/TrackTable", (req, res) => {
  console.log("Received body:", req.body);

  if (!req.body.data || !Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, error: "Invalid request format!" });
  }

  insertBulkData("TrackTable", ["id", "track_id", "track_state", "start_date", "stop_reason", "start_reason"], req.body.data, res);
});


// ✅ Insert into `LastKnownPointTable`
app.post("/api/LastKnownPointTable", (req, res) => {
  console.log("Received body:", req.body);

  if (!req.body.data || !Array.isArray(req.body.data)) {
    return res.status(400).json({ success: false, error: "Invalid request format!" });
  }
  insertBulkData("LastKnownPointTable", ["id","track_id", "latitude", "longitude","accuracy","point_date","point_origin"], req.body.data, res);
});

// ✅ Insert into `EventsTable`
app.post("/api/EventsTable", (req, res) => {
  insertBulkData("EventsTable", ["ID","UUID", "timeStart", "duration","pureDuration","speedStart","speedStop","speedMedian","prevEventSpeed","accelerationDirect","accelerationLateral","accelerationVertical","accelerationDirectEnd","accelerationLateralEnd","accelerationVerticalEnd","UNIQUE_ID","type","accidentTrigger","reliability"], req.body.data, res);
});

// ✅ Insert into `EventsStartPointTable`
app.post("/api/EventsStartPointTable", (req, res) => {
  insertBulkData("EventsStartPointTable", ["ID", "timeStart", "latitude","longitude","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `EventsStopPointTable`
app.post("/api/EventsStopPointTable", (req, res) => {
  insertBulkData("EventsStopPointTable", ["ID", "timeStart", "latitude","longitude","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `RangeDirectTable`
app.post("/api/RangeDirectTable", (req, res) => {
  insertBulkData("RangeDirectTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `RangeLateralTable`
app.post("/api/RangeLateralTable", (req, res) => {
  insertBulkData("RangeLateralTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `RangeVerticalTable`
app.post("/api/RangeVerticalTable", (req, res) => {
  insertBulkData("RangeVerticalTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `RangeAccuracyTable`
app.post("/api/RangeAccuracyTable", (req, res) => {
  insertBulkData("RangeAccuracyTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type"], req.body.data, res);
});

// ✅ Insert into `RangeSpeedTable`
app.post("/api/RangeSpeedTable", (req, res) => {
  insertBulkData("RangeSpeedTable", ["ID","timeStart","max","min","median","quantile_05","quantile_95","UNIQUE_ID","type"], req.body.data, res);
});


// Replace "0.0.0.0" with your local IP (e.g., "192.168.1.100")
const LOCAL_IP = "192.168.0.198"; // Change this to your IP
const PORT = 5000;

app.listen(PORT, LOCAL_IP, () => console.log(`✅ API running at http://${LOCAL_IP}:${PORT}`));
app.use(express.json({ limit: "50mb" })); // Allows up to 50MB payload size
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// Handle server shutdown gracefully
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
