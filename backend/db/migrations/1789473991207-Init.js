/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
module.exports = class Init1789473991207 {
    name = 'Init1789473991207'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "CREDIT_PACKAGE" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "credit_amount" integer NOT NULL, "price" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ecf0b7b4fa94068be54ebffa240" UNIQUE ("name"), CONSTRAINT "PK_9e8b84490e74b03df6b24b901ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "USER" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "email" character varying(320) NOT NULL, "role" character varying(20) NOT NULL, "password" character varying(72) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c090db0477be7a25259805e37c2" UNIQUE ("email"), CONSTRAINT "PK_480564dbef3c7391661ce3b9d5c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "SKILL" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0780a3ef1d521b8bee1c9b240de" UNIQUE ("name"), CONSTRAINT "PK_90109ddb53b4c7cf8efe1efad0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "COURSE" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text NOT NULL, "start_at" TIMESTAMP NOT NULL, "end_at" TIMESTAMP NOT NULL, "max_participants" integer NOT NULL, "meeting_url" character varying(200), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "skill_id" uuid, CONSTRAINT "PK_1dcd712a4d39dcfd9d46ca0ae11" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "COACH" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "experience_years" integer NOT NULL, "description" text NOT NULL, "profile_image_url" character varying(2048), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "update_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9970257bf1fb6ac7b8c2b13263c" UNIQUE ("user_id"), CONSTRAINT "REL_9970257bf1fb6ac7b8c2b13263" UNIQUE ("user_id"), CONSTRAINT "PK_86122345454fa1389314e7a74be" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "COACH_LINK_SKILL" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "coach_id" uuid NOT NULL, "skill_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "coach_link_skill_unique" UNIQUE ("coach_id", "skill_id"), CONSTRAINT "PK_98d2a75a426e66b24a7a5687419" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "COURSE_BOOKING" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "course_id" uuid NOT NULL, "booking_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(20), "join_at" TIMESTAMP, "leave_at" TIMESTAMP, "cancelled_at" TIMESTAMP, "cancellation_reason" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_88f0144d4507e4f42cb4e6a7c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "CREDIT_PURCHASE" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "credit_package_id" uuid NOT NULL, "purchased_credits" integer NOT NULL, "price_paid" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "purchase_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_45566d565b0b377382099c29b8a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "COURSE" ADD CONSTRAINT "FK_7c9837d128ab474cb3d409b448d" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COURSE" ADD CONSTRAINT "FK_10d952a5e55998cf12f448fcfab" FOREIGN KEY ("skill_id") REFERENCES "SKILL"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COACH" ADD CONSTRAINT "coach_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COACH_LINK_SKILL" ADD CONSTRAINT "coach_link_skill_coach_id_fk" FOREIGN KEY ("coach_id") REFERENCES "COACH"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COACH_LINK_SKILL" ADD CONSTRAINT "coach_link_skill_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "SKILL"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COURSE_BOOKING" ADD CONSTRAINT "course_booking_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "COURSE"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "COURSE_BOOKING" ADD CONSTRAINT "course_booking_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" ADD CONSTRAINT "purchase_credit_package_id_fk" FOREIGN KEY ("credit_package_id") REFERENCES "CREDIT_PACKAGE"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" ADD CONSTRAINT "credit_purchase_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "USER"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" DROP CONSTRAINT "credit_purchase_user_id_fk"`);
        await queryRunner.query(`ALTER TABLE "CREDIT_PURCHASE" DROP CONSTRAINT "purchase_credit_package_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COURSE_BOOKING" DROP CONSTRAINT "course_booking_user_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COURSE_BOOKING" DROP CONSTRAINT "course_booking_course_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COACH_LINK_SKILL" DROP CONSTRAINT "coach_link_skill_skill_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COACH_LINK_SKILL" DROP CONSTRAINT "coach_link_skill_coach_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COACH" DROP CONSTRAINT "coach_user_id_fk"`);
        await queryRunner.query(`ALTER TABLE "COURSE" DROP CONSTRAINT "FK_10d952a5e55998cf12f448fcfab"`);
        await queryRunner.query(`ALTER TABLE "COURSE" DROP CONSTRAINT "FK_7c9837d128ab474cb3d409b448d"`);
        await queryRunner.query(`DROP TABLE "CREDIT_PURCHASE"`);
        await queryRunner.query(`DROP TABLE "COURSE_BOOKING"`);
        await queryRunner.query(`DROP TABLE "COACH_LINK_SKILL"`);
        await queryRunner.query(`DROP TABLE "COACH"`);
        await queryRunner.query(`DROP TABLE "COURSE"`);
        await queryRunner.query(`DROP TABLE "SKILL"`);
        await queryRunner.query(`DROP TABLE "USER"`);
        await queryRunner.query(`DROP TABLE "CREDIT_PACKAGE"`);
    }
}
