const cache = {}
const PORTFOLIO_TTL = 20000
const YAHOO_TTL = 25000
const GOOGLE_TTL = 600000

exports.get = (key, service = 'yahoo') => {
  const entry = cache[key]
  if (!entry) return null
  
  let ttl
  if (service === 'portfolio') {
    ttl = PORTFOLIO_TTL
  } else if (service === 'google') {
    ttl = GOOGLE_TTL
  } else {
    ttl = YAHOO_TTL
  }
  
  if (Date.now() - entry.time > ttl) {
    delete cache[key]
    return null
  }
  
  if (service === 'yahoo' && entry.data === 0) {
    return null
  }
  
  return entry.data
}

exports.set = (key, data, service = 'yahoo') => {
  cache[key] = { data, time: Date.now(), service }
}

exports.has = (key) => {
  return cache[key] !== undefined
}

exports.cleanup = () => {
  const now = Date.now()
  Object.keys(cache).forEach(key => {
    const entry = cache[key]
    let ttl
    if (entry.service === 'portfolio') {
      ttl = PORTFOLIO_TTL
    } else if (entry.service === 'google') {
      ttl = GOOGLE_TTL
    } else {
      ttl = YAHOO_TTL
    }
    if (now - entry.time > ttl) {
      delete cache[key]
    }
  })
}

setInterval(() => {
  exports.cleanup()
}, 30000)
