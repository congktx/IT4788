import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { UserBlock } from '../blocks/entities/user-block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Conversation, Message, Product, UserBlock])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService, TypeOrmModule],
})
export class ConversationsModule { }