// TODO：貼上 Course 的 EntitySchema（課程，含 relations）
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Course",
  tableName: "COURSE",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid", nullable: false },
    name: { type: "varchar", length: 100, nullable: false },
    description: { type: "text", nullable: false },
    start_at: { type: "timestamp", nullable: false },
    end_at: { type: "timestamp", nullable: false },
    max_participants: { type: "integer", nullable: false },
    meeting_url: { type: "varchar", length: 200, nullable: true },
    created_at: { type: "timestamp", createDate: true, nullable: false },
    updated_at: { type: "timestamp", updateDate: true, nullable: false },
  },
  // 關聯寫在 relations，不用自己宣告 user_id / skill_id 欄位——joinColumn 會長出來
  relations: {
    user: {
      target: "User", // 指向哪個 entity（用它的 name，這裡是大寫 User）
      type: "many-to-one", // 站在 Course 的角度：多堂課 → 一位教練
      joinColumn: { name: "user_id" }, // 資料庫實際的外來鍵欄位名
    },
    skill: {
      target: "Skill",
      type: "many-to-one",
      joinColumn: { name: "skill_id" },
    },
  },
});
