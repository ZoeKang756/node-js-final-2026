// TODO：貼上 User 的 EntitySchema（教練）
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "USER", // USER 是 PostgreSQL 保留字：手寫 SQL 要加引號，用 repository 就沒這問題
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid", nullable: false },
    name: { type: "varchar", length: 50, nullable: false },
    email: { type: "varchar", length: 320, nullable: false, unique: true },
    role: { type: "varchar", length: 20, nullable: false },
    password: {
      type: "varchar",
      length: 72,
      nullable: false,
      select: false,
    },
    created_at: { type: "timestamp", createDate: true, nullable: false }, // 新增時自動填
    updated_at: { type: "timestamp", updateDate: true, nullable: false }, // 每次更新自動改
  },
});
