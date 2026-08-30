const express = require('express')
const router = express.Router()
const logger = require('../utils/logger')('CoachRouter')
const coachController = require('../controllers/coaches')

// 取得教練列表：{url}/api/coaches/?per=?page=?word=?可以透過 query string 篩選資料。
router.get('/', coachController.getCoachesV2)

// 取得教練技能列表
router.get('/skill',coachController.getSkills)

// 取得教練詳細資訊：{url}/api/coaches/:coachId
router.get('/:coachId',coachController.getCoachDetail)

// 取得指定教練課程列表
router.get('/:coachId/courses',coachController.getCoursesByCoachId)

// 新增教練技能
router.post('/skill',coachController.upsertSkill)

// 刪除教練技能
router.delete('/skill/:skillId',coachController.deleteSkill)

module.exports = router