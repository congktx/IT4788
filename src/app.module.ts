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
import { OrdersModule } from './modules/orders/orders.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { WalletsModule } from './modules/wallets/wallets.module';
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
    OrdersModule,
    AddressesModule,
    WalletsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}