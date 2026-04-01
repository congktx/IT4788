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
