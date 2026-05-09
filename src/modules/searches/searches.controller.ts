import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SearchesService } from './searches.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { ProductsService } from '../products/products.service';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';

@Controller('api')
export class SearchesController {
    constructor(
        private readonly searchesService: SearchesService,
        private readonly productsService: ProductsService,
    ) {}

  @Post('save_search')
  @UseGuards(AuthGuard)
  async saveSearch(@Body() body: any, @Req() req: any) {
    try {
      if (body.keyword === undefined) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const userId = req.user.userId ?? req.user.id;

      const data = await this.searchesService.saveSearch(userId, body.keyword);

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('save_search error:', error);

      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  @Post('get_list_saved_search')
  @UseGuards(AuthGuard)
  async getListSavedSearch(@Body() body: any, @Req() req: any) {
    try {
      if (
        body.index === undefined ||
        body.count === undefined
      ) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const userId = req.user.userId ?? req.user.id;

      const data = await this.searchesService.getListSavedSearch(
        userId,
        Number(body.index),
        Number(body.count),
      );

      if (!data || data.length === 0) {
        return buildResponse(APP_RESPONSE.NO_DATA_OR_END_OF_LIST, null);
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('get_list_saved_search error:', error);

      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }

  @Post('search')
  @UseGuards(AuthGuard)
  async search(@Body() body: any) {
    try {
      if (
        body.index === undefined ||
        body.count === undefined
      ) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const hasCondition =
        (body.keyword !== undefined && body.keyword !== '') ||
        body.category_id !== undefined ||
        body.brand_id !== undefined ||
        body.price_min !== undefined ||
        body.price_max !== undefined;

      if (!hasCondition) {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }

      const data = await this.productsService.searchProducts(
        body.keyword,
        body.category_id !== undefined ? Number(body.category_id) : undefined,
        body.brand_id !== undefined ? Number(body.brand_id) : undefined,
        body.price_min !== undefined ? Number(body.price_min) : undefined,
        body.price_max !== undefined ? Number(body.price_max) : undefined,
        Number(body.index),
        Number(body.count),
      );

      if (!data || data.length === 0) {
        return buildResponse(APP_RESPONSE.NO_DATA_OR_END_OF_LIST, null);
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('search error:', error);

      return buildResponse(APP_RESPONSE.EXCEPTION_ERROR, null);
    }
  }
}