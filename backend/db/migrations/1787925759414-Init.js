/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class Init1787925759414 {
    name = 'Init1787925759414'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" ALTER COLUMN "price_paid" TYPE numeric(10,2)`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" ALTER COLUMN "price_paid" TYPE numeric(10,2)`);
    }
}
