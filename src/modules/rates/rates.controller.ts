import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';

@Controller('api')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post('get_rates')
  @UseGuards(AuthGuard)
  async getRates(@Body() body: any, @Req() req: any) {
    try {
      if (
        body.index === undefined ||
        body.count === undefined
      ) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const userId =
        body.user_id !== undefined
          ? Number(body.user_id)
          : (req.user.userId ?? req.user.id);

      const userExists = await this.ratesService.getUserExists(userId);
      if (!userExists) {
        return buildResponse(APP_RESPONSE.NO_DATA_OR_END_OF_LIST, null);
      }

      const data = await this.ratesService.getRates(
        userId,
        Number(body.index),
        Number(body.count),
        body.level !== undefined ? Number(body.level) : undefined,
      );

      if (!data || data.length === 0) {
        return buildResponse(APP_RESPONSE.NO_DATA_OR_END_OF_LIST, null);
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('get_rates error:', error);

      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  @Post('set_rates')
  @UseGuards(AuthGuard)
  async setRates(@Body() body: any, @Req() req: any) {
    try {
      if (
        body.user_id === undefined ||
        body.level === undefined ||
        body.content === undefined
      ) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const level = Number(body.level);

      if (![1, 2, 3, 4, 5].includes(level)) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
      }

      const userExists = await this.ratesService.getUserExists(
        Number(body.user_id),
      );

      if (!userExists) {
        return buildResponse(APP_RESPONSE.NO_DATA_OR_END_OF_LIST, null);
      }

      const data = await this.ratesService.setRate(
        Number(body.user_id),
        req.user.userId ?? req.user.id,
        level,
        body.content,
        body.product_id !== undefined ? Number(body.product_id) : undefined,
        body.purchase_id !== undefined ? Number(body.purchase_id) : undefined,
      );

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('set_rates error:', error);

      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }
}
