import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1774423356600 implements MigrationInterface {
    name = 'Mysql1774423356600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_follows\` (\`id\` int NOT NULL AUTO_INCREMENT, \`follower_id\` int NOT NULL, \`followee_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_user_follows_followee_id\` (\`followee_id\`), INDEX \`IDX_user_follows_follower_id\` (\`follower_id\`), UNIQUE INDEX \`UQ_user_follows_follower_followee\` (\`follower_id\`, \`followee_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_f7af3bf8f2dcba61b4adc108239\` FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_ad9563c49281be94000f50a4308\` FOREIGN KEY (\`followee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_ad9563c49281be94000f50a4308\``);
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_f7af3bf8f2dcba61b4adc108239\``);
        await queryRunner.query(`DROP INDEX \`UQ_user_follows_follower_followee\` ON \`user_follows\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_follows_follower_id\` ON \`user_follows\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_follows_followee_id\` ON \`user_follows\``);
        await queryRunner.query(`DROP TABLE \`user_follows\``);
    }

}
