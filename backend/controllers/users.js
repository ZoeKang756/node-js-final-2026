require("dotenv").config();
const bcrypt = require("bcrypt");
const { dataSource } = require("../db/data-source");
const { IsNull } = require("typeorm");
const validCheck = require("../utils/validCheck");
const resultHeader = require("../utils/resultHeader");
const logger = require("../utils/logger")("ＵserController");
const generateJWT = require("../utils/generateJWT");
const pwdPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/;
const pwdSaltRounds = 10;

// 註冊新會員帳號
async function postSignup(req, res, next) {
  try {
    const name = req.body.name !== undefined ? req.body.name : "";
    const email = req.body.email !== undefined ? req.body.email : "";
    const password = req.body.password !== undefined ? req.body.password : "";

    const errMsg = [];

    //驗證資料正確性
    if (validCheck.isNotNoSymbolString(name))
      errMsg.push("使用者名稱不可包含任何特殊符號與空白");
    if (validCheck.isNotValidStrLen(name, 2, 10))
      errMsg.push("使用者名稱最少2個字，最多10個字");
    if (validCheck.isNotEmail(email)) errMsg.push("email格式不正確");
    if (
      validCheck.isNotPwd(password, pwdPattern) ||
      validCheck.isNotValidStrLen(password, 8, 16)
    )
      errMsg.push(
        "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字",
      );

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    //檢查Email 是否使用過了
    const userRepo = dataSource.getRepository("User");
    const findUser = await userRepo.findOne({
      where: { email: email },
    });

    if (findUser) {
      resultHeader(res, 409, "failed", { message: "Email已被使用!" });
      return;
    }

    // 密碼記得要加密
    const hashPassword = await bcrypt.hash(password, pwdSaltRounds);
    const newUser = userRepo.create({
      name,
      role: "USER",
      email,
      password: hashPassword,
    });

    // 新增使用者
    const result = await userRepo.save(newUser);
    const userData = {
      user: {
        id: result.id,
        name: result.name,
      },
    };
    resultHeader(res, 201, "success", { data: userData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 會員登入，取得 JWT token
async function postLogin(req, res, next) {
  try {
    const email = req.body.email !== undefined ? req.body.email : "";
    const password = req.body.password !== undefined ? req.body.password : "";

    //--驗證資料正確性--//
    const errMsg = [];

    if (validCheck.isNotEmail(email)) errMsg.push("email格式不正確");
    if (
      validCheck.isNotPwd(password, pwdPattern) ||
      validCheck.isNotValidStrLen(password, 8, 16)
    )
      errMsg.push(
        "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字",
      );

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    const userRepo = dataSource.getRepository("User");
    const findUser = await userRepo.findOne({
      select: { id: true, name: true, password: true, role: true },
      where: { email: email },
    });

    if (!findUser) {
      resultHeader(res, 400, "failed", {
        message: "使用者不存在或密碼輸入錯誤!",
      });
      return;
    }

    // 檢查密碼
    const checkPassword = await bcrypt.compare(password, findUser.password);
    if (!checkPassword) {
      resultHeader(res, 400, "failed", {
        message: "使用者不存在或密碼輸入錯誤!",
      });
      return;
    }

    // 產生token
    const token = await generateJWT(
      {
        id: findUser.id,
        role: findUser.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: `${process.env.JWT_EXPIRES_DAY}`,
      },
    );

    const outputData = {
      token: token,
      user: {
        name: findUser.name,
      },
    };

    // 輸出結果
    resultHeader(res, 200, "success", { data: outputData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得本人的個人資料
async function getProfile(req, res, next) {
  try {
    // 檢查資料
    const { id } = req.user;
    const userRepo = dataSource.getRepository("User");
    const user = await userRepo.findOne({
      select: { name: true, email: true },
      where: { id },
    });
    if (!user) {
      resultHeader(res, 404, "failed", { message: "使用者不存在" });
      return;
    }
    resultHeader(res, 200, "success", { data: { user } });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 更新本人的暱稱
async function putProfile(req, res, next) {
  try {
    const { id } = req.user;
    const name = req.body.name !== undefined ? req.body.name : "";

    const errMsg = [];

    //驗證資料正確性
    if (validCheck.isNotNoSymbolString(name))
      errMsg.push("使用者名稱不可包含任何特殊符號與空白");
    if (validCheck.isNotValidStrLen(name, 2, 10))
      errMsg.push("使用者名稱最少2個字，最多10個字");

    if (errMsg.length > 0) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
        info: errMsg,
      });
      return;
    }

    const userRepo = dataSource.getRepository("User");
    const result = await userRepo.update(
      {
        id,
      },
      {
        name,
      },
    );

    if (result.affected === 0) {
      resultHeader(res, 400, "failed", { message: "更新使用者資料失敗" });
      return;
    }

    const afterResult = await userRepo.findOne({
      select: { name: true },
      where: {
        id,
      },
    });

    resultHeader(res, 200, "success", { data: { user: afterResult } });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 修改本人的登入密碼
async function putPassword(req, res, next) {
  try {
    const { id } = req.user;
    const { password, new_password, confirm_new_password } = req.body;

    //驗證資料正確性
    if (
      validCheck.isNotString(password) ||
      validCheck.isNotString(new_password) ||
      validCheck.isNotString(confirm_new_password)
    ) {
      resultHeader(res, 400, "failed", {
        message: "欄位未填寫正確",
      });
      return;
    }

    if (
      validCheck.isNotPwd(password, pwdPattern) ||
      validCheck.isNotValidStrLen(password, 8, 16) ||
      validCheck.isNotPwd(new_password, pwdPattern) ||
      validCheck.isNotValidStrLen(new_password, 8, 16) ||
      validCheck.isNotPwd(confirm_new_password, pwdPattern) ||
      validCheck.isNotValidStrLen(confirm_new_password, 8, 16)
    ) {
      resultHeader(res, 400, "failed", {
        message:
          "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字",
      });
      return;
    }

    if (new_password !== confirm_new_password) {
      resultHeader(res, 400, "failed", { message: "新密碼與驗證新密碼不一致" });
      return;
    }

    if (new_password === password) {
      resultHeader(res, 400, "failed", { message: "新密碼不能與舊密碼相同" });
      return;
    }

    //--驗證輸入密碼--//
    const userRepo = dataSource.getRepository("User");
    const findUser = await userRepo.findOne({
      select: { password: true },
      where: { id },
    });

    if (!findUser) {
      resultHeader(res, 401, "failed", { message: "使用者不存在" });
      return;
    }

    const comparePassword = await bcrypt.compare(password, findUser.password);
    if (!comparePassword) {
      resultHeader(res, 400, "failed", { message: "密碼輸入錯誤" });
      return;
    }

    //--新密碼加密--//
    const hashPassword = await bcrypt.hash(new_password, pwdSaltRounds);

    //--更新密碼--//
    const result = await userRepo.update(
      {
        id,
      },
      {
        password: hashPassword,
      },
    );

    if (result.affected === 0) {
      resultHeader(res, 400, "failed", { message: "更新密碼失敗" });
      return;
    }

    resultHeader(res, 200, "success", { data: null });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得本人的購買方案紀錄
async function getCreditPackages(req, res, next) {
  try {
    const { id } = req.user;
    const creditPurchaseRepo = dataSource.getRepository("CreditPurchase");
    const findCreditPurchase = await creditPurchaseRepo.find({
      select: {
        purchased_credits: true,
        price_paid: true,
        purchase_at: true,
        CreditPackage: { name: true },
      },
      where: { user_id: id },
      relations: { CreditPackage: true },
    });

    const purchaseData = findCreditPurchase.map((item) => ({
      purchased_credits: item.purchased_credits,
      price_paid: item.price_paid,
      name: item.CreditPackage?.name ?? "未知方案",
      purchase_at: item.purchase_at,
    }));

    resultHeader(res, 200, "success", { data: purchaseData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}
// 取得本人的課表與剩餘堂數
async function getBookingCourses(req, res, next) {
  try {
    const { id } = req.user;
    const courseBookingRepo = dataSource.getRepository("CourseBooking");
    const findCourseBooking = await courseBookingRepo.find({
      where: { user_id: id },
      relations: { Course: { user: true } },
    });

    // 取得有效預約堂數
    const usedBookingCount = await courseBookingRepo.count({
      where: { user_id: id, cancelled_at: IsNull() },
    });

    // 取得總購買合約堂數
    const creditPurchaseRepo = dataSource.getRepository("CreditPurchase");
    const userCreditSum = await creditPurchaseRepo.sum("purchased_credits", {
      user_id: id,
    });

    const credit_remain = (userCreditSum ?? 0) - usedBookingCount;
    const credit_usage = usedBookingCount;

    const bookingData = findCourseBooking.map((item) => {
      const start_date = new Date(item.Course.start_at);
      const end_date = new Date(item.Course.end_at);

      let item_status = "PENDING";
      if (
        start_date.getTime() < Date.now() &&
        end_date.getTime() > Date.now()
      ) {
        item_status = "PROGRESS";
      } else if (end_date.getTime() <= Date.now()) {
        item_status = "COMPLETED";
      }

      return {
        name: item.Course.name,
        course_id: item.course_id,
        coach_name: item.Course.user.name,
        status: item_status,
        start_at: item.Course.start_at,
        end_at: item.Course.end_at,
        meeting_url: item.Course.meeting_url,
        cancelled_at: item.cancelled_at,
      };
    });

    resultHeader(res, 200, "success", {
      data: { credit_remain, credit_usage, course_booking: bookingData },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}
/*
async function getBookingCourses(req, res, next) {
  try {
    const { id } = req.user;
    const courseBookingRepo = dataSource.getRepository("CourseBooking");
    const findCourseBooking = await courseBookingRepo.find({
      where: { user_id: id, cancelled_at: IsNull() },
      relations: { Course: { user: true } },
    });

    // 取得課堂教練的user_id
    const getCourseCoachUserId = [];
    findCourseBooking.forEach((item) => {
      if (!getCourseCoachUserId.includes(item.Course.user_id))
        getCourseCoachUserId.push(item.Course.user_id);
    });

    // 取得課堂教練的user_name
    const getCourseCoachUserName = {};
    if (getCourseCoachUserId.length) {
      const findCoachUserData = await dataSource.getRepository("User").find({
        select: { id: true, name: true },
        where: { id: In(getCourseCoachUserId) },
      });

      findCoachUserData.forEach((item) => {
        getCourseCoachUserName[item.id] = item.name;
      });
    }

    // 取得有效預約堂數
    const usedBookingCount = await courseBookingRepo.count({
      where: {
        user_id: id,
        cancelled_at: IsNull(),
      },
    });

    // 取得總購買合約堂數
    const creditPurchaseRepo = dataSource.getRepository("CreditPurchase");
    const userCreditSum = await creditPurchaseRepo.sum("purchased_credits", {
      user_id: id,
    });

    // 剩餘堂數
    const credit_remain = (userCreditSum ?? 0) - usedBookingCount;

    // 已使用堂數
    const credit_usage = usedBookingCount;

    const bookingData = [];
    findCourseBooking.forEach((item) => {
      // check status
      const start_date = new Date(item.Course.start_at);
      const end_date = new Date(item.Course.end_at);

      let item_status = "PENDING";

      if (
        start_date.getTime() < Date.now() &&
        end_date.getTime() > Date.now()
      ) {
        item_status = "PROGRESS";
      } else if (end_date.getTime() <= Date.now()) {
        item_status = "COMPLETED";
      }

      bookingData.push({
        name: item.Course.name,
        course_id: item.course_id,
        coach_name: getCourseCoachUserName[item.Course.user_id],
        status: item_status,
        start_at: item.Course.start_at,
        end_at: item.Course.end_at,
        meeting_url: item.Course.meeting_url,
      });
    });

    resultHeader(res, 200, "success", {
      data: { credit_remain, credit_usage, course_booking: bookingData },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}*/

module.exports = {
  postSignup,
  postLogin,
  getProfile,
  putProfile,
  putPassword,
  getCreditPackages,
  getBookingCourses,
};
