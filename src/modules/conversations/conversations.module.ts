import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { UserBlock } from '../blocks/entities/user-block.entity';
import { ConversationsGateway } from './conversations.gateway';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Order } from '../orders/entities/order.entity';
import { UserFollow } from '../follow/entities/user-follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Conversation, Message, Product, UserBlock, Order, UserFollow])],
  controllers: [ConversationsController],
  providers: [ConversationsService, JwtService, UsersService, ConversationsGateway],
  exports: [ConversationsService, TypeOrmModule],
})
export class ConversationsModule { }