import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './common/logger.middleware';
import { UsersModule } from './modules/users/users.module';
import { dataSourceOptions } from '../data-source';
import { ProductsModule } from './modules/products/products.module';
import { newsModule } from './modules/news/news.module';
import { AuthModule } from './common/auth/auth.module';
import { RedisModule } from './common/redis/redis.module';
import { FollowModule } from './modules/follow/follow.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { DevTokensModule } from './modules/dev_tokens/dev-tokens.module';
import { PushSettingsModule } from './modules/push_settings/push-settings.module';
import { RatesModule } from './modules/rates/rates.module';
import { SearchesModule } from './modules/searches/searches.module';
import { JwtModule } from '@nestjs/jwt';

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
    ProductsModule,
    OrdersModule,
    newsModule,
    AuthModule,
    RedisModule,
    DevTokensModule,
    FollowModule,
    BlocksModule,
    OrdersModule,
    AddressesModule,
    WalletsModule,
    PushSettingsModule,
    RatesModule,
    SearchesModule,
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
