const { EntitySchema } = require("typeorm");
const { UUID } = require("typeorm/driver/mongodb/bson.typings.js");

module.exports = new EntitySchema({
  name: "CreditPurchase",
  tableName: "CREDIT_PURCHASE",
  columns: {
    id: {
      type: UUID,
      primary: true,
      generated: "uuid",
      nullable: false,
    },
    user_id: {
      type: "uuid",
      nullable: false,
    },
    credit_package_id: {
      type: "uuid",
      nullable: false,
    },
    purchased_credits: {
      type: "integer",
      nullable: false,
    },
    price_paid: {
      type: "numeric",
      precision: "10",
      scale: "2",
      nullable: false,
    },
    created_at: {
      nullable: false,
      type: "timestamp",
      createDate: true,
    },
    purchase_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
  },
  relations: {
    CreditPackage: {
      target: "CreditPackage",
      type: "many-to-one",
      inverseSide: "CreditPurchase",
      joinColumn: {
        name: "credit_package_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "purchase_credit_package_id_fk",
      },
    },
    User: {
      target: "User",
      type: "many-to-one",
      inverseSide: "CreditPurchase",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "credit_purchase_user_id_fk",
      },
    },
  },
});
