const fs = require('fs')
const path = require('path')
const yahoo = require('../services/yahooService')
const google = require('../services/googleService')

const INPUT_FILE = path.join(__dirname, '../data/portfolio.json')
const LIVE_FILE = path.join(__dirname, '../data/portfolio-live.json')
const cache = require('../services/cache')

const processBatch = async (items, batchSize, delay, processor) => {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  return results
}

exports.getPortfolio = async (req, res) => {
    try {
      const cachedPortfolio = cache.get('full_portfolio', 'portfolio')
      if (cachedPortfolio !== null) {
        console.log('✓ Serving from portfolio cache (instant)')
        return res.json({ stocks: cachedPortfolio })
      }
      
      let sentStaleData = false
      try {
        if (fs.existsSync(LIVE_FILE)) {
          const liveData = JSON.parse(fs.readFileSync(LIVE_FILE, 'utf-8'))
          if (liveData && liveData.length > 0) {
            console.log('⚡ Serving stale data while refreshing in background')
            res.json({ stocks: liveData })
            sentStaleData = true
          }
        }
      } catch (fileError) {
      }
      
      const rawStocks = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'))
  
      const BATCH_SIZE = 10
      const BATCH_DELAY = 200
      
      const stocks = await processBatch(
        rawStocks,
        BATCH_SIZE,
        BATCH_DELAY,
        async (s) => {
          try {
            const cmp = await yahoo.fetchCMP(s.symbol, s.particulars)
            
            const { pe, earnings } = await google.fetchPEAndEarnings(s.symbol)
  
            const investment = s.purchasePrice * s.quantity
            const presentValue = cmp * s.quantity
  
            return {
              ...s,
              investment,
              cmp,
              presentValue,
              gainLoss: presentValue - investment,
              peRatio: pe,
              latestEarnings: earnings
            }
          } catch (error) {
            console.error(`Error processing stock ${s.symbol}:`, error.message)
            return {
              ...s,
              investment: s.purchasePrice * s.quantity,
              cmp: 0,
              presentValue: 0,
              gainLoss: -(s.purchasePrice * s.quantity),
              peRatio: 'N/A',
              latestEarnings: 'N/A'
            }
          }
        }
      )

      const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0)

      const stocksWithPortfolioPercent = stocks.map(stock => ({
        ...stock,
        portfolioPercent: totalInvestment > 0 
          ? Math.round((stock.investment / totalInvestment) * 100 * 100) / 100
          : 0
      }))
  
      cache.set('full_portfolio', stocksWithPortfolioPercent, 'portfolio')
      
      fs.writeFileSync(LIVE_FILE, JSON.stringify(stocksWithPortfolioPercent, null, 2))
  
      if (!sentStaleData) {
        console.log('✓ Fresh data fetched and cached')
        res.json({ stocks: stocksWithPortfolioPercent })
      } else {
        console.log('✓ Background refresh completed, next request will get fresh cached data')
      }
    } catch (err) {
      console.error('PORTFOLIO ERROR →', err)
      res.status(500).json({ error: 'Failed to fetch portfolio data' })
    }
  }
  