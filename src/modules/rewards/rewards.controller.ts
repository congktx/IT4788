import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { RewardsService } from "./rewards.service";
import { AuthGuard } from "../../common/auth/guards/auth.guard";
import { AuthenticatedRequest } from "../../types/auth.type";
import { GetRewardHistoryDto } from "./dto/get-reward-history.dto";
import { APP_RESPONSE } from "../constants/response.constants";
import { CreateRewardAppealDto } from "./dto/create-reward-appeal.dto";
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth("JWT-auth")
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
  ) { }

  @Post('get_reward_history')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_reward_history(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetRewardHistoryDto,
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.rewardsService.getRewardHistory(currentUserId, body);
    } catch (err: any) {
      return {
        ...APP_RESPONSE.UNKNOWN_ERROR,
        data: []
      }
    }
  }

  @Post("create_reward_appeal")
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async create_reward_appeal(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateRewardAppealDto
  ) {
    try {
      const currentUserId = Number(
        req.user?.id ?? req.user?.userId ?? req.user?.sub,
      );

      return await this.rewardsService.createRewardAppeal(currentUserId, body);
    } catch (err: any) {
      return {
        ...APP_RESPONSE.UNKNOWN_ERROR,
        data: []
      }
    }
  }
}