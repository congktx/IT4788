import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order_item.entity';
import { Shipping } from './entities/shipping.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../addresses/entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { GetListPurchasesDto } from './dto/get-list-purchases.dto';
import { GetPurchaseDto } from './dto/get-purchase.dto';
import { EditPurchaseDto } from './dto/edit-purchase.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SetAcceptBuyerDto } from './dto/set-accept-buyer.dto';
import { BuyerConfirmReceivedDto } from './dto/buyer-confirm-received.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { SellerMarkAsShippedDto } from './dto/seller-mark-as-shipped.dto';
import { OrderTimeline } from './entities/order-timeline.entity';
import { GetOrderTimelineDto } from './dto/get-order-timeline.dto';
@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,

    @InjectRepository(OrderTimeline)
    private readonly orderTimelineRepository: Repository<OrderTimeline>,
  ) {}

  async createOrder(body: CreateOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    if (!body.items || body.items.length === 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Items must not be empty',
        data: null,
      });
    }

    const address = await this.addressRepository.findOne({
      where: {
        id: body.address_id,
        user_id: buyer.id,
      },
    });

    if (!address) {
      throw new BadRequestException({
        code: '1004',
        message: 'Address is invalid',
        data: null,
      });
    }

    const productIds = body.items.map((item) => item.product_id);

    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...productIds)', { productIds })
      .getMany();

    if (products.length !== productIds.length) {
      throw new BadRequestException({
        code: '1013',
        message: 'One or more products do not exist',
        data: null,
      });
    }

    const firstSellerId = products[0].seller_id;
    const isSameSeller = products.every(
      (product) => product.seller_id === firstSellerId,
    );

    if (!isSameSeller) {
      throw new BadRequestException({
        code: '1004',
        message: 'All items in one order must belong to the same seller',
        data: null,
      });
    }

    let totalPrice = 0;

    const itemPayloads = body.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);

      if (!product) {
        throw new BadRequestException({
          code: '1013',
          message: `Product ${item.product_id} does not exist`,
          data: null,
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException({
          code: '1004',
          message: 'Quantity must be greater than 0',
          data: null,
        });
      }

      const itemTotal = Number(product.price) * item.quantity;
      totalPrice += itemTotal;

      return {
        product_id: product.id,
        quantity: item.quantity,
        total_price: itemTotal,
      };
    });

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        buyer_id: buyer.id,
        seller_id: firstSellerId,
        status: OrderStatus.PENDING,
        total_price: totalPrice,
        shipping_fee: 0,
      });

      const savedOrder = await manager.save(Order, order);

      const createdTimeline = manager.create(OrderTimeline, {
        order_id: savedOrder.id,
        status: OrderStatus.PENDING,
        note: 'Order created',
      });
      await manager.save(OrderTimeline, createdTimeline);

      const orderItems = itemPayloads.map((item) =>
        manager.create(OrderItem, {
          order_id: savedOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          total_price: item.total_price,
        }),
      );

      await manager.save(OrderItem, orderItems);

      const shipping = manager.create(Shipping, {
        order_id: savedOrder.id,
        address_id: address.id,
        shipper_id: null,
        status: 'pending',
        tracking_code: null,
      });

      await manager.save(Shipping, shipping);

      return {
        code: '1000',
        message: 'OK',
        data: {
          order_id: savedOrder.id,
          status: savedOrder.status,
          total_price: savedOrder.total_price,
          shipping_fee: savedOrder.shipping_fee,
          address_id: address.id,
          source: body.source,
        },
      };
    });
  }

  async getListPurchases(body: GetListPurchasesDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const index = Number(body.index ?? 0);
    const count = Number(body.count ?? 10);

    if (isNaN(index) || isNaN(count) || index < 0 || count <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('order.buyer_id = :buyerId', { buyerId: buyer.id });

    if (body.state) {
      query.andWhere('order.status = :state', { state: body.state });
    }

    const orders = await query
      .orderBy('order.created_at', 'DESC')
      .skip(index)
      .take(count)
      .getMany();

    const data = orders.map((order) => ({
      id: order.id,
      state: order.status,
      total_price: Number(order.total_price),
      items: (order.items || []).map((item) => ({
        product_id: item.product_id,
        name: item.product?.title || '',
        image: this.getFirstImage(item.product?.image_urls),
        price: item.product ? Number(item.product.price) : 0,
        quantity: item.quantity,
      })),
    }));

    return {
      code: '1000',
      message: 'OK',
      data,
    };
  }

  private getFirstImage(imageUrls?: string[] | string | null): string {
    if (!imageUrls) return '';

    if (Array.isArray(imageUrls)) {
      return imageUrls.length > 0 ? imageUrls[0] : '';
    }

    try {
      const parsed = JSON.parse(imageUrls);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    } catch (_) {}

    return imageUrls;
}
  async getPurchase(body: GetPurchaseDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.id);

    console.log('LOGIN USER ID:', userId);
    console.log('PURCHASE ID:', purchaseId);
    console.log('BODY:', body);
    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.seller', 'seller')
      .leftJoinAndSelect('order.shipping', 'shipping')
      .where('order.id = :purchaseId', { purchaseId })
      .andWhere('order.buyer_id = :buyerId', { buyerId: buyer.id })
      .getOne();
    console.log('ORDER:', order);

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    let buyerAddress = '';

    if (order.shipping?.address_id) {
      const address = await this.addressRepository.findOne({
        where: { id: order.shipping.address_id },
      });

      if (address) {
        buyerAddress = address.full_address;
      }
    }

    const totalPrice = Number(order.total_price || 0);
    const shipFee = Number(order.shipping_fee || 0);
    const finalPrice = totalPrice + shipFee;

    return {
      code: '1000',
      message: 'OK',
      data: {
        id: order.id,
        state: order.status,
        total_price: totalPrice,
        ship_fee: shipFee,
        final_price: finalPrice,
        note: '',
        items: (order.items || []).map((item) => ({
          product_id: item.product_id,
          name: item.product?.title || '',
          image: this.getFirstImage(item.product?.image_urls),
          price: item.product ? Number(item.product.price) : 0,
          quantity: item.quantity,
          subtotal: Number(item.total_price || 0),
        })),
        seller: {
          id: order.seller?.id || null,
          name: order.seller?.username || '',
        },
        buyer: {
          id: order.buyer?.id || null,
          name: order.buyer?.username || '',
          phonenumber: order.buyer?.phone_number || '',
          address: buyerAddress,
        },
      },
    };
  }

  async editPurchase(body: EditPurchaseDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
      relations: ['shipping'],
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    let updatedAddress: Address | null = null;

    if (body.address_id) {
      const addressId = Number(body.address_id);

      if (isNaN(addressId) || addressId <= 0) {
        throw new BadRequestException({
          code: '1004',
          message: 'Parameter value is invalid',
          data: null,
        });
      }

      const address = await this.addressRepository.findOne({
        where: {
          id: addressId,
          user_id: buyer.id,
        },
      });

      if (!address) {
        throw new BadRequestException({
          code: '1004',
          message: 'Parameter value is invalid',
          data: null,
        });
      }

      order.shipping.address_id = address.id;
      await this.shippingRepository.save(order.shipping);
      updatedAddress = address;
    }

    if (body.note !== undefined) {
      order.note = body.note;
      await this.orderRepository.save(order);
    }

    return {
      code: '1000',
      message: 'OK',
      data: {
        id: order.id,
        state: order.status,
        note: order.note || '',
        address_id: order.shipping?.address_id || null,
        address: updatedAddress
          ? updatedAddress.full_address
          : null,
      },
    };
  }

  async cancelOrder(body: CancelOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    order.status = OrderStatus.CANCELLED;
    order.cancel_reason = body.reason ?? null;
    await this.orderRepository.save(order);
    await this.addTimeline(order.id, OrderStatus.CANCELLED, 'Buyer cancelled order');

    return {
      code: '1000',
      message: 'OK',
      data: {
        id: order.id,
        state: order.status,
        refunded_coins: 0,
        refunded_at: new Date(),
      },
    };
  }

  async setAcceptBuyer(body: SetAcceptBuyerDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.purchase_id);
    const buyerId = Number(body.buyer_id);
    const isAccept = Number(body.is_accept);

    if (
      isNaN(purchaseId) ||
      purchaseId <= 0 ||
      isNaN(buyerId) ||
      buyerId <= 0 ||
      (isAccept !== 0 && isAccept !== 1)
    ) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new BadRequestException({
        code: '1013',
        message: 'User does not exist',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        code: '1010',
        message: 'Action has been done previously by this user',
        data: null,
      });
    }

    order.status = isAccept === 1
      ? OrderStatus.CONFIRMED
      : OrderStatus.CANCELLED;

    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      order.status,
      isAccept === 1 ? 'Seller accepted order' : 'Seller rejected order',
    );

    return {
      code: '1000',
      message: 'OK',
    };
  }

  async buyerConfirmReceived(body: BuyerConfirmReceivedDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException({
        code: '1010',
        message: 'Action has been done previously by this user',
        data: null,
      });
    }

    order.status = OrderStatus.DELIVERED;
    await this.orderRepository.save(order);
    await this.addTimeline(order.id, OrderStatus.DELIVERED, 'Buyer confirmed received');

    return {
      code: '1000',
      message: 'OK',
    };
  }

  async refundOrder(body: RefundOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException({
        code: '1010',
        message: 'Action has been done previously by this user',
        data: null,
      });
    }

    order.status = OrderStatus.REFUNDED;
    order.refund_reason = body.reason ?? null;

    await this.orderRepository.save(order);
    await this.addTimeline(order.id, OrderStatus.REFUNDED, body.reason ?? 'Refund requested');

    return {
      code: '1000',
      message: 'OK',
    };
  }

  async sellerMarkAsShipped(body: SellerMarkAsShippedDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const purchaseId = Number(body.purchase_id);
    const buyerId = Number(body.buyer_id);

    if (
      isNaN(purchaseId) ||
      purchaseId <= 0 ||
      isNaN(buyerId) ||
      buyerId <= 0
    ) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new BadRequestException({
        code: '1013',
        message: 'User does not exist',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException({
        code: '1010',
        message: 'Action has been done previously by this user',
        data: null,
      });
    }

    order.status = OrderStatus.SHIPPING;
    await this.orderRepository.save(order);
    await this.addTimeline(order.id, OrderStatus.SHIPPING, 'Seller marked as shipped');

    return {
      code: '1000',
      message: 'OK',
    };
  }

  private async addTimeline(
    orderId: number,
    status: string,
    note?: string | null,
  ) {
    const timeline = this.orderTimelineRepository.create({
      order_id: orderId,
      status,
      note: note ?? null,
    });

    await this.orderTimelineRepository.save(timeline);
  }

  async getOrderTimeline(body: GetOrderTimelineDto, userId: number) {
    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const order = await this.orderRepository.findOne({
      where: { id: purchaseId },
    });

    if (!order) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const isRelated =
      order.buyer_id === userId || order.seller_id === userId;

    if (!isRelated) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    const timelines = await this.orderTimelineRepository.find({
      where: { order_id: purchaseId },
      order: { created_at: 'ASC' },
    });

    return {
      code: '1000',
      message: 'OK',
      data: timelines.map((item) => ({
        id: item.id,
        purchase_id: item.order_id,
        state: item.status,
        note: item.note,
        created_at: item.created_at,
      })),
    };
  }
}