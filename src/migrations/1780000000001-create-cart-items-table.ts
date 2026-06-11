import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateCartItemsTable1780000000001 implements MigrationInterface {
  name = 'CreateCartItemsTable1780000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasCartItemsTable = await queryRunner.hasTable('cart_items');

    if (hasCartItemsTable) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'cart_items',
      new TableUnique({
        name: 'UQ_cart_items_user_product',
        columnNames: ['user_id', 'product_id'],
      }),
    );

    await queryRunner.createForeignKeys('cart_items', [
      new TableForeignKey({
        name: 'FK_cart_items_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_cart_items_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const hasCartItemsTable = await queryRunner.hasTable('cart_items');

    if (hasCartItemsTable) {
      await queryRunner.dropTable('cart_items', true);
    }
  }
}
