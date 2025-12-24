const puppeteer = require('puppeteer')
const cache = require('./cache')

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000

const throttle = async () => {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  lastRequestTime = Date.now()
}

const convertSymbolForGoogle = (symbol) => {
  if (!symbol) return symbol
  
  if (symbol.includes(':')) {
    const parts = symbol.split(':')
    const stockCode = parts[0]
    const exchangeCode = parts[1]
    
    if (/^\d+$/.test(exchangeCode)) {
      return `${exchangeCode}:BOM`
    }
    
    if (exchangeCode === stockCode || exchangeCode === 'NSE') {
      return `${stockCode}:NSE`
    }
    
    if (exchangeCode === 'BSE') {
      return `${stockCode}:BOM`
    }
    
    if (/^\d+$/.test(stockCode)) {
      return `${stockCode}:BOM`
    }
    
    return `${stockCode}:NSE`
  }
  
  if (/^\d+$/.test(symbol)) {
    return `${symbol}:BOM`
  }
  
  return `${symbol}:NSE`
}

const scrapeWithPuppeteer = async symbol => {
 let browser
 try {
   const googleSymbol = convertSymbolForGoogle(symbol)
   browser = await puppeteer.launch({ 
     headless: true,
     args: [
       '--no-sandbox', 
       '--disable-setuid-sandbox',
       '--disable-blink-features=AutomationControlled',
       '--disable-dev-shm-usage'
     ]
   })
   const page = await browser.newPage()
   
   await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
   await page.setViewport({ width: 1920, height: 1080 })
   
   await page.evaluateOnNewDocument(() => {
     Object.defineProperty(navigator, 'webdriver', {
       get: () => false,
     })
   })

   const url = `https://www.google.com/finance/quote/${googleSymbol}`
   
   let result = null
   let lastError = null
   
   try {
     console.log(`Scraping Google Finance: ${url}`)
     
     try {
       await page.goto(url, {
         waitUntil: 'domcontentloaded',
         timeout: 20000
       })
     } catch (navError) {
       if (navError.message.includes('timeout') || navError.message.includes('Navigation')) {
         console.log(`First attempt timeout, retrying with load event for ${url}`)
         try {
           await page.goto(url, {
             waitUntil: 'load',
             timeout: 20000
           })
         } catch (retryError) {
           console.log(`Navigation timeout for ${url}`)
           throw retryError
         }
       } else {
         throw navError
       }
     }
     
     try {
       const consentSelectors = [
         'button[id*="accept"]',
         'button[class*="accept"]',
         'button:contains("Accept")',
         'button:contains("I agree")',
         '[aria-label*="Accept"]',
         '[aria-label*="Agree"]'
       ]
       for (const selector of consentSelectors) {
         try {
           await page.click(selector, { timeout: 1000 }).catch(() => {})
         } catch {}
       }
     } catch {}
     
     try {
       await page.waitForSelector('body', { timeout: 3000 })
     } catch {}
     
     await new Promise(resolve => setTimeout(resolve, 2000))
     
     try {
       const pageTitle = await page.title()
       const pageUrl = page.url()
       if (pageTitle.includes('404') || pageTitle.includes('Not Found') || pageTitle.includes('Error') || 
           pageUrl.includes('sorry') || pageUrl.includes('blocked')) {
         throw new Error('Page not found or blocked')
       }
     } catch (titleError) {
       throw titleError
     }
       
       result = await page.evaluate(() => {
     const text = document.body.innerText || ''
     const html = document.body.innerHTML || ''
     
     const map = {}
     
     const rows1 = Array.from(document.querySelectorAll('.gyFHrc'))
     rows1.forEach(row => {
       const label = row.querySelector('.mfs7Fc')?.textContent?.trim()
       const value = row.querySelector('.P6K39c')?.textContent?.trim()
       if (label && value) map[label] = value
     })
     
     const rows2 = Array.from(document.querySelectorAll('[data-item-key]'))
     rows2.forEach(row => {
       const label = row.getAttribute('data-item-key')
       const value = row.textContent?.trim()
       if (label && value) map[label] = value
     })
     
     const keyValueDivs = Array.from(document.querySelectorAll('div[class*="key"], div[class*="label"], div[class*="item"]'))
     keyValueDivs.forEach(div => {
       const text = div.textContent?.trim() || ''
       if (text.includes(':') || text.includes('P/E') || text.includes('EPS')) {
         const parts = text.split(':')
         if (parts.length === 2) {
           const key = parts[0].trim()
           const val = parts[1].trim()
           if (key && val) map[key] = val
         }
       }
     })
     
     const allDivs = Array.from(document.querySelectorAll('div'))
     allDivs.forEach(div => {
       const divText = div.textContent?.trim() || ''
       const peMatch = divText.match(/(?:P\/E|PE|Price[-\s]to[-\s]Earnings)[:\s]+([\d.,]+)/i)
       if (peMatch && peMatch[1]) {
         map['P/E ratio'] = peMatch[1].trim()
       }
       const epsMatch = divText.match(/(?:EPS|Earnings\s+per\s+share)[:\s]+([\d.,]+)/i)
       if (epsMatch && epsMatch[1]) {
         map['EPS'] = epsMatch[1].trim()
       }
     })
     
     const pePatterns = [
       /P\/E\s*(?:ratio)?[:\s]*([\d.,]+)/i,
       /Price[-\s]to[-\s]Earnings[:\s]*([\d.,]+)/i,
       /PE\s*(?:ratio)?[:\s]*([\d.,]+)/i,
       /P\/E[:\s]*([\d.,]+)/i,
       /P\/E[:\s]*([\d.]+)/i,
       /(?:P\/E|PE)[\s:]+([\d.,]+)/i
     ]
     
     let peValue = null
     peValue = map['P/E ratio'] || map['P/E'] || map['PE ratio'] || map['PE'] || map['Price-to-Earnings']
     
     if (!peValue) {
       for (const pattern of pePatterns) {
         const match = text.match(pattern)
         if (match && match[1]) {
           peValue = match[1].trim().replace(/,/g, '')
           break
         }
       }
     }
     
     const earningsPatterns = [
       /EPS[:\s]*([\d.,]+)/i,
       /Earnings\s+per\s+share[:\s]*([\d.,]+)/i,
       /Diluted\s+EPS[:\s]*([\d.,]+)/i,
       /Earnings[:\s]*([\d.,]+)/i,
       /(?:EPS|Earnings)[\s:]+([\d.,]+)/i
     ]
     
     let earningsValue = null
     earningsValue = map['EPS'] || map['Earnings per share'] || map['Earnings'] || map['Diluted EPS']
     
     if (!earningsValue) {
       for (const pattern of earningsPatterns) {
         const match = text.match(pattern)
         if (match && match[1]) {
           earningsValue = match[1].trim().replace(/,/g, '')
           break
         }
       }
     }
     
     const tables = Array.from(document.querySelectorAll('table'))
     for (const table of tables) {
       const rows = Array.from(table.querySelectorAll('tr'))
       for (const row of rows) {
         const cells = Array.from(row.querySelectorAll('td, th'))
         const rowText = row.textContent?.toLowerCase() || ''
         
         if ((rowText.includes('p/e') || rowText.includes('price-to-earnings') || rowText.includes('pe ratio')) && !peValue) {
           const lastCell = cells[cells.length - 1]
           if (lastCell) {
             const val = lastCell.textContent?.trim()
             const numMatch = val?.match(/([\d.,]+)/)
             if (numMatch) {
               peValue = numMatch[1].replace(/,/g, '')
             }
           }
         }
         
         if ((rowText.includes('earnings per share') || rowText.includes('eps')) && !earningsValue) {
           const lastCell = cells[cells.length - 1]
           if (lastCell) {
             const val = lastCell.textContent?.trim()
             const numMatch = val?.match(/([\d.,]+)/)
             if (numMatch) {
               earningsValue = numMatch[1].replace(/,/g, '')
             }
           }
         }
       }
     }
     
     const valueElements = Array.from(document.querySelectorAll('span, div'))
     for (const el of valueElements) {
       const elText = el.textContent?.trim() || ''
       const parentText = el.parentElement?.textContent?.toLowerCase() || ''
       
       if ((parentText.includes('p/e') || parentText.includes('price-to-earnings')) && !peValue) {
         const numMatch = elText.match(/([\d.,]+)/)
         if (numMatch && parseFloat(numMatch[1].replace(/,/g, '')) > 0) {
           peValue = numMatch[1].replace(/,/g, '')
         }
       }
       
       if ((parentText.includes('eps') || parentText.includes('earnings per share')) && !earningsValue) {
         const numMatch = elText.match(/([\d.,]+)/)
         if (numMatch && parseFloat(numMatch[1].replace(/,/g, '')) > 0) {
           earningsValue = numMatch[1].replace(/,/g, '')
         }
       }
     }
     
     const cleanPE = peValue && peValue !== '-' && peValue !== '.' && peValue !== '—' && peValue !== 'N/A' && parseFloat(peValue) > 0
       ? peValue
       : 'N/A'
     
     const cleanEarnings = earningsValue && earningsValue !== '-' && earningsValue !== '.' && earningsValue !== '—' && earningsValue !== 'N/A' && parseFloat(earningsValue) > 0
       ? earningsValue
       : 'N/A'
     
     return {
       pe: cleanPE,
       earnings: cleanEarnings,
       debug: {
         mapKeys: Object.keys(map),
         hasText: text.length > 0,
         textLength: text.length,
         url: window.location.href,
         peFound: !!peValue,
         earningsFound: !!earningsValue
       }
     }
       })
       
     if (result && (result.pe !== 'N/A' || result.earnings !== 'N/A')) {
       console.log(`✓ Successfully scraped ${url} - PE: ${result.pe}, Earnings: ${result.earnings}`)
     } else if (result && result.debug) {
       console.log(`⚠ Page loaded but no data found for ${url}. Debug:`, result.debug)
     }
   } catch (err) {
     lastError = err
     if (!err.message?.includes('timeout') && !err.message?.includes('Navigation')) {
       console.log(`Failed to scrape ${url}:`, err.message)
     }
   } finally {
     await browser.close()
   }
   
   if (!result) {
     console.error(`Failed to scrape ${symbol}. Error:`, lastError?.message)
     return { pe: 'N/A', earnings: 'N/A' }
   }
   
   return result
 } catch (error) {
   console.error(`Error scraping Google Finance for ${symbol}:`, error.message)
   if (browser) {
     await browser.close().catch(() => {})
   }
   return { pe: 'N/A', earnings: 'N/A' }
 }
}

exports.fetchPEAndEarnings = async symbol => {
  const cacheKey = `google_${symbol}`
  const cached = cache.get(cacheKey, 'google')
  if (cached !== null) {
    return cached
  }

  try {
    await throttle()
    
    const result = await scrapeWithPuppeteer(symbol)
    
    if (result.debug) {
      console.log(`Google Finance result for ${symbol}:`, {
        pe: result.pe,
        earnings: result.earnings,
        foundKeys: result.debug.mapKeys
      })
    }
    
    const data = { pe: result.pe, earnings: result.earnings }
    
    cache.set(cacheKey, data, 'google')
    
    return data
  } catch (error) {
    console.error(`Error in fetchPEAndEarnings for ${symbol}:`, error.message)
    
    const errorData = { pe: 'N/A', earnings: 'N/A' }
    cache.set(cacheKey, errorData, 'google')
    
    return errorData
  }
}


