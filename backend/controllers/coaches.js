const { dataSource } = require("../db/data-source");
const { In, MoreThan } = require("typeorm");
const validCheck = require("../utils/validCheck");
const resultHeader = require("../utils/resultHeader");
const logger = require("../utils/logger")("CoachController");

// 取得教練技能列表
async function getSkills(req, res, next) {
  try {
    const skillRepo = dataSource.getRepository("Skill");
    const skills = await skillRepo.find({
      select: { id: true, name: true },
    });
    resultHeader(res, 200, "success", { data: skills });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 新增教練技能
async function upsertSkill(req, res, next) {
  const { name } = req.body;
  const skillId = req.params.skillId;
  try {
    // 驗證資料正確性
    if (
      validCheck.isUndefined(name) ||
      validCheck.isNotString(name, 50) ||
      (req.method === "PUT" && validCheck.isNotUUID(skillId))
    ) {
      resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
      return;
    }

    const skillRepo = dataSource.getRepository("Skill");
    let checkSkillId = {};

    // 檢查 id 是否存在
    if (req.method === "PUT" && skillId) {
      checkSkillId = await skillRepo.findOne({ where: { id: skillId } });
      if (!checkSkillId) {
        resultHeader(res, 400, "failed", { message: "專長Id錯誤" });
        return;
      }
    }

    // 檢查資料庫唯一值
    const skillResult = await skillRepo.findOne({ where: { name: name } });

    if (
      skillResult &&
      (req.method === "POST" ||
        (req.method === "PUT" && skillResult.id !== skillId))
    ) {
      resultHeader(res, 409, "failed", { message: "資料重複" });
      return;
    }

    if (skillId) {
      // 這裡是編輯
      const update = await skillRepo.update({ id: skillId }, { name });

      if (!update.affected) {
        resultHeader(res, 400, "failed", { message: "資料更新失敗" });
        return;
      }

      //----取得回傳資料---//
      const newSkill = await skillRepo.findOne({ where: { id: skillId } });
      resultHeader(res, 200, "success", { data: newSkill });
    } else {
      const newSkill = skillRepo.create({
        name,
      });
      const result = await skillRepo.save(newSkill);
      resultHeader(res, 201, "success", { data: result });
    }
  } catch (error) {
    logger.error(error);
    next(error);
  }
}
// 刪除教練技能
async function deleteSkill(req, res, next) {
  try {
    const skillId = req.params.skillId;

    // 檢查欄位
    if (validCheck.isNotUUID(skillId)) {
      resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
      return;
    }

    //--檢查需要刪除的技能是否已經用來開課--//
    const courseRepo = dataSource.getRepository("Course");
    const findCourse = await courseRepo.find({
      where: { skill: { id: skillId } },
      relations: { skill: true },
    });

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

    //--檢查需要刪除的技能是否已經與教練綁定--//
    const coachLinkSkillRepo = dataSource.getRepository("CoachLinkSkill");
    const findCoachLinkSkill = await coachLinkSkillRepo.find({
      where: { skill_id: skillId },
    });

    const coachIds = [
      ...new Set(findCoachLinkSkill.map((item) => item.coach_id)),
    ];

    const coachRepo = dataSource.getRepository("Coach");
    const findCoachData = coachIds.length
      ? await coachRepo.find({
          where: { id: In(coachIds) },
          relations: { User: true },
        })
      : [];

    const affectCoach = {};
    findCoachData.forEach((item) => {
      affectCoach[item.id] = item.User.name;
    });

    if (Object.keys(affectCoach).length > 0) {
      resultHeader(res, 400, "failed", {
        message: "已有教練綁定的技能，不可刪除!",
        info: affectCoach,
      });
      return;
    }

    // 刪除資料
    const result = await dataSource.getRepository("Skill").delete(skillId);
    if (result.affected === 0) {
      resultHeader(res, 400, "failed", { message: "ID錯誤" });
      return;
    }

    resultHeader(res, 200);
  } catch (error) {
    logger.error(error);
    next(error);
  }
}
// 取得教練分頁列表（公開，不用登入）
async function getCoachesV2(req, res, next) {
  if (!req.query.per || !req.query.page) {
    resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
    return;
  }

  let pageRow = parseInt(req.query.per) || 6; // 預設6筆
  let currentPage = parseInt(req.query.page) || 1; // 預設在第一頁
  if (pageRow < 1) pageRow = 6;
  if (currentPage < 1) currentPage = 1;

  let word = req.query.word || "";

  try {
    // 取得目前的資料
    const baseWhere = word
      ? "(coach.description ILIKE :word OR user.name ILIKE :word)"
      : "1=1";
    const whereParams = { word: `%${word}%` };

    // 先算出总筆數，才能知道 currentPage 是否合法
    const countQuery = dataSource
      .getRepository("Coach")
      .createQueryBuilder("coach")
      .innerJoin("coach.User", "user")
      .where(baseWhere, whereParams);

    const totalRow = await countQuery.getCount();
    const totalPage = Math.ceil(totalRow / pageRow) || 1;
    if (currentPage > totalPage) currentPage = totalPage;

    const coaches = await dataSource
      .getRepository("Coach")
      .createQueryBuilder("coach")
      .innerJoinAndSelect("coach.User", "user")
      .where(baseWhere, whereParams)
      .skip((currentPage - 1) * pageRow)
      .take(pageRow)
      .getMany();

    const nextPage = currentPage + 1 > totalPage ? totalPage : currentPage + 1;
    const prevPage = currentPage - 1 < 1 ? 1 : currentPage - 1;

    const allCoaches = coaches.map((item) => ({
      id: item.id,
      user_id: item.User.id,
      name: item.User.name,
      experience_years: item.experience_years,
      description: item.description,
      profile_image_url: item.profile_image_url,
      created_at: item.created_at,
    }));

    resultHeader(res, 200, "success", {
      data: allCoaches,
      pagination: {
        currentPage,
        totalPage,
        totalRow,
        pageRow,
        nextPage,
        prevPage,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得單一教練詳細資料（公開，不用登入）
async function getCoachDetail(req, res, next) {
  const coachId = req.params.coachId;
  if (validCheck.isNotUUID(coachId)) {
    resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
    return;
  }

  try {
    //--取得使用者資料--//
    const getCoach = await dataSource
      .getRepository("Coach")
      .createQueryBuilder("coach")
      .innerJoinAndSelect("coach.User", "user")
      .leftJoinAndSelect("coach.CoachLinkSkill", "coachLinkSkill")
      .leftJoinAndSelect("coachLinkSkill.Skill", "skill")
      .where("coach.id = :coachId", { coachId: coachId })
      .getOne();

    if (!getCoach) {
      resultHeader(res, 400, "failed", { message: "使用者不存在" });
      return;
    }

    const coachData = {
      user: {
        name: getCoach.User.name,
        role: getCoach.User.role,
      },
      coach: {
        id: getCoach.id,
        user_id: getCoach.user_id,
        experience_years: getCoach.experience_years,
        description: getCoach.description,
        profile_image_url: getCoach.profile_image_url,
        created_at: getCoach.created_at,
        updated_at: getCoach.updated_at,
        skills: getCoach.CoachLinkSkill.map((item) => ({
          id: item.Skill.id,
          name: item.Skill.name,
        })),
      },
    };

    resultHeader(res, 200, "success", { data: coachData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

// 取得指定教練「未結束」的課程列表（公開，不用登入）
async function getCoursesByCoachId(req, res, next) {
  try {
    const coachId = req.params.coachId;

    if (validCheck.isNotUUID(coachId)) {
      resultHeader(res, 400, "failed", { message: "欄位未填寫正確" });
      return;
    }

    const findCoach = await dataSource
      .getRepository("Coach")
      .findOne({ where: { id: coachId }, relations: { User: true } });
    if (!findCoach) {
      resultHeader(res, 400, "failed", { message: "找不到該教練" });
      return;
    }

    const findCourses = await dataSource.getRepository("Course").find({
      where: {
        user: { id: findCoach.user_id },
        end_at: MoreThan(new Date()),
      },
      relations: { skill: true },
      order: { start_at: "ASC" },
    });

    const courseData = findCourses.map((item) => ({
      id: item.id,
      name: item.name,
      skill_name: item.skill.name,
      coach_name: findCoach.User.name,
      description: item.description,
      start_at: item.start_at,
      end_at: item.end_at,
      meeting_url: item.meeting_url,
      max_participants: item.max_participants,
    }));

    resultHeader(res, 200, "success", { data: courseData });
  } catch (error) {
    logger.error(error);
    next(error);
  }
}

module.exports = {
  getSkills,
  upsertSkill,
  deleteSkill,
  getCoachesV2,
  getCoachDetail,
  getCoursesByCoachId,
};
