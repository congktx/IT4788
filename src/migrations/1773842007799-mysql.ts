import { MigrationInterface, QueryRunner } from "typeorm";

export class Mysql1773842007799 implements MigrationInterface {
    name = 'Mysql1773842007799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_codes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`code\` varchar(255) NULL, \`expired_at\` timestamp NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`transactions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`wallet_id\` int NOT NULL, \`type\` varchar(255) NULL, \`amount\` decimal NULL, \`status\` varchar(255) NULL, \`description\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`wallets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`balance\` decimal NULL, UNIQUE INDEX \`REL_92558c08091598f7a4439586cd\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`appeals\` (\`id\` int NOT NULL AUTO_INCREMENT, \`proof_id\` int NOT NULL, \`user_id\` int NOT NULL, \`reason\` text NULL, \`status\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`battle_proofs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`video_url\` varchar(255) NULL, \`image_url\` varchar(255) NULL, \`description\` text NULL, \`ai_score\` decimal NULL, \`reward_coin\` decimal NULL, \`status\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`product_variants\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`size\` varchar(255) NULL, \`color\` varchar(255) NULL, \`stock\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`comments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`user_id\` int NOT NULL, \`content\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`likes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`user_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`reports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`product_id\` int NOT NULL, \`user_id\` int NOT NULL, \`reason\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`shipping\` (\`id\` int NOT NULL AUTO_INCREMENT, \`order_id\` int NOT NULL, \`address_id\` int NULL, \`shipper_id\` int NULL, \`status\` varchar(255) NULL, \`tracking_code\` varchar(255) NULL, UNIQUE INDEX \`REL_a37456893780ce2dfe0a7484c2\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`orders\` (\`id\` int NOT NULL AUTO_INCREMENT, \`buyer_id\` int NOT NULL, \`seller_id\` int NOT NULL, \`status\` varchar(255) NULL, \`total_price\` decimal NULL, \`shipping_fee\` decimal NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order_items\` (\`id\` int NOT NULL AUTO_INCREMENT, \`order_id\` int NOT NULL, \`product_id\` int NOT NULL, \`total_price\` decimal NULL, \`quantity\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`products\` (\`id\` int NOT NULL AUTO_INCREMENT, \`seller_id\` int NOT NULL, \`category_id\` int NULL, \`brand_id\` int NULL, \`title\` varchar(255) NULL, \`description\` text NULL, \`price\` decimal NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`image_urls\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`conversation_id\` int NOT NULL, \`sender_id\` int NOT NULL, \`content\` text NULL, \`image_url\` varchar(255) NULL, \`video_url\` varchar(255) NULL, \`created_at\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`time_last_update\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_conversations\` (\`user_id\` int NOT NULL, \`conversation_id\` int NOT NULL, PRIMARY KEY (\`user_id\`, \`conversation_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`username\` varchar(255) NULL, \`phone_number\` varchar(255) NULL, \`password\` varchar(255) NOT NULL, \`uuid\` varchar(255) NULL, \`role\` varchar(255) NULL, \`fullname\` varchar(255) NULL, \`avatar\` varchar(255) NULL, \`bio\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`reward_rules\` (\`id\` int NOT NULL AUTO_INCREMENT, \`battle_type\` varchar(255) NULL, \`reward_coin\` decimal NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_codes\` ADD CONSTRAINT \`FK_b98f6d82aa9b218599917bf21b3\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_0b171330be0cb621f8d73b87a9e\` FOREIGN KEY (\`wallet_id\`) REFERENCES \`wallets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_92558c08091598f7a4439586cda\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`appeals\` ADD CONSTRAINT \`FK_40a6d697ed2bf44259cfa45b6bb\` FOREIGN KEY (\`proof_id\`) REFERENCES \`battle_proofs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`appeals\` ADD CONSTRAINT \`FK_dc35f7b9ece670abe7ff66932c4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`battle_proofs\` ADD CONSTRAINT \`FK_bac32522a3a2ed6c4a48272e3b9\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`product_variants\` ADD CONSTRAINT \`FK_6343513e20e2deab45edfce1316\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_8f405e50bbc3adb9a80fac0f928\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_4c675567d2a58f0b07cef09c13d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`likes\` ADD CONSTRAINT \`FK_35eb9e9cc6f706f1a9af2f9d158\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`likes\` ADD CONSTRAINT \`FK_3f519ed95f775c781a254089171\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reports\` ADD CONSTRAINT \`FK_0ba6a2ea28e6e64af44e4e1cc6d\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reports\` ADD CONSTRAINT \`FK_ca7a21eb95ca4625bd5eaef7e0c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`shipping\` ADD CONSTRAINT \`FK_a37456893780ce2dfe0a7484c22\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_5e90e93d0e036c3fadbaefa4d0a\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_ef6710c78c6fbc26d1ba58268ab\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_145532db85752b29c57d2b7b1f1\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_9263386c35b6b242540f9493b00\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_425ee27c69d6b8adc5d6475dcfe\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_3bc55a7c3f9ed54b520bb5cfe23\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_22133395bd13b970ccd0c34ab22\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_conversations\` ADD CONSTRAINT \`FK_3759a1fec14f04db85d11861999\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_conversations\` ADD CONSTRAINT \`FK_a67b2a480404e95e1b09b05a8b0\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_conversations\` DROP FOREIGN KEY \`FK_a67b2a480404e95e1b09b05a8b0\``);
        await queryRunner.query(`ALTER TABLE \`user_conversations\` DROP FOREIGN KEY \`FK_3759a1fec14f04db85d11861999\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_22133395bd13b970ccd0c34ab22\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_3bc55a7c3f9ed54b520bb5cfe23\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_425ee27c69d6b8adc5d6475dcfe\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_9263386c35b6b242540f9493b00\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_145532db85752b29c57d2b7b1f1\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_ef6710c78c6fbc26d1ba58268ab\``);
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_5e90e93d0e036c3fadbaefa4d0a\``);
        await queryRunner.query(`ALTER TABLE \`shipping\` DROP FOREIGN KEY \`FK_a37456893780ce2dfe0a7484c22\``);
        await queryRunner.query(`ALTER TABLE \`reports\` DROP FOREIGN KEY \`FK_ca7a21eb95ca4625bd5eaef7e0c\``);
        await queryRunner.query(`ALTER TABLE \`reports\` DROP FOREIGN KEY \`FK_0ba6a2ea28e6e64af44e4e1cc6d\``);
        await queryRunner.query(`ALTER TABLE \`likes\` DROP FOREIGN KEY \`FK_3f519ed95f775c781a254089171\``);
        await queryRunner.query(`ALTER TABLE \`likes\` DROP FOREIGN KEY \`FK_35eb9e9cc6f706f1a9af2f9d158\``);
        await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_4c675567d2a58f0b07cef09c13d\``);
        await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_8f405e50bbc3adb9a80fac0f928\``);
        await queryRunner.query(`ALTER TABLE \`product_variants\` DROP FOREIGN KEY \`FK_6343513e20e2deab45edfce1316\``);
        await queryRunner.query(`ALTER TABLE \`battle_proofs\` DROP FOREIGN KEY \`FK_bac32522a3a2ed6c4a48272e3b9\``);
        await queryRunner.query(`ALTER TABLE \`appeals\` DROP FOREIGN KEY \`FK_dc35f7b9ece670abe7ff66932c4\``);
        await queryRunner.query(`ALTER TABLE \`appeals\` DROP FOREIGN KEY \`FK_40a6d697ed2bf44259cfa45b6bb\``);
        await queryRunner.query(`ALTER TABLE \`wallets\` DROP FOREIGN KEY \`FK_92558c08091598f7a4439586cda\``);
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_0b171330be0cb621f8d73b87a9e\``);
        await queryRunner.query(`ALTER TABLE \`user_codes\` DROP FOREIGN KEY \`FK_b98f6d82aa9b218599917bf21b3\``);
        await queryRunner.query(`DROP TABLE \`reward_rules\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`user_conversations\``);
        await queryRunner.query(`DROP TABLE \`conversations\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
        await queryRunner.query(`DROP TABLE \`products\``);
        await queryRunner.query(`DROP TABLE \`order_items\``);
        await queryRunner.query(`DROP TABLE \`orders\``);
        await queryRunner.query(`DROP INDEX \`REL_a37456893780ce2dfe0a7484c2\` ON \`shipping\``);
        await queryRunner.query(`DROP TABLE \`shipping\``);
        await queryRunner.query(`DROP TABLE \`reports\``);
        await queryRunner.query(`DROP TABLE \`likes\``);
        await queryRunner.query(`DROP TABLE \`comments\``);
        await queryRunner.query(`DROP TABLE \`product_variants\``);
        await queryRunner.query(`DROP TABLE \`battle_proofs\``);
        await queryRunner.query(`DROP TABLE \`appeals\``);
        await queryRunner.query(`DROP INDEX \`REL_92558c08091598f7a4439586cd\` ON \`wallets\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
        await queryRunner.query(`DROP TABLE \`transactions\``);
        await queryRunner.query(`DROP TABLE \`user_codes\``);
    }

}
