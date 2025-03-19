const db = require("../config/db");

const getTableRecords = (req, res) => {
  const tableName = req.params.table;
  const query = `SELECT * FROM ??`;

  db.query(query, [tableName], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

module.exports = { getTableRecords };
