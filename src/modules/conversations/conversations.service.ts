import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiResponse } from "src/common/interfaces/api-response.interface";
import { APP_RESPONSE } from "src/common/constants/response.constants";
import { SendMessageDto } from "./dto/send-message.dto";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { User } from "../users/entities/user.entity";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,

    @InjectRepository(Conversation)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  private fail(code: string, message: string): ApiResponse<null> {
    return {
      code,
      message,
      data: null,
    };
  }

  async createConversation(userIds: number[]) {
    let users: Object[] = [];
    for (let i = 0; i < userIds.length; i++)
      users.push({ id: userIds[i] });

    const conversation = this.conversationRepo.create({
      users: users,
      time_last_update: Number(Date.now()),
    });

    return await this.conversationRepo.save(conversation);
  }

  async findConversationByUser(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId }
    });

    if (!user) {
      return this.fail(
        APP_RESPONSE.USER_NOT_EXIST.code,
        APP_RESPONSE.USER_NOT_EXIST.message
      );
    }

    return this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  async findConversationBetweenUsers(userIds: number[]) {
    const users = await this.userRepo.findByIds(userIds);

    if (users.length != userIds.length) {
      return this.fail(
        APP_RESPONSE.USER_NOT_EXIST.code,
        APP_RESPONSE.USER_NOT_EXIST.message
      );
    }

    return this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoin('conversation.users', 'user')
      .where('user.id IN (:...userIds)', { userIds })
      .groupBy('conversation.id')
      .having('COUNT(user.id) = :count', { count: userIds.length })
      .getOne();
  }

  async findConversationById(id: number) {
    return this.conversationRepo.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async createMessage(sendMessageDto: SendMessageDto, sender_id: number, conversation_id: number) {
    let now = Number(Date.now());
    const message = this.messageRepo.create({
      content: sendMessageDto.message,
      type: sendMessageDto.type_message,
      created_at: now,
      sender: { id: sender_id },
      conversation: { id: conversation_id }
    });
    return await this.messageRepo.save(message);
  }
}