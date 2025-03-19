const express = require("express");
const router = express.Router();
const { getTableRecords } = require("../controller/tableController");

router.get("/:table", getTableRecords);

module.exports = router;
