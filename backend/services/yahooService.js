const YahooFinance = require('yahoo-finance2').default
const cache = require('./cache')

const yahooFinance = new YahooFinance()

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 50

const throttle = async () => {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

const convertToYahooSymbol = (symbol, companyName) => {
  if (!symbol) return symbol
  
  let baseName = companyName || symbol.split(':')[0]
  
  baseName = baseName
    .replace(/\s+/g, ' ')
    .trim()
  
  if (symbol.includes(':')) {
    const [stockCode, exchangeCode] = symbol.split(':')
    
    if (/^\d+$/.test(exchangeCode)) {
      return `${baseName}.BO`
    }
    
    if (exchangeCode === stockCode || exchangeCode === 'NSE') {
      return `${baseName}.NS`
    }
    
    if (exchangeCode === 'BSE' || exchangeCode === 'BOM') {
      return `${baseName}.BO`
    }
    
    return `${baseName}.NS`
  }
  
  if (/^\d+$/.test(symbol)) {
    return `${baseName}.BO`
  }
  
  return `${baseName}.NS`
}

exports.fetchCMP = async (symbol, companyName) => {
  const cached = cache.get(symbol, 'yahoo')
  if (cached !== null && cached !== 0) {
    return cached
  }

  try {
    await throttle()
    
    const yahooSymbol = convertToYahooSymbol(symbol, companyName)
    console.log(`Fetching CMP for ${symbol} (${companyName || 'N/A'}) -> ${yahooSymbol}`)
    
    let quote = null
    let price = 0
    
    try {
      quote = await yahooFinance.quote(yahooSymbol)
      
      if (!quote) {
        throw new Error('Quote returned null/undefined')
      }
      
      price = quote.regularMarketPrice ?? quote.price ?? quote.regularMarketPreviousClose ?? quote.currentPrice ?? 0
      
      if (price === 0) {
        console.log(`quote() returned 0 for ${yahooSymbol}, trying quoteSummary...`)
        try {
          const summary = await yahooFinance.quoteSummary(yahooSymbol, { modules: ['price'] })
          if (summary?.price) {
            price = summary.price.regularMarketPrice ?? summary.price.regularMarketPreviousClose ?? summary.price.currentPrice ?? 0
            console.log(`quoteSummary found price: ${price}`)
          }
        } catch (summaryError) {
          console.log(`quoteSummary failed: ${summaryError.message}`)
        }
      }
    } catch (quoteError) {
      console.error(`quote() error for ${yahooSymbol}:`, quoteError.message)
      
      try {
        const summary = await yahooFinance.quoteSummary(yahooSymbol, { modules: ['price'] })
        if (summary?.price) {
          price = summary.price.regularMarketPrice ?? summary.price.regularMarketPreviousClose ?? summary.price.currentPrice ?? 0
          console.log(`✓ Got price from quoteSummary: ${price}`)
        }
      } catch (summaryError) {
        console.error(`quoteSummary() also failed: ${summaryError.message}`)
      }
    }
    
    if (price === 0 || !quote) {
      console.warn(`⚠ Yahoo Finance returned 0/undefined for ${symbol} (${yahooSymbol}). Quote:`, quote ? JSON.stringify(quote).substring(0, 200) : 'undefined')
      const alternatives = []
      
      const baseSymbol = symbol.split(':')[0]
      alternatives.push(`${baseSymbol}.NS`, `${baseSymbol}.BO`)
      
      if (yahooSymbol.endsWith('.NS')) {
        alternatives.push(`${baseSymbol}.BO`)
      } else if (yahooSymbol.endsWith('.BO')) {
        alternatives.push(`${baseSymbol}.NS`)
      }
      
      for (const altSymbol of alternatives) {
        try {
          const altQuote = await yahooFinance.quote(altSymbol)
          const altPrice = altQuote?.regularMarketPrice ?? altQuote?.price ?? 0
          if (altPrice > 0) {
            console.log(`✓ Found price using alternative symbol ${altSymbol}: ${altPrice}`)
            price = altPrice
            break
          }
        } catch {}
      }
    }
    
    if (price > 0) {
      cache.set(symbol, price, 'yahoo')
      console.log(`✓ Cached CMP for ${symbol}: ${price}`)
    } else {
      console.error(`✗ Failed to get price for ${symbol} (${yahooSymbol})`)
    }
    
    return price
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error.message, error.stack?.substring(0, 200))
    return 0
  }
}
