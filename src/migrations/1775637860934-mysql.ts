import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1775637860934 implements MigrationInterface {
    name = 'Mysql1775637860934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`news\` ADD \`content\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`news\` DROP COLUMN \`content\``);
    }

}
