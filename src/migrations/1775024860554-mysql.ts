import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1775024860554 implements MigrationInterface {
    name = 'Mysql1775024860554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`push_settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`like\` tinyint NOT NULL DEFAULT '1', \`comment\` tinyint NOT NULL DEFAULT '1', \`transaction\` tinyint NOT NULL DEFAULT '1', \`announcement\` tinyint NOT NULL DEFAULT '1', \`sound_on\` tinyint NOT NULL DEFAULT '1', \`sound_default\` varchar(50) NOT NULL DEFAULT 'default', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_00b9281ead6050207252a2e0f9\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`push_settings\` ADD CONSTRAINT \`FK_00b9281ead6050207252a2e0f92\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`push_settings\` DROP FOREIGN KEY \`FK_00b9281ead6050207252a2e0f92\``);
        await queryRunner.query(`DROP INDEX \`IDX_00b9281ead6050207252a2e0f9\` ON \`push_settings\``);
        await queryRunner.query(`DROP TABLE \`push_settings\``);
    }

}
