import { Body, Controller, Post } from '@nestjs/common';
import { SearchesService } from './searches.service';
import { ProductsService } from '../products/products.service';

@Controller('api')
export class SearchesController {
    constructor(
        private readonly searchesService: SearchesService,
        private readonly productsService: ProductsService,
    ) {}

  @Post('save_search')
  async saveSearch(@Body() body: any) {
    try {
      if (body.token === undefined || body.keyword === undefined) {
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

      const data = await this.searchesService.saveSearch(1, body.keyword);

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      console.error('save_search error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('get_list_saved_search')
  async getListSavedSearch(@Body() body: any) {
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

      const data = await this.searchesService.getListSavedSearch(
        1,
        Number(body.index),
        Number(body.count),
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
      console.error('get_list_saved_search error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('search')
  async search(@Body() body: any) {
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

      const hasCondition =
        (body.keyword !== undefined && body.keyword !== '') ||
        body.category_id !== undefined ||
        body.brand_id !== undefined ||
        body.price_min !== undefined ||
        body.price_max !== undefined;

      if (!hasCondition) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
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
      console.error('search error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }
}