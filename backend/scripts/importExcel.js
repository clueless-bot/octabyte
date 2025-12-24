const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const excelPath = path.join(__dirname, '../../excel.xlsx')
const outputPath = path.join(__dirname, '../data/portfolio.json')

try {
  const workbook = XLSX.readFile(excelPath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  let headerRow = 0
  let data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i]
    const rowStr = row.join(' ').toLowerCase()
    if (rowStr.includes('particular') || rowStr.includes('stock') || rowStr.includes('purchase')) {
      headerRow = i
      break
    }
  }
  
  data = XLSX.utils.sheet_to_json(worksheet, { 
    range: headerRow,
    defval: ''
  })
  
  console.log('Sample row:', JSON.stringify(data[0], null, 2))
  console.log('Total rows:', data.length)

  let currentSector = 'General'
  
  const stocks = data.map((row, index) => {
    const particulars = (row['Particulars'] || '').toString().trim()
    const purchasePrice = parseFloat(row['Purchase Price'] || row['purchasePrice'] || row['Purchase'] || row['Price'] || 0)
    const quantity = parseInt(row['Qty'] || row['Qty.'] || row['Quantity'] || row['quantity'] || 0)
    const exchangeCol = (row['NSE/BSE'] || row['Exchange'] || row['exchange'] || '').toString().trim()
    const sectorCol = (row['Sector'] || row['sector'] || '').toString().trim()

    if (particulars && (particulars.toLowerCase().includes('sector') || particulars.toLowerCase().includes('financial'))) {
      currentSector = particulars
      return null
    }

    if (!particulars || purchasePrice === 0 || quantity === 0) {
      return null
    }

    let finalExchange = 'NSE'
    if (exchangeCol) {
      const upperExchange = exchangeCol.toUpperCase()
      if (upperExchange === 'NSE' || upperExchange === 'BSE') {
        finalExchange = upperExchange
      } else if (upperExchange.includes('NSE')) {
        finalExchange = 'NSE'
      } else if (upperExchange.includes('BSE')) {
        finalExchange = 'BSE'
      } else {
        if (/^\d+$/.test(exchangeCol)) {
          finalExchange = 'BSE'
        } else {
          finalExchange = 'NSE'
        }
      }
    }

    const stockCode = particulars.toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '')
    
    const symbol = `${stockCode}:${finalExchange}`

    const sector = sectorCol || currentSector || 'General'

    return {
      particulars: particulars,
      symbol: symbol,
      purchasePrice: purchasePrice,
      quantity: quantity,
      exchange: finalExchange,
      sector: sector
    }
  }).filter(stock => stock !== null && stock.particulars && stock.quantity > 0 && stock.purchasePrice > 0)

  if (stocks.length === 0) {
    console.log('No valid stocks found. First few rows:')
    console.log(JSON.stringify(data.slice(0, 5), null, 2))
  }

  fs.writeFileSync(outputPath, JSON.stringify(stocks, null, 2))
  console.log(`Successfully imported ${stocks.length} stocks to ${outputPath}`)
} catch (error) {
  console.error('Error importing Excel:', error.message)
  console.error(error.stack)
  process.exit(1)
}

