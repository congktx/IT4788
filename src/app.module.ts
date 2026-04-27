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
import { ConversationsModule } from './modules/conversations/conversations.module';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

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
    ConversationsModule,
    UploadModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}