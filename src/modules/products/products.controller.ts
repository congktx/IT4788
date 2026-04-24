import { Body, Controller, Post } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('api')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('get_categories')
  async getCategories(@Body() body: any) {
    const data = await this.productsService.getCategories();

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
  }

  @Post('get_list_brands')
  async getListBrands(@Body() body: any) {
    const data = await this.productsService.getListBrands();

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
  }

  @Post('get_products')
  async getProducts(@Body() body: any) {
    try {
      if (!body.id) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const data = await this.productsService.getProductById(body.id);

      if (!data) {
        return {
          code: 9992,
          message: 'Product is not existed',
        };
      }

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('get_list_products')
  async getListProducts(@Body() body: any) {
    try {
      if (body.index === undefined || body.count === undefined) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const data = await this.productsService.getListProducts(
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
      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('get_comments_product')
  async getCommentsProduct(@Body() body: any) {
    try {
      if (
        body.product_id === undefined ||
        body.index === undefined ||
        body.count === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return {
          code: 9992,
          message: 'Product is not existed',
        };
      }

      const data = await this.productsService.getCommentsProduct(
        Number(body.product_id),
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
      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('set_comments_product')
  async setCommentsProduct(@Body() body: any) {
    try {
      if (
        body.product_id === undefined ||
        body.user_id === undefined ||
        body.content === undefined ||
        body.index === undefined ||
        body.count === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return {
          code: 9992,
          message: 'Product is not existed',
        };
      }

      const user = await this.productsService.getUserById(
        Number(body.user_id),
      );

      if (!user) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      const data = await this.productsService.setCommentsProduct(
        Number(body.product_id),
        Number(body.user_id),
        body.content,
        Number(body.index),
        Number(body.count),
      );

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
        console.error('set_comments_product error:', error);

        return {
            code: 9999,
            message: 'Exception error.',
        };
    }
  }

  @Post('like_product')
  async likeProduct(@Body() body: any) {
    try {
      if (
        body.product_id === undefined ||
        body.user_id === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return {
          code: 9992,
          message: 'Product is not existed',
        };
      }

      const user = await this.productsService.getUserById(
        Number(body.user_id),
      );

      if (!user) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      const data = await this.productsService.likeProduct(
        Number(body.product_id),
        Number(body.user_id),
      );

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      console.error('like_product error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }

  @Post('report_product')
  async reportProduct(@Body() body: any) {
    try {
      if (
        body.product_id === undefined ||
        body.user_id === undefined ||
        body.subject === undefined ||
        body.details === undefined
      ) {
        return {
          code: 1002,
          message: 'Parameter is not enought.',
        };
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return {
          code: 9992,
          message: 'Product is not existed',
        };
      }

      const user = await this.productsService.getUserById(
        Number(body.user_id),
      );

      if (!user) {
        return {
          code: 9994,
          message: 'No Data or end of list data',
        };
      }

      const data = await this.productsService.reportProduct(
        Number(body.product_id),
        Number(body.user_id),
        body.subject,
        body.details,
      );

      return {
        code: 1000,
        message: 'OK',
        data,
      };
    } catch (error) {
      console.error('report_product error:', error);

      return {
        code: 9999,
        message: 'Exception error.',
      };
    }
  }
}