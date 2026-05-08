// create-test-app.ts
// FIle này dùng để tạo một AppModule mỗi khi chạy Jest
// test/helpers/create-test-app.ts
// File này dùng để tạo một AppModule mỗi khi chạy Jest
import request from 'supertest';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { testDataSourceOptions } from '../../data-source.test';

// Import tất cả module của app
import { UsersModule } from '../../src/modules/users/users.module';
import { AuthModule } from '../../src/common/auth/auth.module';
import { FollowModule } from '../../src/modules/follow/follow.module';
import { BlocksModule } from '../../src/modules/blocks/blocks.module';
import { ConversationsModule } from '../../src/modules/conversations/conversations.module';
import { AddressesModule } from '../../src/modules/addresses/addresses.module';
import { OrdersModule } from '../../src/modules/orders/orders.module';
import { ProductsModule } from '../../src/modules/products/products.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { ValidationPipe } from '../../src/common/validation.pipe';
import { LoggingInterceptor } from '../../src/common/logging.interceptor';
import { AllExceptionsFilter } from '../../src/all-exceptions.filter';

export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      // Load .env.test thay vì .env
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),

      // Dùng DB test
      TypeOrmModule.forRoot(testDataSourceOptions),

      // Các module nghiệp vụ — giống hệt AppModule
      UsersModule,
      AuthModule,
      FollowModule,
      BlocksModule,
      ConversationsModule,
      AddressesModule,
      OrdersModule,
      ProductsModule,
      NotificationsModule,
    ],
  }).compile();

  const app = module.createNestApplication();

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Bắt signal shutdown để đóng DB connection đúng cách
  app.enableShutdownHooks();
  await app.init();

  return { app, module };
}
