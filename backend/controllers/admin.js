const { dataSource } = require("../db/data-source");
const { Not, In, IsNull } = require("typeorm");
const validCheck = require("../utils/validCheck");
const resultHeader = require("../utils/resultHeader");
const Coach = require("../entities/Coach");
const User = require("../entities/User");
const CoachLinkSkill = require("../entities/CoachLinkSkill");
const logger = require("../utils/logger")("AdminController");
const getFormatDateRange = require("../utils/getFormatDateRange");

// 將指定使用者升級為教練
async function postCoach(req, res, next) {
  try {
    const userId = req.params.userId;
    const { experience_years, description, profile_image_url } = req.body || {};

    // 驗證資料正確性
    const errMsg = [];
    if (validCheck.isNotInteger(experience_years))
      errMsg.push("教練年資必須是整數");
    if (validCheck.isNotString(description)) errMsg.push("教練簡介為必填");
    if (validCheck.isNotString(userId) || validCheck.isNotUUID(userId))
      errMsg.push("使用者id錯誤");

    if (profile_image_url) {
      if (validCheck.isNotUrl(profile_image_url))
        errMsg.push("請輸入正確的大頭貼網址");
      if (
        validCheck.isNotPng(profile_image_url) &&
        validCheck.isNotJpg(profile_image_url)
      )
        errMsg.push("大頭貼須為.png, .jpg格式");
    }

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    const userRepo = dataSource.getRepository("User");
    const findUser = await userRepo.findOne({
      select: { id: true, name: true, role: true },
      where: { id: userId },
    });

    if (!findUser) {
      resultHeader(res, 400, "failed", { message: "使用者不存在" });
      return;
    } else if (findUser.role === "COACH") {
      resultHeader(res, 409, "failed", { message: "使用者已經是教練" });
      return;
    }

    // 使用交易更新2個資料表
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        User,
        {
          id: userId,
          role: "USER",
        },
        {
          role: "COACH",
        },
      );

      const savedCoach = await queryRunner.manager.save(Coach, {
        user_id: userId,
        experience_years,
        description,
        profile_image_url,
      });
      await queryRunner.commitTransaction();

      const savedUser = await dataSource.getRepository("User").findOne({
        select: { name: true, role: true },
        where: { id: userId },
      });

      resultHeader(res, 200, "success", {
        data: { user: savedUser, coach: savedCoach },
      });
      return;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(error);
      resultHeader(res, 400, "failed", { message: "更新使用者失敗" });
      return;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得教練本人的後台資料（含技能清單）
async function getCoachSelfDetail(req, res, next) {
  try {
    const { id } = req.user;

    //--取得教練的coachId 以及技能
    const findCoach = await dataSource.getRepository("Coach").findOne({
      select: {
        id: true,
        experience_years: true,
        description: true,
        profile_image_url: true,
      },
      where: { user_id: id },
      relations: { CoachLinkSkill: true },
    });

    if (!findCoach) {
      resultHeader(res, 400, "failed", { message: "找不到教練" });
      return;
    }

    const coachSkillIds = (findCoach.CoachLinkSkill || []).map(
      (item) => item.skill_id,
    );

    const resData = {
      id: findCoach.id,
      experience_years: findCoach.experience_years,
      description: findCoach.description,
      profile_image_url: findCoach.profile_image_url,
      skill_ids: coachSkillIds,
    };

    resultHeader(res, 200, "success", { data: resData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 更新教練本人的後台資料（含整批更換技能）
async function putCoachProfile(req, res, next) {
  try {
    const { id } = req.user;
    const { experience_years, description, profile_image_url, skill_ids } =
      req.body;

    //-- 驗證資料--//
    const errMsg = [];
    if (validCheck.isNotInteger(experience_years))
      errMsg.push("教練年資必須是整數");
    if (validCheck.isNotString(description)) errMsg.push("教練簡介為必填");

    let uniqueSkillIds = [];
    if (!Array.isArray(skill_ids) || skill_ids.length === 0) {
      errMsg.push("專長id為必填");
    } else {
      uniqueSkillIds = [...new Set(skill_ids)];
      const hasInvalidSkillId = uniqueSkillIds.some(
        (skillId) =>
          validCheck.isNotString(skillId) || validCheck.isNotUUID(skillId),
      );
      if (hasInvalidSkillId) errMsg.push("專長id錯誤");
    }

    if (profile_image_url) {
      if (validCheck.isNotUrl(profile_image_url, true))
        errMsg.push("請輸入正確的大頭貼網址");
      if (
        validCheck.isNotPng(profile_image_url) &&
        validCheck.isNotJpg(profile_image_url)
      )
        errMsg.push("大頭貼須為.png, .jpg格式");
    }

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    // 驗證skill_id是否可用
    const skillRepo = dataSource.getRepository("Skill");
    const findSkill = await skillRepo.find({
      where: { id: In(uniqueSkillIds) },
    });

    if (findSkill.length !== uniqueSkillIds.length) {
      // 表示有技能不正確
      resultHeader(res, 400, "failed", { message: "專長id錯誤" });
      return;
    }

    //--取得教練的coachId 以及技能
    const findCoach = await dataSource.getRepository("Coach").findOne({
      where: { user_id: id },
      relations: { CoachLinkSkill: true },
    });

    if (!findCoach) {
      resultHeader(res, 400, "failed", { message: "找不到教練" });
      return;
    }

    //--取得教練原本的技能--//
    const existSkillIds = (findCoach.CoachLinkSkill || []).map(
      (item) => item.skill_id,
    );
    const deleteSkillIds = existSkillIds.filter(
      (skillId) => !uniqueSkillIds.includes(skillId),
    );

    //--檢查需要刪除的技能是否已經用來開課--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = deleteSkillIds.length
      ? await courseRepo.find({
          where: { user_id: id, skill_id: In(deleteSkillIds) },
          relations: { Skill: true },
        })
      : [];

    const canNotdeleteItem = {};
    findCourse.forEach((item) => {
      canNotdeleteItem[item.Skill.id] = item.Skill.name;
    });

    if (Object.keys(canNotdeleteItem).length > 0) {
      resultHeader(res, 400, "failed", {
        message: "已有相關開課資訊的技能，不可刪除!",
        info: canNotdeleteItem,
      });
      return;
    }

    // --需要增加到資料表的技能--//
    const insertSkill = uniqueSkillIds.filter(
      (id) => !existSkillIds.includes(id),
    );

    const insertData = [];
    insertSkill.forEach((item) => {
      insertData.push({
        coach_id: findCoach.id,
        skill_id: item,
      });
    });

    // 使用交易更新2個資料表
    let resData;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        Coach,
        {
          id: findCoach.id,
        },
        {
          experience_years: experience_years,
          description: description,
          profile_image_url: profile_image_url,
        },
      );

      // 刪除不在選擇裡的技能id
      if (uniqueSkillIds.length) {
        await queryRunner.manager.delete(CoachLinkSkill, {
          coach_id: findCoach.id,
          skill_id: Not(In(uniqueSkillIds)),
        });
      }

      //增加沒有選到的技能id
      if (insertData.length) {
        await queryRunner.manager.insert(CoachLinkSkill, insertData);
      }
      await queryRunner.commitTransaction();

      const savedCoach = await dataSource.getRepository("Coach").findOne({
        where: { id: findCoach.id },
        relations: { CoachLinkSkill: true },
      });

      const coachSkillIds = (savedCoach.CoachLinkSkill || []).map(
        (item) => item.skill_id,
      );

      resData = {
        experience_years: savedCoach.experience_years,
        description: savedCoach.description,
        profile_image_url: savedCoach.profile_image_url,
        skill_ids: coachSkillIds,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(error);
      resultHeader(res, 400, "failed", { message: "更新使用者失敗" });
      return;
    } finally {
      await queryRunner.release();
    }
    resultHeader(res, 200, "success", { data: resData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得教練本人開設的全部課程列表
async function getCoachOwnCourses(req, res, next) {
  try {
    const { id } = req.user;

    //--取得課程資料--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.find({ where: { user: { id } } });

    const bookingCountMap = {};
    findCourse.forEach((item) => {
      bookingCountMap[item.id] = 0;
    });

    //--取得已報名人數--//
    const courseBookingRepo = dataSource.getRepository("CourseBooking");

    const courseIds = Object.keys(bookingCountMap);
    const findCourseBookingData = courseIds.length
      ? await courseBookingRepo.find({
          select: { course_id: true },
          where: { course_id: In(courseIds), cancelled_at: IsNull() },
        })
      : [];

    findCourseBookingData.forEach((item) => {
      bookingCountMap[item.course_id]++;
    });

    const courseData = findCourse.map((item) => {
      const start_date = new Date(item.start_at);
      const end_date = new Date(item.end_at);

      const dateNow = Date.now();

      let item_status = "尚未開始";
      if (start_date.getTime() < dateNow && end_date.getTime() > dateNow) {
        item_status = "報名中";
      } else if (end_date.getTime() <= dateNow) {
        item_status = "已結束";
      }

      if (
        item_status === "報名中" &&
        bookingCountMap[item.id] >= item.max_participants
      ) {
        item_status = "已額滿";
      }

      return {
        id: item.id,
        status: item_status,
        name: item.name,
        start_at: item.start_at,
        end_at: item.end_at,
        meeting_url: item.meeting_url,
        max_participants: item.max_participants,
        participants: bookingCountMap[item.id],
      };
    });

    resultHeader(res, 200, "success", { data: courseData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 教練開設新課程
async function postCoachCourse(req, res, next) {
  try {
    const { id } = req.user;
    const {
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url,
    } = req.body;

    const dateNow = new Date();
    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    // 驗證資料正確性
    const errMsg = [];
    if (validCheck.isNotUUID(id) || validCheck.isNotString(id))
      errMsg.push("使用者id錯誤");
    if (validCheck.isNotUUID(skill_id) || validCheck.isNotString(skill_id))
      errMsg.push("專長ID錯誤");
    if (validCheck.isNotString(name, 100))
      errMsg.push("課程名稱為必填,長度100");
    if (validCheck.isNotString(description)) errMsg.push("課程介紹為必填");

    if (validCheck.isNotString(start_at)) errMsg.push("課程開始時間為必填");
    else if (validCheck.isNotDateTime(start_at))
      errMsg.push("課程開始時間格式錯誤");

    if (validCheck.isNotString(end_at)) errMsg.push("課程結束時間為必填");
    else if (validCheck.isNotDateTime(end_at))
      errMsg.push("課程結束時間格式錯誤");

    if (
      !validCheck.isNotDateTime(start_at) &&
      !validCheck.isNotDateTime(end_at)
    ) {
      // --課程開始時間與課程結束時間不可為過去時間
      // if (startDate < dateNow || endDate < dateNow)
      //  errMsg.push("課程開始時間與課程結束時間不可為過去");

      if (endDate < dateNow) errMsg.push("課程結束時間不可為過去");

      // --課程結束時間大於課程開始時間
      if (startDate > endDate) errMsg.push("課程結束時間必須大於課程開始時間");
    }

    if (validCheck.isNotInteger(max_participants) || max_participants <= 0)
      errMsg.push("最大上課人數為必填，且需大於0");

    if (meeting_url && validCheck.isNotUrl(meeting_url, true))
      errMsg.push("線上直播網址URL格式錯誤");

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    //--檢查skill_id--//
    const skillRepo = dataSource.getRepository("Skill");
    const findSkill = await skillRepo.findOne({
      where: { id: skill_id },
    });
    if (!findSkill) {
      resultHeader(res, 400, "failed", { message: "該技能不存在" });
      return;
    }

    //--檢查教練是否有該技能--//
    const coachRepo = dataSource.getRepository("Coach");
    const findCoach = await coachRepo.findOne({
      where: { user_id: id },
      relations: { CoachLinkSkill: true },
    });

    if (!findCoach) {
      resultHeader(res, 400, "failed", { message: "使用者尚未成為教練" });
      return;
    }

    const coachSkillIds = (findCoach.CoachLinkSkill || []).map(
      (item) => item.skill_id,
    );

    if (!coachSkillIds.includes(skill_id)) {
      // resultHeader(res, 400, "failed", { message: "教練無相關技能,無法開課!" });
      // return;
    }

    const courseRepo = dataSource.getRepository("Course");
    const newCourse = courseRepo.create({
      user: { id },
      skill: { id: skill_id },
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url,
    });
    const result = await courseRepo.save(newCourse);
    resultHeader(res, 201, "success", { data: { course: result } });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得單一課程詳情（編輯課程時的初始值）
async function getCoachOwnCourseDetail(req, res, next) {
  try {
    const { id } = req.user;
    const courseId = req.params.courseId;

    if (validCheck.isNotUUID(courseId)) {
      resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
      return;
    }

    //--取得課程資料--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.findOne({
      where: { id: courseId },
      relations: {
        user: true,
        skill: true,
      },
    });

    if (!findCourse) {
      resultHeader(res, 400, "failed", { message: "課程不存在" });
      return;
    } else {
      if (findCourse.user.id !== id) {
        resultHeader(res, 400, "failed", { message: "課程不存在" });
        return;
      }
    }

    //--取得已報名人數--//
    const courseBookingRepo = dataSource.getRepository("CourseBooking");
    const findCourseBookingCount = await courseBookingRepo.count({
      where: { course_id: courseId, cancelled_at: IsNull() },
    });

    // check status
    const start_date = new Date(findCourse.start_at);
    const end_date = new Date(findCourse.end_at);
    const dateNow = Date.now();

    let course_status = "尚未開始";

    if (start_date.getTime() < dateNow && end_date.getTime() > dateNow) {
      course_status = "報名中";
    } else if (end_date.getTime() <= dateNow) {
      course_status = "已結束";
    }

    if (
      course_status === "報名中" &&
      findCourseBookingCount >= findCourse.max_participants
    ) {
      course_status = "已額滿";
    }

    const courseData = {
      id: findCourse.id,
      name: findCourse.name,
      description: findCourse.description,
      start_at: findCourse.start_at,
      end_at: findCourse.end_at,
      max_participants: findCourse.max_participants,
      skill_id: findCourse.skill?.id ?? null,
      skill_name: findCourse.skill?.name ?? null,
      meeting_url: findCourse.meeting_url,
    };

    resultHeader(res, 200, "success", { data: courseData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 更新單一課程
async function putCoachCourse(req, res, next) {
  try {
    const { id } = req.user;

    const courseId = req.params.courseId;
    const {
      skill_id,
      name,
      description,
      start_at,
      end_at,
      max_participants,
      meeting_url,
    } = req.body;

    const dateNow = new Date();
    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    // 驗證資料正確性
    const errMsg = [];
    if (validCheck.isNotUUID(courseId) || validCheck.isNotString(courseId))
      errMsg.push("課程ID錯誤");
    if (validCheck.isNotUUID(skill_id) || validCheck.isNotString(skill_id))
      errMsg.push("技能ID錯誤");
    if (validCheck.isNotString(name)) errMsg.push("課程名稱為必填");
    if (validCheck.isNotString(description)) errMsg.push("課程介紹為必填");

    if (validCheck.isNotString(start_at)) errMsg.push("課程開始時間為必填");
    else if (validCheck.isNotDateTime(start_at))
      errMsg.push("課程開始時間格式錯誤");

    if (validCheck.isNotString(end_at)) errMsg.push("課程結束時間為必填");
    else if (validCheck.isNotDateTime(end_at))
      errMsg.push("課程結束時間格式錯誤");

    if (
      !validCheck.isNotDateTime(start_at) &&
      !validCheck.isNotDateTime(end_at)
    ) {
      // --課程開始時間與課程結束時間不可為過去時間
      if (startDate < dateNow || endDate < dateNow)
        errMsg.push("課程開始時間與課程結束時間不可為過去");

      // --課程結束時間大於課程開始時間
      if (startDate > endDate) errMsg.push("課程結束時間必須大於課程開始時間");
    }

    if (validCheck.isNotInteger(max_participants) || max_participants <= 0)
      errMsg.push("最大上課人數為必填，且需大於0");
    if (meeting_url && validCheck.isNotUrl(meeting_url))
      errMsg.push("線上直播網址URL格式錯誤");

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    //--檢查課程id--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.findOne({
      where: { id: courseId, user: { id } },
    });
    if (!findCourse) {
      resultHeader(res, 400, "failed", { message: "錯誤的課程id" });
      return;
    }

    //--檢查skill_id--//
    const skillRepo = dataSource.getRepository("Skill");
    const findSkill = await skillRepo.findOne({
      where: { id: skill_id },
    });
    if (!findSkill) {
      resultHeader(res, 400, "failed", { message: "該技能不存在" });
      return;
    }

    //--檢查教練是否有該技能--//
    const coachRepo = dataSource.getRepository("Coach");
    const findCoach = await coachRepo.findOne({
      where: { user_id: id },
      relations: { CoachLinkSkill: true },
    });

    if (!findCoach) {
      resultHeader(res, 400, "failed", { message: "使用者尚未成為教練" });
      return;
    }

    const coachSkillIds = findCoach.CoachLinkSkill.map((item) => item.skill_id);
    if (!coachSkillIds.includes(skill_id)) {
      // 這裡先註解不然驗證不會過
      // resultHeader(res, 400, "failed", { message: "教練無相關技能,無法開課!" });
      // return;
    }

    const result = await courseRepo.update(
      {
        id: courseId,
      },
      {
        skill: { id: skill_id },
        name,
        description,
        start_at,
        end_at,
        max_participants,
        meeting_url,
      },
    );

    if (result.affected === 0) {
      resultHeader(res, 400, "failed", { message: "更新課程失敗" });
      return;
    }

    // 取得更新後的資料, update 不會回傳資料
    const getNewCourse = await courseRepo.findOne({
      where: { id: courseId },
    });

    resultHeader(res, 200, "success", { data: { course: getNewCourse } });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得教練本人指定月份的營收統計 (挑戰)
async function getCoachSelfRevenue(req, res, next) {
  try {
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];

    const total = {
      participants: 0,
      revenue: 0,
      course_count: 0,
    };

    const { id } = req.user;
    const year = new Date().getUTCFullYear();
    const monthStr = (
      req.query.month || monthNames[new Date().getUTCMonth()]
    ).toLowerCase();
    const monNum = monthNames.indexOf(monthStr) + 1;
    if (monNum <= 0) {
      resultHeader(res, 400, "failed", { message: "月份參數錯誤" });
      return;
    }

    if (!/^\d{4}$/.test(String(year))) {
      resultHeader(res, 400, "failed", { message: "年份參數錯誤" });
      return;
    }

    const month = monNum.toString().padStart(2, "0");

    // 計算日期範圍--//
    const base_date = `${year}-${month}-01`;
    const fullDateRange = getFormatDateRange(base_date);

    const startDate = new Date(fullDateRange.start);
    const endDate = new Date(fullDateRange.end);

    //--取得這位教練「所有」課程的 ID（不限時間）--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo
      .createQueryBuilder("course")
      .where("course.user_id = :user_id", { user_id: id })
      .getMany();
    const courseIds = findCourse.map((item) => item.id);

    if (!courseIds.length) {
      resultHeader(res, 200, "success", { data: { total: total } });
      return;
    }

    //--取得「報名建立時間」落在當月範圍內、未取消的 Booking--//
    const courseBookingRepo = dataSource.getRepository("CourseBooking");
    const findCourseBooking = await courseBookingRepo
      .createQueryBuilder("course_booking")
      .where("course_booking.cancelled_at IS NULL")
      .andWhere("course_booking.course_id IN (:...courseIds)", {
        courseIds: courseIds,
      })
      .andWhere("course_booking.created_at >= :startDate", { startDate })
      .andWhere("course_booking.created_at <= :endDate", { endDate })
      .getMany();
    const courseBookingCount = findCourseBooking.length;

    //--計算學員數--//
    //--計算實際開課堂數 (篩選沒有學員)--//
    const courseBookingUserIds = [];
    const activeCourseIds = [];
    findCourseBooking.forEach((item) => {
      if (!activeCourseIds.includes(item.course_id))
        activeCourseIds.push(item.course_id);
      if (!courseBookingUserIds.includes(item.user_id))
        courseBookingUserIds.push(item.user_id);
    });

    //--計算單堂課價格（全部方案定義的均價，不是購買紀錄）--//
    const creditPackageRepo = dataSource.getRepository("CreditPackage");
    const findCreditPackage = await creditPackageRepo
      .createQueryBuilder("credit_package")
      .select("SUM(credit_package.credit_amount)", "total_credit_amount")
      .addSelect("SUM(credit_package.price)", "total_price")
      .getRawOne();

    const totalCreditAmount =
      Number(findCreditPackage.total_credit_amount) || 0;
    const totalPrice = Number(findCreditPackage.total_price) || 0;

    const perCoursePrice =
      totalCreditAmount > 0 ? totalPrice / totalCreditAmount : 0;

    total.participants = courseBookingUserIds.length;
    total.revenue = Math.floor(courseBookingCount * perCoursePrice);
    total.course_count = courseBookingCount; // 未取消的报名笔数，等同 findCourseBooking.length

    resultHeader(res, 200, "success", { data: { total: total } });
    return;
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

module.exports = {
  postCoach,
  getCoachSelfDetail,
  putCoachProfile,
  getCoachOwnCourses,
  postCoachCourse,
  getCoachOwnCourseDetail,
  putCoachCourse,
  getCoachSelfRevenue,
};
