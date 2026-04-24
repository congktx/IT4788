import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1775488548749 implements MigrationInterface {
    name = 'Mysql1775488548749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`CREATE TABLE \`Provinces\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`Warehouses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`warehouse_name\` varchar(255) NOT NULL, \`ward_id\` int NOT NULL, \`address_detail\` text NULL, \`lat\` decimal(10,8) NOT NULL, \`lng\` decimal(11,8) NOT NULL, \`pick_support\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`Wards\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`provinces_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`image_url\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`brands\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`logo_url\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_follows\` (\`id\` int NOT NULL AUTO_INCREMENT, \`follower_id\` int NOT NULL, \`followee_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_user_follows_followee_id\` (\`followee_id\`), INDEX \`IDX_user_follows_follower_id\` (\`follower_id\`), UNIQUE INDEX \`UQ_user_follows_follower_followee\` (\`follower_id\`, \`followee_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`dev_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`devtype\` varchar(10) NOT NULL, \`devtoken\` varchar(512) NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_115a64b0db661b17e4625640a9\` (\`user_id\`), UNIQUE INDEX \`IDX_88b54cb5233e3bb8cf83827df1\` (\`devtoken\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_blocks\` (\`id\` int NOT NULL AUTO_INCREMENT, \`blocker_id\` int NOT NULL, \`blocked_id\` int NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_user_blocks_blocked_id\` (\`blocked_id\`), INDEX \`IDX_user_blocks_blocker_id\` (\`blocker_id\`), UNIQUE INDEX \`UQ_user_blocks_blocker_blocked\` (\`blocker_id\`, \`blocked_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`push_settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`like\` tinyint NOT NULL DEFAULT '1', \`comment\` tinyint NOT NULL DEFAULT '1', \`transaction\` tinyint NOT NULL DEFAULT '1', \`announcement\` tinyint NOT NULL DEFAULT '1', \`sound_on\` tinyint NOT NULL DEFAULT '1', \`sound_default\` varchar(50) NOT NULL DEFAULT 'default', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_00b9281ead6050207252a2e0f9\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`email\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phonenumber\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phone_number\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`uuid\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`password\` \`password\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`Warehouses\` ADD CONSTRAINT \`FK_05479f6fa62443bfd5b67c26c4e\` FOREIGN KEY (\`ward_id\`) REFERENCES \`Wards\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Wards\` ADD CONSTRAINT \`FK_47267a6978e1d13f2e9375df8e4\` FOREIGN KEY (\`provinces_id\`) REFERENCES \`Provinces\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD CONSTRAINT \`FK_e3357fb2a564d718901b950ed41\` FOREIGN KEY (\`ward_id\`) REFERENCES \`Wards\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Status\` ADD CONSTRAINT \`FK_c1b19eacf6435ffbbacb5b3724b\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_db2d0ea722e16e0fe8ab3bce111\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_9a5f6868c96e0069e699f33e124\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_1530a6f15d3c79d1b70be98f2be\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_f7af3bf8f2dcba61b4adc108239\` FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_follows\` ADD CONSTRAINT \`FK_ad9563c49281be94000f50a4308\` FOREIGN KEY (\`followee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`dev_tokens\` ADD CONSTRAINT \`FK_115a64b0db661b17e4625640a96\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_dfcd8a81016d1de587fbd2d70bf\` FOREIGN KEY (\`blocker_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_7a0806a54f0ad9ced3e247cacd1\` FOREIGN KEY (\`blocked_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`push_settings\` ADD CONSTRAINT \`FK_00b9281ead6050207252a2e0f92\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`push_settings\` DROP FOREIGN KEY \`FK_00b9281ead6050207252a2e0f92\``);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_7a0806a54f0ad9ced3e247cacd1\``);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_dfcd8a81016d1de587fbd2d70bf\``);
        await queryRunner.query(`ALTER TABLE \`dev_tokens\` DROP FOREIGN KEY \`FK_115a64b0db661b17e4625640a96\``);
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_ad9563c49281be94000f50a4308\``);
        await queryRunner.query(`ALTER TABLE \`user_follows\` DROP FOREIGN KEY \`FK_f7af3bf8f2dcba61b4adc108239\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_1530a6f15d3c79d1b70be98f2be\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_9a5f6868c96e0069e699f33e124\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_db2d0ea722e16e0fe8ab3bce111\``);
        await queryRunner.query(`ALTER TABLE \`Status\` DROP FOREIGN KEY \`FK_c1b19eacf6435ffbbacb5b3724b\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP FOREIGN KEY \`FK_e3357fb2a564d718901b950ed41\``);
        await queryRunner.query(`ALTER TABLE \`Wards\` DROP FOREIGN KEY \`FK_47267a6978e1d13f2e9375df8e4\``);
        await queryRunner.query(`ALTER TABLE \`Warehouses\` DROP FOREIGN KEY \`FK_05479f6fa62443bfd5b67c26c4e\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`password\` \`password\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`uuid\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`phone_number\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`phonenumber\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`email\` varchar(255) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_00b9281ead6050207252a2e0f9\` ON \`push_settings\``);
        await queryRunner.query(`DROP TABLE \`push_settings\``);
        await queryRunner.query(`DROP INDEX \`UQ_user_blocks_blocker_blocked\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_blocks_blocker_id\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_blocks_blocked_id\` ON \`user_blocks\``);
        await queryRunner.query(`DROP TABLE \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_88b54cb5233e3bb8cf83827df1\` ON \`dev_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_115a64b0db661b17e4625640a9\` ON \`dev_tokens\``);
        await queryRunner.query(`DROP TABLE \`dev_tokens\``);
        await queryRunner.query(`DROP INDEX \`UQ_user_follows_follower_followee\` ON \`user_follows\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_follows_follower_id\` ON \`user_follows\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_follows_followee_id\` ON \`user_follows\``);
        await queryRunner.query(`DROP TABLE \`user_follows\``);
        await queryRunner.query(`DROP TABLE \`brands\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
        await queryRunner.query(`DROP TABLE \`Wards\``);
        await queryRunner.query(`DROP TABLE \`Warehouses\``);
        await queryRunner.query(`DROP TABLE \`Provinces\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\` (\`email\`)`);
    }

}
