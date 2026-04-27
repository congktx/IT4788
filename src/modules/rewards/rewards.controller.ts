import { Body, Controller, Get, HttpCode, Req, UseGuards } from "@nestjs/common";
import { RewardsService } from "./rewards.service";
import { AuthGuard } from "../../common/auth/guards/auth.guard";
import { AuthenticatedRequest } from "../../types/auth.type";
import { GetRewardHistoryDto } from "./dto/get-reward-history.dto";

@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
  ) { }

  @Get('get_reward_history')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async get_reward_history(
    @Req() req: AuthenticatedRequest,
    @Body() body: GetRewardHistoryDto,
  ) {
    const currentUserId = Number(
      req.user?.id ?? req.user?.userId ?? req.user?.sub,
    );

    return await this.rewardsService.getRewardHistory(currentUserId, body);
  }
}