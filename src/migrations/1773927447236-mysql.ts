import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1773927447236 implements MigrationInterface {
    name = 'Mysql1773927447236'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`addresses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`address_name\` varchar(255) NULL, \`address_detail\` text NULL, \`coordinates_x\` float NOT NULL, \`coordinates_y\` float NOT NULL, \`coordinates_description\` text NULL, \`is_default\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`news\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` text NULL, \`created_at\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`buyer_address_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD \`seller_address_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`ship_from_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD CONSTRAINT \`FK_16aac8a9f6f9c1dd6bcb75ec023\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipping\` ADD CONSTRAINT \`FK_facb0fff23b713c9e09b2da88f6\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_fd91a8eb24848c6e3af43f2f734\` FOREIGN KEY (\`buyer_address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_459f1e0cca2c4234340a7d57ce4\` FOREIGN KEY (\`seller_address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_4918144a05b35d8d6c4f92c293e\` FOREIGN KEY (\`ship_from_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_4918144a05b35d8d6c4f92c293e\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_459f1e0cca2c4234340a7d57ce4\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_fd91a8eb24848c6e3af43f2f734\``);
        await queryRunner.query(`ALTER TABLE \`shipping\` DROP FOREIGN KEY \`FK_facb0fff23b713c9e09b2da88f6\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP FOREIGN KEY \`FK_16aac8a9f6f9c1dd6bcb75ec023\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`ship_from_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`seller_address_id\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP COLUMN \`buyer_address_id\``);
        await queryRunner.query(`DROP TABLE \`news\``);
        await queryRunner.query(`DROP TABLE \`addresses\``);
    }

}
