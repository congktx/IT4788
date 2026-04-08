import {
  Body,
  Controller,
  Req,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/auth/guards/auth.guard';
import { ProductService } from './products.service';
import { CreateProductDto } from './dto/create_product.dto';
import { UpdateProductDto } from './dto/update_product.dto';
import { ApiOperation } from '@nestjs/swagger';
import { GetUserListingsDto } from './dto/get_user_listing.dto';
interface RequestWithUser extends Request {
  user: {
    id: number;
  };
}

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({
    summary: 'Người bán thêm sản phẩm',
  })
  @UseGuards(AuthGuard)
  @Post('add_product')
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.productService.create(dto, req.user?.id);
  }
  @ApiOperation({
    summary: 'Người bán cập nhật thông tin sản phẩm',
  })
  @UseGuards(AuthGuard)
  @Patch('/update/:id')
  async update(
    @Param('id') id: number,
    @Req() req: RequestWithUser,
    @Body() upateProductDto: UpdateProductDto,
  ): Promise<any> {
    return this.productService.update(req.user?.id, id, upateProductDto);
  }
  @ApiOperation({
    summary: 'Người bán xóa sản phầm',
  })
  @UseGuards(AuthGuard)
  @Delete('delete/:id')
  async remove(@Param('id') id: number) {
    return await this.productService.remove(id);
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
    return await this.productService.get_listing(req.user?.id, query);
  }
}
