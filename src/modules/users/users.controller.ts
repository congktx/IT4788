import { Body, Controller, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../../common/auth/guards/auth.guard";
import type { AuthenticatedRequest } from "../../types/auth.type";
import { GetUserInfoDto } from "./dto/get-user-info.dto";
import { APP_RESPONSE } from "../../common/constants/response.constants";
import { SetUserInfoDto } from "./dto/set-user-info.dto";
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth("JWT-auth")
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @Post('get_user_info')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_user_info(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetUserInfoDto,
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.usersService.getUserInfo(currentUserId, body);
    } catch (err: any) {
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }

  @Post('set_user_info')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async set_user_info(
    @Req() req: AuthenticatedRequest,
    @Body() body: SetUserInfoDto,
  ) {
    try {
      console.log(body)
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.usersService.setUserInfo(currentUserId, body);
    } catch (err: any) {
      console.log(err)
      return {
        code: APP_RESPONSE.UNKNOWN_ERROR.code,
        message: APP_RESPONSE.UNKNOWN_ERROR.message,
        data: err.toString()
      }
    }
  }
}