const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CourseRouter')
const courseController = require('../controllers/courses')

const auth = require('../middlewares/auth')({
    secret: process.env.JWT_SECRET,
    userRepository: dataSource.getRepository('User'),
    logger
})

// [POST] 報名課程：{url}/api/courses/:courseId
router.post('{/:courseId}', auth, courseController.post)

// 取得全站「進行中」的課程列表（公開，不用登入）
router.get('/', courseController.getAll)

// [DELETE] 取消課程：{url}/api/courses/:courseId
router.delete('{/:courseId}', auth, courseController.deleteCoursesById)

module.exports = router