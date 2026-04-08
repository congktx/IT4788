import { Body, Controller, HttpCode, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "src/common/auth/guards/auth.guard";
import type { AuthenticatedRequest } from "src/types/auth.type";
import { SendMessageDto } from "./dto/send-message.dto";
import { ConversationsService } from "./conversations.service";
import { FileInterceptor } from "@nestjs/platform-express";
import 'multer';
import { APP_RESPONSE } from "src/common/constants/response.constants";
import { GetListConvDto } from "./dto/get-list-conversation.dto";
import { GetConvDto } from "./dto/get-conversation.dto";
import { SetReadMessageDto } from "./dto/set-read-message.dto";

@Controller("conversation")
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) { }

  @Post("send_message")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async send_message(
    @Req() req: AuthenticatedRequest,
    @Body() body: SendMessageDto,
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.conversationsService.sendMessage(currentUserId, body);
    } catch (err: any) {
      console.log(err);
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }

  @Post('get_list_conversation')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_list_conversation(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetListConvDto
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );
      return await this.conversationsService.getListConversation(currentUserId, body);
    } catch (err: any) {
      console.log(err);
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }

  @Post('get_conversation')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_conversation(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetConvDto
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.conversationsService.getConversation(currentUserId, body);
    } catch (err: any) {
      console.log(err);
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }

  @Post('set_read_message')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async set_read_message(
    @Req() req: AuthenticatedRequest,
    @Body() body: SetReadMessageDto
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.conversationsService.setReadMessage(currentUserId, body);
    } catch (err: any) {
      console.log(err);
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }
}