import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { OrdersService } from './orders.service';
import { GetShipFromQueryDto } from './dto/ship_from.dto';
import { GetShipFeeDto } from './dto/getshipfee.dto';
import { AddOrderAddressDto } from './dto/add_order_address.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetListPurchasesDto } from './dto/get-list-purchases.dto';
import { GetPurchaseDto } from './dto/get-purchase.dto';
import { EditPurchaseDto } from './dto/edit-purchase.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SetAcceptBuyerDto } from './dto/set-accept-buyer.dto';
import { BuyerConfirmReceivedDto } from './dto/buyer-confirm-received.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { SellerMarkAsShippedDto } from './dto/seller-mark-as-shipped.dto';
import { GetOrderTimelineDto } from './dto/get-order-timeline.dto';

interface RequestWithUser extends Request {
  user?: {
    id?: number;
    userId?: number;
  };
}

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private getUserId(req: RequestWithUser): number {
    return req.user?.id ?? req.user?.userId ?? 0;
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách kho hàng theo khu vực 0-phường, 1-tỉnh',
  })
  @Get('order/get_ship_from')
  getFrom(@Query() query: GetShipFromQueryDto) {
    return this.ordersService.getShipFrom(query);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Phí ship' })
  @Post('order/get_ship_fee')
  getShipFee(@Body() query: GetShipFeeDto, @Req() req: RequestWithUser) {
    return this.ordersService.getShipFee(this.getUserId(req), query);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'lấy danh sách địa chỉ của người mua' })
  @Get('order/get_list_order_address')
  getListOrderAddress(@Req() req: RequestWithUser) {
    return this.ordersService.getListOrderAddress(this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Thêm địa chỉ người dùng' })
  @Post('order/add_order_address')
  addOrderAddress(@Req() req: RequestWithUser, @Body() dto: AddOrderAddressDto) {
    return this.ordersService.addOrderAddress(this.getUserId(req), dto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Sửa địa chỉ người dùng' })
  @Patch('order/update/:id')
  updateOrrderAddress(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateOrderAddressDto,
    @Param('id') id: number,
  ) {
    return this.ordersService.editOrderAddress(this.getUserId(req), id, dto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Xóa địa chỉ người dùng' })
  @Delete('order/delete/:id')
  removeOrderAddress(@Param('id') id: number, @Req() req: RequestWithUser) {
    return this.ordersService.delete_order_address(this.getUserId(req), id);
  }

  @UseGuards(AuthGuard)
  @Post('order/get_order_status')
  get_order_status(
    @Body() dto: GetOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.get_order_status(this.getUserId(req), dto);
  }

  @UseGuards(AuthGuard)
  @Post('order/create_order')
  createOrder(@Body() body: CreateOrderDto, @Req() req: RequestWithUser) {
    return this.ordersService.createOrder(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/get_list_purchases')
  getListPurchases(
    @Body() body: GetListPurchasesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.getListPurchases(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/get_purchase')
  getPurchase(@Body() body: GetPurchaseDto, @Req() req: RequestWithUser) {
    return this.ordersService.getPurchase(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/edit_purchase')
  editPurchase(@Body() body: EditPurchaseDto, @Req() req: RequestWithUser) {
    return this.ordersService.editPurchase(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/cancel_order')
  cancelOrder(@Body() body: CancelOrderDto, @Req() req: RequestWithUser) {
    return this.ordersService.cancelOrder(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/set_accept_buyer')
  setAcceptBuyer(@Body() body: SetAcceptBuyerDto, @Req() req: RequestWithUser) {
    return this.ordersService.setAcceptBuyer(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/buyer_confirm_received')
  buyerConfirmReceived(
    @Body() body: BuyerConfirmReceivedDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.buyerConfirmReceived(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/refund_order')
  refundOrder(@Body() body: RefundOrderDto, @Req() req: RequestWithUser) {
    return this.ordersService.refundOrder(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/seller_mark_as_shipped')
  sellerMarkAsShipped(
    @Body() body: SellerMarkAsShippedDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.sellerMarkAsShipped(body, this.getUserId(req));
  }

  @UseGuards(AuthGuard)
  @Post('order/get_order_timeline')
  getOrderTimeline(
    @Body() body: GetOrderTimelineDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.getOrderTimeline(body, this.getUserId(req));
  }
}
