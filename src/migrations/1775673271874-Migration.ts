import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775673271874 implements MigrationInterface {
    name = 'Migration1775673271874'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversations\` ADD \`time_last_seen\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`conversations\` ADD \`last_messasge_id\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`conversations\` DROP COLUMN \`last_messasge_id\``);
        await queryRunner.query(`ALTER TABLE \`conversations\` DROP COLUMN \`time_last_seen\``);
    }

}
