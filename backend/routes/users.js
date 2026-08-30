require("dotenv").config();
const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const usersController = require('../controllers/users')
const logger = require('../utils/logger')('UsersRouter')
const auth = require('../middlewares/auth')({
    secret: process.env.JWT_SECRET,
    userRepository: dataSource.getRepository('User'),
    logger
})

// 註冊新會員帳號
router.post('/signup', usersController.postSignup)

// 會員登入，取得 JWT token
router.post('/login', usersController.postLogin)

// 取得本人的個人資料
router.get('/profile',auth, usersController.getProfile)

// 更新本人的暱稱
router.put('/profile',auth, usersController.putProfile)

// 修改本人的登入密碼
router.put('/password',auth, usersController.putPassword)

// 取得本人的購買方案紀錄
router.get('/credit-package',auth, usersController.getCreditPackages)

// 取得本人的課表與剩餘堂數
router.get('/courses',auth, usersController.getBookingCourses)

module.exports = router