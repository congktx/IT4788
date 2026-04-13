import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { dataSourceOptions } from '../data-source';
import { AuthModule } from './common/auth/auth.module';
import { FollowModule } from './modules/follow/follow.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { RedisModule } from './common/redis/redis.module';
import { DevTokensModule } from './modules/dev_tokens/dev-tokens.module';
import { PushSettingsModule } from './modules/push_settings/push-settings.module';
import { ProductModule } from './modules/products/product.module';
import { RatesModule } from './modules/rates/rates.module';
import { SearchesModule } from './modules/searches/searches.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      migrations: [],
    }),
    UsersModule,
    AuthModule,
    FollowModule,
    BlocksModule,
    RedisModule,
    DevTokensModule,
    PushSettingsModule,
    ProductModule,
    RatesModule,
    SearchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}