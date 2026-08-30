require("dotenv").config();
const express = require("express");
const router = express.Router();
const { dataSource } = require("../db/data-source");
const adminController = require("../controllers/admin");
const logger = require('../utils/logger')('AdminRouter')

const auth = require("../middlewares/auth")({
  secret: process.env.JWT_SECRET,
  userRepository: dataSource.getRepository("User"),
  logger,
});

const isCoach = require("../middlewares/isCoach");
const isAdmin = require("../middlewares/isAdmin");

// 教練開設新課程
router.post("/coaches/courses", auth, isCoach, adminController.postCoachCourse);

// 將指定使用者升級為教練 profile_image_url 為非必填
router.post("/coaches/:userId", adminController.postCoach);

// 取得教練本人的後台資料（含技能清單）
router.get("/coaches", auth, isCoach, adminController.getCoachSelfDetail);

// 更新教練本人的後台資料（含整批更換技能）
router.put("/coaches", auth, isCoach, adminController.putCoachProfile);

// 取得單一課程詳情（編輯課程時的初始值）
router.get(
  "/coaches/courses/:courseId",
  auth,
  isCoach,
  adminController.getCoachOwnCourseDetail,
);

// 取得教練本人開設的全部課程列表
router.get(
  "/coaches/courses",
  auth,
  isCoach,
  adminController.getCoachOwnCourses,
);


// 更新單一課程
router.put(
  "/coaches/courses/:courseId",
  auth,
  isCoach,
  adminController.putCoachCourse,
);

// 取得教練自己的營收資料 api/admin/coaches/revenue
router.get(
  "/coaches/revenue",
  auth,
  isCoach,
  adminController.getCoachSelfRevenue,
);

module.exports = router;
