import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1774359947531 implements MigrationInterface {
    name = 'Mysql1774359947531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`Status\` (\`id\` int NOT NULL AUTO_INCREMENT, \`status_name\` varchar(255) NULL, \`status_detail\` varchar(255) NULL, \`create_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`order_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`coordinates_x\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`coordinates_y\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`coordinates_description\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`product_variants\` ADD \`weight\` float NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`ward_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`lat\` decimal(10,8) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`lng\` decimal(11,8) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`status_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`leatime\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD \`variant_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`videos\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`Warehouses\` ADD CONSTRAINT \`FK_05479f6fa62443bfd5b67c26c4e\` FOREIGN KEY (\`ward_id\`) REFERENCES \`Wards\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Wards\` ADD CONSTRAINT \`FK_47267a6978e1d13f2e9375df8e4\` FOREIGN KEY (\`provinces_id\`) REFERENCES \`Provinces\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD CONSTRAINT \`FK_e3357fb2a564d718901b950ed41\` FOREIGN KEY (\`ward_id\`) REFERENCES \`Wards\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Status\` ADD CONSTRAINT \`FK_c1b19eacf6435ffbbacb5b3724b\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_db2d0ea722e16e0fe8ab3bce111\` FOREIGN KEY (\`variant_id\`) REFERENCES \`product_variants\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_db2d0ea722e16e0fe8ab3bce111\``);
        await queryRunner.query(`ALTER TABLE \`Status\` DROP FOREIGN KEY \`FK_c1b19eacf6435ffbbacb5b3724b\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP FOREIGN KEY \`FK_e3357fb2a564d718901b950ed41\``);
        await queryRunner.query(`ALTER TABLE \`Wards\` DROP FOREIGN KEY \`FK_47267a6978e1d13f2e9375df8e4\``);
        await queryRunner.query(`ALTER TABLE \`Warehouses\` DROP FOREIGN KEY \`FK_05479f6fa62443bfd5b67c26c4e\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`videos\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP COLUMN \`variant_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`leatime\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`status_id\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`lng\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`lat\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`ward_id\``);
        await queryRunner.query(`ALTER TABLE \`product_variants\` DROP COLUMN \`weight\``);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`status\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`coordinates_description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`coordinates_y\` float NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`coordinates_x\` float NOT NULL`);
        await queryRunner.query(`DROP TABLE \`Status\``);
    }

}
