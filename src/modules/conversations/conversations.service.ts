import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiResponse } from "src/common/interfaces/api-response.interface";
import { APP_RESPONSE } from "src/common/constants/response.constants";
import { SendMessageDto } from "./dto/send-message.dto";
import { Conversation } from "./entities/conversation.entity";
import { Message } from "./entities/message.entity";
import { User } from "../users/entities/user.entity";
import { Product } from "../products/entities/product.entity";
import { UserBlock } from "../blocks/entities/user-block.entity";
import { GetListConvDto } from "./dto/get-list-conversation.dto";
import { GetConvDto } from "./dto/get-conversation.dto";
import { SetReadMessageDto } from "./dto/set-read-message.dto";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,

    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,
  ) { }

  private fail(code: string, message: string): ApiResponse<any> {
    return {
      code,
      message,
      data: "ERROR",
    };
  }

  async createConversation(userIds: number[]) {
    let users: Object[] = [];
    for (let i = 0; i < userIds.length; i++)
      users.push({ id: userIds[i] });

    const conversation = this.conversationRepo.create({
      users: users,
      time_last_update: Math.floor(Date.now() / 1000),
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

    return await this.conversationRepo
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

    return await this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoin('conversation.users', 'user')
      .where('user.id IN (:...userIds)', { userIds })
      .groupBy('conversation.id')
      .having('COUNT(user.id) = :count', { count: userIds.length })
      .getOne();
  }

  async findConversationById(id: number) {
    return await this.conversationRepo.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async createMessage(sendMessageDto: SendMessageDto, conversationId: number, senderId: number) {
    let now = Math.floor(Date.now() / 1000);

    let content = sendMessageDto.message;
    let type = sendMessageDto.type_message;

    if (sendMessageDto.product_id) {
      content = String(sendMessageDto.product_id);
      type = "product_id";
    }

    const message = this.messageRepo.create({
      content: content,
      type: type,
      created_at: now,
      sender: { id: senderId },
      conversation: { id: conversationId }
    });
    await this.conversationRepo.update(conversationId, {
      time_last_update: now,
      last_messasge_id: message.id
    });
    return await this.messageRepo.save(message);
  }

  async sendMessage(currentUserId: number, sendMessageDto: SendMessageDto) {
    if (currentUserId === sendMessageDto["to_id"])
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message
      )

    if (sendMessageDto["product_id"] && !await this.productRepo.findOne({ where: { id: sendMessageDto["product_id"] } }))
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message
      )

    if (await this.userBlockRepo.findOne({ where: { blocker_id: currentUserId, blocked_id: sendMessageDto["to_id"] } }))
      return this.fail(
        APP_RESPONSE.NOT_ACCESS.code,
        APP_RESPONSE.NOT_ACCESS.message
      )

    const userIds = [currentUserId, sendMessageDto.to_id];
    userIds.sort((a, b) => a - b);

    let conversation = await this.findConversationBetweenUsers(userIds);
    if (conversation && conversation["data"] === "ERROR")
      return conversation;
    if (!conversation || conversation == null) {
      conversation = await this.createConversation(userIds);
    }

    const message = await this.createMessage(sendMessageDto, conversation["id"], currentUserId);
    const data_res = {
      conversation_id: message["conversation"]["id"] || "",
      message_id: message["id"],
      created_at: message["created_at"] || 0
    };

    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: data_res
    }
  }

  async getListConversation(currentUserId: number, getListConvDto: GetListConvDto) {
    const { index, count } = getListConvDto;
    const skip = (index - 1) * count;
    let qb = this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoin('conversation.users', 'user', 'user.id = :userId', { currentUserId })
      .leftJoinAndSelect('conversation.users', 'users')
      .orderBy('conversation.time_last_update', 'DESC')
      .skip(skip)
      .take(count);
    const [conversations, _] = await qb.getManyAndCount();

    if (!Array.isArray(conversations))
      return this.fail(
        APP_RESPONSE.UNKNOWN_ERROR.code,
        APP_RESPONSE.UNKNOWN_ERROR.message
      );

    let listLastMessageId: number[] = [];
    for (let i = 0; i < conversations.length; i++)
      listLastMessageId.push(conversations[i]['last_messasge_id']);
    const listLastMessage = await this.messageRepo.findByIds(listLastMessageId);

    let listConv: any[] = [];
    let numNewMessage = 0;
    for (let i = 0; i < conversations.length; i++) {
      let idPartner = 0;
      if (conversations[i]['users'][0]['id'] === currentUserId) idPartner = 1;
      listConv.push({
        id: conversations[i]["id"],
        Partner: {
          id: conversations[i]['users'][idPartner]['id'],
          username: conversations[i]['users'][idPartner]['username'],
          avatar: conversations[i]['users'][idPartner]['avatar']
        },
        LastMessage: {
          message: listLastMessage[i].content,
          type: listLastMessage[i].type,
          created: listLastMessage[i].created_at,
          unread: listLastMessage[i].sender.id != currentUserId && listLastMessage[i].created_at > conversations[i].time_last_seen
        }
      });
      if (listLastMessage[i].created_at !== conversations[i].time_last_seen)
        numNewMessage++;
    }

    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: listConv,
      numNewMessage: numNewMessage
    }
  }

  async getConversation(currentUserId: number, getConvDto: GetConvDto) {
    let conversation: any = null;

    if (getConvDto.partner_id) {
      if (currentUserId === getConvDto.partner_id)
        return this.fail(
          APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
          APP_RESPONSE.PARAMETER_VALUE_INVALID.message
        )
      conversation = await this.findConversationBetweenUsers([currentUserId, getConvDto.partner_id]);
      if (conversation && conversation['data'] === "ERROR")
        return conversation;
      if (!conversation)
        return {
          code: APP_RESPONSE.OK.code,
          message: APP_RESPONSE.OK.message,
          data: {
            messages: [],
            can_send_message: true
          }
        }
    }

    if (getConvDto.conversation_id) {
      conversation = await this.findConversationById(getConvDto.conversation_id);
      if (!conversation)
        return this.fail(
          APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
          APP_RESPONSE.PARAMETER_VALUE_INVALID.message
        )
    }

    if (conversation == null)
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message
      )

    let conversationId = conversation.id;
    let skip = (getConvDto.index - 1) * getConvDto.count;
    let qb = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation_id', 'conversation', 'conversation.id = :conversationId', { conversationId })
      .orderBy('message.created_at', 'DESC')
      .skip(skip)
      .take(getConvDto.count);
    let [messages, _] = await qb.getManyAndCount();

    if (!Array.isArray(messages))
      return this.fail(
        APP_RESPONSE.UNKNOWN_ERROR.code,
        APP_RESPONSE.UNKNOWN_ERROR.message
      );

    let formatedMessages: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      formatedMessages.push({
        message: messages[i].content,
        unread: currentUserId != messages[i].sender.id && messages[i].sender.created_at > conversation.time_last_seen,
        type: messages[i].type,
        created: messages[i].content,
        sender: {
          id: messages[i].sender.id,
          username: messages[i].sender.username
        }
      })
    }

    let block = await this.userBlockRepo.findOne({
      where: [
        { blocker_id: conversation.users[0].id, blocked_id: conversation.users[1].id },
        { blocker_id: conversation.users[1].id, blocked_id: conversation.users[0].id },
      ]
    })

    let can_send_message = (block) ? false : true;

    return {
      ...APP_RESPONSE.OK,
      data: {
        messages: formatedMessages,
        can_send_message: can_send_message
      }
    }
  }

  async setReadMessage(currentUserId: number, getConvDto: SetReadMessageDto) {
    let partner = await this.userRepo.findOneById(getConvDto.partner_id);
    if (!partner)
      return this.fail(
        APP_RESPONSE.USER_NOT_EXIST.code,
        APP_RESPONSE.USER_NOT_EXIST.message
      )
    if (partner.id == currentUserId)
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message
      )
    let conversation: any = await this.findConversationBetweenUsers([partner.id, currentUserId]);
    if (conversation && !conversation['data']) {
      await this.conversationRepo.update(conversation.id, {
        time_last_seen: Math.floor(Date.now() / 1000)
      });
    }

    return {
      ...APP_RESPONSE.OK,
      data: []
    }
  }
}