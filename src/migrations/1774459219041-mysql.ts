import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1774459219041 implements MigrationInterface {
    name = 'Mysql1774459219041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_blocks\` (\`id\` int NOT NULL AUTO_INCREMENT, \`blocker_id\` int NOT NULL, \`blocked_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_user_blocks_blocked_id\` (\`blocked_id\`), INDEX \`IDX_user_blocks_blocker_id\` (\`blocker_id\`), UNIQUE INDEX \`UQ_user_blocks_blocker_blocked\` (\`blocker_id\`, \`blocked_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_dfcd8a81016d1de587fbd2d70bf\` FOREIGN KEY (\`blocker_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_7a0806a54f0ad9ced3e247cacd1\` FOREIGN KEY (\`blocked_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_7a0806a54f0ad9ced3e247cacd1\``);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_dfcd8a81016d1de587fbd2d70bf\``);
        await queryRunner.query(`DROP INDEX \`UQ_user_blocks_blocker_blocked\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_blocks_blocker_id\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_blocks_blocked_id\` ON \`user_blocks\``);
        await queryRunner.query(`DROP TABLE \`user_blocks\``);
    }

}
