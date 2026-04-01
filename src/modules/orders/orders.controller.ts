import {
  UseGuards,
  Body,
  Patch,
  Param,
  Get,
  Post,
  Controller,
  Req,
  Query,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/jwt-auth.guards';
import { OrderService } from './orders.service';
import { ApiOperation } from '@nestjs/swagger';
import { GetShipFromQueryDto } from './dto/ship_from.dto';
import { GetShipFeeDto } from './dto/getshipfee.dto';
import { AddOrderAddress } from './dto/add_order_address.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';

interface RequestWithUser extends Request {
  user: {
    id: number;
  };
}

@Controller('order')
export class OrdersController {
  constructor(private readonly oderService: OrderService) {}
  //get_ship_from
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách kho hàng theo khu vực 0-phường, 1-tỉnh',
  })
  @Get('get_ship_from')
  async getFrom(@Query() query: GetShipFromQueryDto): Promise<any> {
    return this.oderService.getShipFrom(query);
  }
  //get_ship_fee
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Phí ship' })
  @Post('get_ship_fee')
  async getShipFee(@Body() query: GetShipFeeDto, @Req() req: RequestWithUser) {
    return this.oderService.getShipFee(req.user?.id, query);
  }
  //get_list_order_address
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'lấy danh sách địa chỉ của người mua' })
  @Get('get_list_order_address')
  async getListOrderAddress(@Req() req: RequestWithUser) {
    return this.oderService.getListOrderAddress(req.user?.id);
  }
  //add_order_address
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Thêm địa chỉ người dùng' })
  @Post('add_order_address')
  async addOrderAddress(
    @Req() req: RequestWithUser,
    @Body() dto: AddOrderAddress,
  ) {
    return this.oderService.addOrderAddress(req.user?.id, dto);
  }
  //update_order_address
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sửa địa chỉ người dùng' })
  @Patch('update/:id')
  async updateOrrderAddress(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateOrderAddressDto,
    @Param('id') id: number,
  ) {
    return this.oderService.editOrderAddress(req.user?.id, id, dto);
  }
  //remove_order_address
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xóa địa chỉ người dùng' })
  @Delete('delete/:id')
  async removeOrderAddress(
    @Param('id') id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.oderService.delete_order_address(req.user?.id, id);
  }
  //get_order_status
  @UseGuards(JwtAuthGuard)
  @Post('get_order_status')
  async get_order_status(
    @Body() dto: GetOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.oderService.get_order_status(req.user?.id, dto);
  }
}
