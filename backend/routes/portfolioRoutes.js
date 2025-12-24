const express = require('express')
const router = express.Router()
const controller = require('../controllers/portfolioController')

router.get('/portfolio', controller.getPortfolio)

module.exports = router
