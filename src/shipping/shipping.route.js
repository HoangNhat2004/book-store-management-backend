const express = require('express');
const { calculateFee } = require('./shipping.controller');
const router = express.Router();

// API này sẽ được frontend gọi để lấy phí ship
router.post("/calculate-fee", calculateFee);

module.exports = router;