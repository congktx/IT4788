import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { dataSourceOptions } from '../data-source';
import { productModule } from './modules/products/product.module';
import { OrderModule } from './modules/orders/orders.module';
import { newsModule } from './modules/news/news.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './common/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { FollowModule } from './modules/follow/follow.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { DevTokensModule } from './modules/dev_tokens/dev-tokens.module';
import { PushSettingsModule } from './modules/push_settings/push-settings.module';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      migrations: [], // Ngăn NestJS nạp các file .ts lúc runtime (chỉ dùng cho CLI)
    }),
    UsersModule,
    productModule,
    OrderModule,
    newsModule,
    AuthModule,
    RedisModule,
    DevTokensModule,
    FollowModule,
    BlocksModule,
    PushSettingsModule,
    JwtModule.register({
      secret: 'SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
    ConfigModule.forRoot({
      isGlobal: true, // Để các module khác (như AuthModule) không cần import lại
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
