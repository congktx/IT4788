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
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { OrdersService } from './orders.service';
import { ApiOperation } from '@nestjs/swagger';

// DTO của main
import { GetShipFromQueryDto } from './dto/ship_from.dto';
import { GetShipFeeDto } from './dto/getshipfee.dto';
import { AddOrderAddress } from './dto/add_order_address.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';

// DTO của bạn
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
  user: {
    id: number;
    userId?: number;
  };
}

@Controller('order')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ================== MAIN APIs ==================

  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Lấy danh sách kho hàng theo khu vực',
  })
  @Get('get_ship_from')
  getFrom(@Query() query: GetShipFromQueryDto) {
    return this.ordersService.getShipFrom(query);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Phí ship' })
  @Post('get_ship_fee')
  getShipFee(@Body() query: GetShipFeeDto, @Req() req: RequestWithUser) {
    return this.ordersService.getShipFee(req.user?.id, query);
  }

  @UseGuards(AuthGuard)
  @Get('get_list_order_address')
  getListOrderAddress(@Req() req: RequestWithUser) {
    return this.ordersService.getListOrderAddress(req.user?.id);
  }

  @UseGuards(AuthGuard)
  @Post('add_order_address')
  addOrderAddress(@Req() req: RequestWithUser, @Body() dto: AddOrderAddress) {
    return this.ordersService.addOrderAddress(req.user?.id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('update/:id')
  updateOrrderAddress(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateOrderAddressDto,
    @Param('id') id: number,
  ) {
    return this.ordersService.editOrderAddress(req.user?.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('delete/:id')
  removeOrderAddress(@Param('id') id: number, @Req() req: RequestWithUser) {
    return this.ordersService.delete_order_address(req.user?.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('get_order_status')
  get_order_status(
    @Body() dto: GetOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ordersService.get_order_status(req.user?.id, dto);
  }

  // ================== YOUR APIs ==================

  @UseGuards(AuthGuard)
  @Post('create_order')
  createOrder(@Body() body: CreateOrderDto, @Req() req: any) {
    return this.ordersService.createOrder(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_list_purchases')
  getListPurchases(@Body() body: GetListPurchasesDto, @Req() req: any) {
    return this.ordersService.getListPurchases(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_purchase')
  getPurchase(@Body() body: GetPurchaseDto, @Req() req: any) {
    return this.ordersService.getPurchase(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('edit_purchase')
  editPurchase(@Body() body: EditPurchaseDto, @Req() req: any) {
    return this.ordersService.editPurchase(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('cancel_order')
  cancelOrder(@Body() body: CancelOrderDto, @Req() req: any) {
    return this.ordersService.cancelOrder(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('set_accept_buyer')
  setAcceptBuyer(@Body() body: SetAcceptBuyerDto, @Req() req: any) {
    return this.ordersService.setAcceptBuyer(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('buyer_confirm_received')
  buyerConfirmReceived(@Body() body: BuyerConfirmReceivedDto, @Req() req: any) {
    return this.ordersService.buyerConfirmReceived(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('refund_order')
  refundOrder(@Body() body: RefundOrderDto, @Req() req: any) {
    return this.ordersService.refundOrder(body, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('seller_mark_as_shipped')
  sellerMarkAsShipped(
    @Body() body: SellerMarkAsShippedDto,
    @Req() req: any,
  ) {
    return this.ordersService.sellerMarkAsShipped(
      body,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard)
  @Post('get_order_timeline')
  getOrderTimeline(@Body() body: GetOrderTimelineDto, @Req() req: any) {
    return this.ordersService.getOrderTimeline(body, req.user.userId);
  }
}