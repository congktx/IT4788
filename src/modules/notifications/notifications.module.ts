import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from '../users/entities/user.entity';
import { Notification } from "./entities/notification.entity";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { ConversationsGateway } from "../conversations/conversations.gateway";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { Order } from "../orders/entities/order.entity";
import { UserFollow } from "../follow/entities/user-follow.entity";
import { UserBlock } from "../blocks/entities/user-block.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserBlock, Order, UserFollow, Notification]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') as any,
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, UsersService, ConversationsGateway],
  exports: [NotificationsService, TypeOrmModule]
})
export class NotificationsModule { }