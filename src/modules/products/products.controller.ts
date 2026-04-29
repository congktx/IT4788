import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CreateProductDto } from './dto/create_product.dto';
import { UpdateProductDto } from './dto/update_product.dto';
import { ApiOperation } from '@nestjs/swagger';
import { GetUserListingsDto } from './dto/get_user_listing.dto';
import { APP_RESPONSE, buildResponse } from '../constants/response.constants';

interface RequestWithUser extends Request {
  user: {
    id: number;
  };
}

@Controller('api')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('get_categories')
  async getCategories(@Body() body: any) {
    const data = await this.productsService.getCategories();

    if (!data || data.length === 0) {
      return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
    }

    return buildResponse(APP_RESPONSE.OK, data);
  }

  @Post('get_list_brands')
  async getListBrands(@Body() body: any) {
    const data = await this.productsService.getListBrands();

    if (!data || data.length === 0) {
      return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
    }

    return buildResponse(APP_RESPONSE.OK, data);
  }

  @Post('get_products')
  async getProducts(@Body() body: any) {
    try {
      if (!body.id) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const data = await this.productsService.getProductById(body.id);

      if (!data) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  @Post('get_list_products')
  async getListProducts(@Body() body: any) {
    try {
      if (body.index === undefined || body.count === undefined) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const data = await this.productsService.getListProducts(
        Number(body.index),
        Number(body.count),
      );

      if (!data || data.length === 0) {
        return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      return APP_RESPONSE.EXCEPTION_ERROR;
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
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      const data = await this.productsService.getCommentsProduct(
        Number(body.product_id),
        Number(body.index),
        Number(body.count),
      );

      if (!data || data.length === 0) {
        return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
      }

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      return APP_RESPONSE.EXCEPTION_ERROR;
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
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      const user = await this.productsService.getUserById(Number(body.user_id));

      if (!user) {
        return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
      }

      const data = await this.productsService.setCommentsProduct(
        Number(body.product_id),
        Number(body.user_id),
        body.content,
        Number(body.index),
        Number(body.count),
      );

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('set_comments_product error:', error);

      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  @Post('like_product')
  async likeProduct(@Body() body: any) {
    try {
      if (body.product_id === undefined || body.user_id === undefined) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      const user = await this.productsService.getUserById(Number(body.user_id));

      if (!user) {
        return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
      }

      const data = await this.productsService.likeProduct(
        Number(body.product_id),
        Number(body.user_id),
      );

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('like_product error:', error);

      return APP_RESPONSE.EXCEPTION_ERROR;
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
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const product = await this.productsService.getProductById(
        Number(body.product_id),
      );

      if (!product) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      const user = await this.productsService.getUserById(Number(body.user_id));

      if (!user) {
        return APP_RESPONSE.NO_DATA_OR_END_OF_LIST;
      }

      const data = await this.productsService.reportProduct(
        Number(body.product_id),
        Number(body.user_id),
        body.subject,
        body.details,
      );

      return buildResponse(APP_RESPONSE.OK, data);
    } catch (error) {
      console.error('report_product error:', error);

      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  // ===== Seller endpoints (require authentication) =====
  @ApiOperation({
    summary: 'Người bán thêm sản phẩm',
  })
  @UseGuards(AuthGuard)
  @Post('add_product')
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.productsService.createProduct(dto, req.user?.id);
  }

  @ApiOperation({
    summary: 'Người bán cập nhật thông tin sản phẩm',
  })
  @UseGuards(AuthGuard)
  @Patch('update/:id')
  async update(
    @Param('id') id: number,
    @Req() req: RequestWithUser,
    @Body() upateProductDto: UpdateProductDto,
  ): Promise<any> {
    return this.productsService.update(req.user?.id, id, upateProductDto);
  }

  @ApiOperation({
    summary: 'Người bán xóa sản phầm',
  })
  @UseGuards(AuthGuard)
  @Delete('delete/:id')
  async remove(@Param('id') id: number) {
    return await this.productsService.remove(id);
  }

  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm của người bán',
  })
  @UseGuards(AuthGuard)
  @Post('get_user_listings')
  async getUserListings(
    @Req() req: RequestWithUser,
    @Body() query: GetUserListingsDto,
  ) {
    return await this.productsService.get_listing(req.user?.id, query);
  }
}
