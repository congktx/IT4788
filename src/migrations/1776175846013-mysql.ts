import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1776175846013 implements MigrationInterface {
    name = 'Mysql1776175846013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`price_discount\` decimal NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`price_discount\``);
    }

}
