import { Body, Controller, Post } from '@nestjs/common';
import { RatesService } from './rates.service';

@Controller('api')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post('get_rates')
  async getRates(@Body() body: any) {
    try {
      if (
        body.token === undefined ||
        body.index === undefined ||
        body.count === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      if (!body.token || body.token === 'invalid') {
        return {
          code: 9998,
          message: 'Token is invalid.',
        };
      }

      const userId =
        body.user_id !== undefined ? Number(body.user_id) : 1;

      const userExists = await this.ratesService.getUserExists(userId);
      if (!userExists) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      const data = await this.ratesService.getRates(
        userId,
        Number(body.index),
        Number(body.count),
        body.level !== undefined ? Number(body.level) : undefined,
      );

      if (!data || data.length === 0) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      console.error('get_rates error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('set_rates')
  async setRates(@Body() body: any) {
    try {
      if (
        body.token === undefined ||
        body.user_id === undefined ||
        body.level === undefined ||
        body.content === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      if (!body.token || body.token === 'invalid') {
        return {
          code: 9998,
          message: 'Token is invalid.',
        };
      }

      const level = Number(body.level);

      if (![1, 2, 3, 4, 5].includes(level)) {
        return {
          code: 1004,
          message: 'Parameter value is invalid.',
        };
      }

      const userExists = await this.ratesService.getUserExists(
        Number(body.user_id),
      );

      if (!userExists) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      const data = await this.ratesService.setRate(
        Number(body.user_id),
        1,
        level,
        body.content,
        body.product_id !== undefined ? Number(body.product_id) : undefined,
        body.purchase_id !== undefined ? Number(body.purchase_id) : undefined,
      );

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      console.error('set_rates error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }
}