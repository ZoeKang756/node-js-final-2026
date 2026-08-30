const express = require('express')
const cors = require('cors')

const adminRouter = require('./routes/admin');
const coachesRouter = require('./routes/coaches')
const coursesRouter = require('./routes/courses')
const usersRouter = require('./routes/users')
const creditPackageRouter = require('./routes/creditPackage')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/healthcheck', (req, res) => {
  res.status(200)
  res.send('OK')
})

app.use('/api/admin', adminRouter);
app.use('/api/coaches', coachesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/users', usersRouter);
app.use('/api/credit-package', creditPackageRouter);


// 404
app.use((req, res) => {
  res.status(404).json({ status: 'failed', message: '無此路由' })
})

// 錯誤處理
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ status: 'error', message: '伺服器錯誤' })
})

module.exports = app
