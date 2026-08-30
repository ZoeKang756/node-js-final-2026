#!/usr/bin/env node
require('dotenv').config()

const http = require('http')
const app = require('../app')
const { dataSource } = require('../db/data-source')

const port = process.env.PORT || 8080
app.set('port', port)

const server = http.createServer(app)

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} 已經被占用了——是不是還有另一個伺服器開著？`)
    process.exit(1)
  }
  throw error
})

server.listen(port, async () => {
  try {
    await dataSource.initialize()   // 先接上資料庫，接不上就不營業
    console.log('資料庫連線成功')
    console.log(`伺服器運作中. port: ${port}`)
  } catch (error) {
    console.error(`資料庫連線失敗: ${error.message}`)
    process.exit(1)
  }
})
