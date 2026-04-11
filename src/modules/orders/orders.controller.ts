import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetListPurchasesDto } from './dto/get-list-purchases.dto';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { GetPurchaseDto } from './dto/get-purchase.dto';
import { EditPurchaseDto } from './dto/edit-purchase.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SetAcceptBuyerDto } from './dto/set-accept-buyer.dto';
import { BuyerConfirmReceivedDto } from './dto/buyer-confirm-received.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { SellerMarkAsShippedDto } from './dto/seller-mark-as-shipped.dto';
import { GetOrderTimelineDto } from './dto/get-order-timeline.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard)
  @Post('create_order')
  createOrder(
    @Body() body: CreateOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.createOrder(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_list_purchases')
  getListPurchases(
    @Body() body: GetListPurchasesDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.getListPurchases(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_purchase')
  getPurchase(
    @Body() body: GetPurchaseDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.getPurchase(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('edit_purchase')
  editPurchase(
    @Body() body: EditPurchaseDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.editPurchase(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('cancel_order')
  cancelOrder(
    @Body() body: CancelOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.cancelOrder(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('set_accept_buyer')
  setAcceptBuyer(
    @Body() body: SetAcceptBuyerDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.setAcceptBuyer(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('buyer_confirm_received')
  buyerConfirmReceived(
    @Body() body: BuyerConfirmReceivedDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.buyerConfirmReceived(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('refund_order')
  refundOrder(
    @Body() body: RefundOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.refundOrder(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('seller_mark_as_shipped')
  sellerMarkAsShipped(
    @Body() body: SellerMarkAsShippedDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.sellerMarkAsShipped(body, userId);
  }

  @UseGuards(AuthGuard)
  @Post('get_order_timeline')
  getOrderTimeline(
    @Body() body: GetOrderTimelineDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.getOrderTimeline(body, userId);
  }
}