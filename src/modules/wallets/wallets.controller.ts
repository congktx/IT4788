import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { GetCurrentBalanceDto } from './dto/get-current-balance.dto';
import { GetBalanceHistoryDto } from './dto/get-balance-history.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(AuthGuard)
  @Post('get_current_balance')
  getCurrentBalance(
    @Body() _body: GetCurrentBalanceDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.walletsService.getCurrentBalance(userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_balance_history')
  getBalanceHistory(
    @Body() body: GetBalanceHistoryDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.walletsService.getBalanceHistory(body, userId);
  }
}