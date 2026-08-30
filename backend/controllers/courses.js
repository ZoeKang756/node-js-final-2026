const { dataSource } = require("../db/data-source");
const { MoreThan, LessThanOrEqual, IsNull } = require("typeorm");
const validCheck = require("../utils/validCheck");
const resultHeader = require("../utils/resultHeader");
const Course = require("../entities/Course");
const CourseBooking = require("../entities/CourseBooking");
const CreditPurchase = require("../entities/CreditPurchase");
const logger = require("../utils/logger")("CoursesController");

// 報名課程（學員用 token 報名一門課，最容易踩雷）
async function post(req, res, next) {
  try {
    const { id } = req.user;
    const courseId = req.params.courseId;

    //--資料驗證--//
    if (validCheck.isNotUUID(courseId)) {
      resultHeader(res, 400, "failed", { message: "課程id錯誤!" });
      return;
    }
    //--檢查是否正確課程id--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.findOne({ where: { id: courseId } });
    if (!findCourse) {
      resultHeader(res, 400, "failed", { message: "課程id不存在!" });
      return;
    }

    //--檢查課程是否過期--//
    // check status
    const start_date = new Date(findCourse.start_at);
    const end_date = new Date(findCourse.end_at);
    const dateNow = Date.now();

    if (end_date.getTime() < dateNow) {
      resultHeader(res, 400, "failed", {
        message: "該課程已經過期，無法報名!",
      });
      return;
    }

    //--驗證可使用堂數--//
    //--取得使用者購買堂數 - 已使用掉的堂數
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 用悲觀鎖鎖住這門課程的資料，避免其他交易同時讀到舊的人數
      const course = await queryRunner.manager.findOne(Course, {
        where: { id: courseId },
        lock: { mode: "pessimistic_write" },
      });
      //--檢查是否重複報名--//
      /*取消之後還可以重新報名
      const existingBooking = await queryRunner.manager.findOne(CourseBooking, {
        where: { user_id: id, course_id: courseId, cancelled_at: IsNull() },
      });*/

      /*取消之後不可以重新報名*/
      const existingBooking = await queryRunner.manager.findOne(CourseBooking, {
        where: { user_id: id, course_id: courseId },
      });

      if (existingBooking) {
        await queryRunner.rollbackTransaction();
        resultHeader(res, 400, "failed", { message: "已經報名過此課程" });
        return;
      }

      const courseBookingCount = await queryRunner.manager.count(
        CourseBooking,
        {
          where: { course_id: courseId, cancelled_at: IsNull() },
        },
      );

      if (course.max_participants <= courseBookingCount) {
        await queryRunner.rollbackTransaction();
        resultHeader(res, 400, "failed", {
          message: "已達最大參加人數，無法參加",
        });
        return;
      }

      const userBookingCount = await queryRunner.manager.count(CourseBooking, {
        where: { user_id: id, cancelled_at: IsNull() },
      });

      const totalCredit =
        (await queryRunner.manager.sum(CreditPurchase, "purchased_credits", {
          user_id: id,
        })) || 0;

      if (totalCredit <= userBookingCount) {
        await queryRunner.rollbackTransaction();
        resultHeader(res, 400, "failed", { message: "已無可使用堂數" });
        return;
      }

      const newBooking = queryRunner.manager.create(CourseBooking, {
        user_id: id,
        course_id: courseId,
      });
      await queryRunner.manager.save(CourseBooking, newBooking);

      await queryRunner.commitTransaction();
      resultHeader(res, 201, "success", { data: null });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取消課程報名（軟刪除：紀錄保留、標記取消、堂數自動歸還）
async function deleteCoursesById(req, res, next) {
  try {
    const { id } = req.user;
    const courseId = req.params.courseId;

    //--資料驗證--//
    if (validCheck.isNotUUID(courseId)) {
      resultHeader(res, 400, "failed", { message: "課程id錯誤!" });
      return;
    }

    //--檢查是否正確課程id--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.findOne({ where: { id: courseId } });
    if (!findCourse) {
      resultHeader(res, 400, "failed", { message: "課程id不存在!" });
      return;
    }

    //--檢查是否有報名--//
    const courseBookingRepo = dataSource.getRepository("CourseBooking");
    const findCourseBooking = await courseBookingRepo.find({
      where: { user_id: id, course_id: courseId },
    });

    const activeBooking = findCourseBooking.find(
      (item) => item.cancelled_at === null,
    );

    if (findCourseBooking.length === 0) {
      resultHeader(res, 400, "failed", { message: "您沒有報名該課程!" });
      return;
    }
    if (!activeBooking) {
      resultHeader(res, 400, "failed", { message: "相關課程已經取消了!" });
      return;
    }

    const delResult = await courseBookingRepo.update(
      {
        user_id: id,
        course_id: courseId,
        cancelled_at: IsNull(),
      },
      {
        cancelled_at: new Date(),
      },
    );

    if (delResult.affected === 0) {
      resultHeader(res, 400, "failed", { message: "取消失敗" });
      return;
    }
    resultHeader(res, 200, "success", { data: null });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得全站「進行中」的課程列表（公開，不用登入）
async function getAll(req, res, next) {
  const now = new Date();

  try {
    const courseRepo = dataSource.getRepository("Course");
    const findCourses = await courseRepo.find({
      where: {
        start_at: LessThanOrEqual(now),
        end_at: MoreThan(now),
      },
      relations: {
        user: true,
        skill: true,
      },
    });

    const coursesData = findCourses.map((item) => ({
      id: item.id,
      coach_name: item.user?.name ?? null,
      skill_name: item.skill?.name ?? null,
      name: item.name,
      description: item.description,
      start_at: item.start_at,
      end_at: item.end_at,
      max_participants: item.max_participants,
    }));

    resultHeader(res, 200, "success", { data: coursesData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

module.exports = {
  getAll,
  post,
  deleteCoursesById,
};
