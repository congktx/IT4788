import { DataSource } from 'typeorm';

export const clearDatabase = async (dataSource: DataSource) => {
  const entities = dataSource.entityMetadatas;

  // Lặp qua từng table để quét sạch dữ liệu. Dùng thao tác DELETE vì một số RDBMS chặn TRUNCATE do foreign key.
  // Nếu có Foreign Keys, nhớ tắt cờ khóa ngoại
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');

  for (const entity of entities) {
    const tableName = entity.tableName;
    await dataSource.query(`TRUNCATE TABLE \`${tableName}\`;`);
  }

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
};
