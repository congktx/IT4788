// import { config } from 'dotenv';
// config({ path: '.env.test' });

import { SecretTestConfig } from './src/config/secretTest';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const testDataSourceOptions: TypeOrmModuleOptions = {
  type: 'mysql',
  host: SecretTestConfig.database.host,
  port: SecretTestConfig.database.port,
  username: SecretTestConfig.database.username,
  password: SecretTestConfig.database.password,
  database: SecretTestConfig.database.name,

  autoLoadEntities: true,

  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],

  synchronize: true,
  dropSchema: true,
};
