// TODO：貼上 CreditPackage 的 EntitySchema（堂數組合包）
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'CreditPackage',        // 程式裡的名字：getRepository('CreditPackage') 用它
  tableName: 'CREDIT_PACKAGE',  // 資料庫裡實際的表名
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
      nullable: false,
    },
    name: {
      type: 'varchar',
      length: 50,
      nullable: false,
      unique: true,
    },
    credit_amount: {
      type: 'integer',
      nullable: false,
    },
    price: {
      type: 'numeric',   // 注意：numeric 從資料庫回來會是字串
      precision: 10,
      scale: 2,
      nullable: false,
    },
    created_at: {
      type: 'timestamp',
      createDate: true,  // 新增資料時自動填入當下時間
      nullable: false,
    },
  },
})
