import { Body, Controller, HttpCode, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "src/common/auth/guards/auth.guard";
import type { AuthenticatedRequest } from "src/types/auth.type";
import { SendMessageDto } from "./dto/send-message.dto";
import { ConversationsService } from "./conversations.service";
import { FileInterceptor } from "@nestjs/platform-express";
import 'multer';
import { APP_RESPONSE } from "src/common/constants/response.constants";

@Controller("conversation")
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) { }

  @Post("send_message")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Body() body: SendMessageDto,
  ) {
    const currentUserId = Number(
      req.user?.id ?? req.user?.userId ?? req.user?.sub,
    );

    let userIds = [currentUserId, body.to_id];
    userIds.sort((a, b) => a - b);

    let conversation = await this.conversationsService.findConversationBetweenUsers(userIds);
    if (conversation && conversation["code"] && conversation["message"])
      return conversation;
    if (!conversation || conversation == null) {
      conversation = await this.conversationsService.createConversation(userIds);
    }

    let message = await this.conversationsService.createMessage(body, conversation["id"], currentUserId);
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: message
    }
  }
}