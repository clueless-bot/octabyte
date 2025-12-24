const express = require('express')
const app = express()
const routes = require('./routes/portfolioRoutes')
const cors = require('cors')

app.use(cors())
app.use(express.json())

app.use('/api', routes)

app.listen(3001, () => {
  console.log('Backend running on port 3001')
})
