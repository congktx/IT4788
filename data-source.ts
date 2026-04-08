import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SecretConfig } from './src/config/secret';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: SecretConfig.database.host,
  port: SecretConfig.database.port,
  username: SecretConfig.database.username,
  password: SecretConfig.database.password,
  database: SecretConfig.database.name,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
};


const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

