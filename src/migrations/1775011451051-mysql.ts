import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1775011451051 implements MigrationInterface {
    name = 'Mysql1775011451051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`dev_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`devtype\` varchar(10) NOT NULL, \`devtoken\` varchar(512) NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_115a64b0db661b17e4625640a9\` (\`user_id\`), UNIQUE INDEX \`IDX_88b54cb5233e3bb8cf83827df1\` (\`devtoken\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`dev_tokens\` ADD CONSTRAINT \`FK_115a64b0db661b17e4625640a96\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`dev_tokens\` DROP FOREIGN KEY \`FK_115a64b0db661b17e4625640a96\``);
        await queryRunner.query(`DROP INDEX \`IDX_88b54cb5233e3bb8cf83827df1\` ON \`dev_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_115a64b0db661b17e4625640a9\` ON \`dev_tokens\``);
        await queryRunner.query(`DROP TABLE \`dev_tokens\``);
    }

}
