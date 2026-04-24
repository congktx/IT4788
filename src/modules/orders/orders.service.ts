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
import { OrderTimeline } from './entities/order-timeline.entity';
import { Status } from './entities/status_order.entities';
import { Ward } from './entities/ward.entity';
import { Province } from './entities/province.entity';
import { Warehouse } from './entities/warehouse.entity';

import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../addresses/entities/address.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';

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

import { GetShipFromQueryDto } from './dto/ship_from.dto';
import { GetShipFeeDto } from './dto/getshipfee.dto';
import { AddOrderAddress } from './dto/add_order_address.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';

import { OrderStatus } from './enums/order-status.enum';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,

    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,

    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async createOrder(body: CreateOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    if (!body.items || body.items.length === 0) {
      this.paramInvalid();
    }

    const address = await this.addressRepository.findOne({
      where: {
        id: body.address_id,
        user_id: buyer.id,
      },
    });

    if (!address) this.paramInvalid();

    const productIds = body.items.map((item) => item.product_id);

    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...productIds)', { productIds })
      .getMany();

    if (products.length !== productIds.length) {
      this.productNotExist();
    }

    const firstSellerId = products[0].seller_id;
    const isSameSeller = products.every(
      (product) => product.seller_id === firstSellerId,
    );

    if (!isSameSeller) this.paramInvalid();

    let totalPrice = 0;

    const itemPayloads = body.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);

      if (!product) this.productNotExist();

      if (!item.quantity || item.quantity <= 0) {
        this.paramInvalid();
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

      return buildResponse(APP_RESPONSE.OK, {
        order_id: savedOrder.id,
        status: savedOrder.status,
        total_price: savedOrder.total_price,
        shipping_fee: savedOrder.shipping_fee,
        address_id: address.id,
        source: body.source,
      });
    });
  }

  async getListPurchases(body: GetListPurchasesDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const index = Number(body.index ?? 0);
    const count = Number(body.count ?? 10);

    if (isNaN(index) || isNaN(count) || index < 0 || count <= 0) {
      this.paramInvalid();
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

    return buildResponse(APP_RESPONSE.OK, data);
  }

  async getPurchase(body: GetPurchaseDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
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

    if (!order) this.paramInvalid();

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

    return buildResponse(APP_RESPONSE.OK, {
      id: order.id,
      state: order.status,
      total_price: totalPrice,
      ship_fee: shipFee,
      final_price: finalPrice,
      note: order.note || '',
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
    });
  }

  async editPurchase(body: EditPurchaseDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
      relations: ['shipping'],
    });

    if (!order) this.paramInvalid();

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      this.paramInvalid();
    }

    let updatedAddress: Address | null = null;

    if (body.address_id) {
      const addressId = Number(body.address_id);

      if (isNaN(addressId) || addressId <= 0) {
        this.paramInvalid();
      }

      const address = await this.addressRepository.findOne({
        where: {
          id: addressId,
          user_id: buyer.id,
        },
      });

      if (!address) this.paramInvalid();

      order.shipping.address_id = address.id;
      await this.shippingRepository.save(order.shipping);
      updatedAddress = address;
    }

    if (body.note !== undefined) {
      order.note = body.note;
      await this.orderRepository.save(order);
    }

    return buildResponse(APP_RESPONSE.OK, {
      id: order.id,
      state: order.status,
      note: order.note || '',
      address_id: order.shipping?.address_id || null,
      address: updatedAddress ? updatedAddress.full_address : null,
    });
  }

  async cancelOrder(body: CancelOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) this.paramInvalid();

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      this.paramInvalid();
    }

    return this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.CANCELLED;
      order.cancel_reason = body.reason ?? null;
      await manager.save(Order, order);

      let wallet = await manager.findOne(Wallet, {
        where: { user_id: buyer.id },
      });

      if (!wallet) {
        wallet = manager.create(Wallet, {
          user_id: buyer.id,
          balance: 0,
          pending_balance: 0,
        });
        wallet = await manager.save(Wallet, wallet);
      }

      const refundedCoins =
        Number(order.total_price || 0) + Number(order.shipping_fee || 0);

      wallet.balance = Number(wallet.balance || 0) + refundedCoins;
      await manager.save(Wallet, wallet);

      const transaction = manager.create(Transaction, {
        wallet_id: wallet.id,
        type: 'income',
        amount: refundedCoins,
        status: 'success',
        description: `Refund for cancelled order #${order.id}`,
      });

      await manager.save(Transaction, transaction);

      const timeline = manager.create(OrderTimeline, {
        order_id: order.id,
        status: OrderStatus.CANCELLED,
        note: 'Buyer cancelled order',
      });

      await manager.save(OrderTimeline, timeline);

      return buildResponse(APP_RESPONSE.OK, {
        id: order.id,
        state: order.status,
        cancel_reason: order.cancel_reason,
        refunded_coins: refundedCoins,
        refunded_at: new Date(),
      });
    });
  }

  async setAcceptBuyer(body: SetAcceptBuyerDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) this.tokenInvalid();

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
      this.paramInvalid();
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) this.userNotExist();

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) this.paramInvalid();

    if (order.status !== OrderStatus.PENDING) {
      this.actionDone();
    }

    order.status =
      isAccept === 1 ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      order.status,
      isAccept === 1 ? 'Seller accepted order' : 'Seller rejected order',
    );

    return buildResponse(APP_RESPONSE.OK);
  }

  async buyerConfirmReceived(body: BuyerConfirmReceivedDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) this.paramInvalid();

    if (order.status !== OrderStatus.SHIPPING) {
      this.actionDone();
    }

    order.status = OrderStatus.DELIVERED;
    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      OrderStatus.DELIVERED,
      'Buyer confirmed received',
    );

    return buildResponse(APP_RESPONSE.OK);
  }

  async refundOrder(body: RefundOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) this.tokenInvalid();

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) this.paramInvalid();

    if (order.status !== OrderStatus.DELIVERED) {
      this.actionDone();
    }

    order.status = OrderStatus.REFUNDED;
    order.refund_reason = body.reason ?? null;

    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      OrderStatus.REFUNDED,
      body.reason ?? 'Refund requested',
    );

    return buildResponse(APP_RESPONSE.OK);
  }

  async sellerMarkAsShipped(body: SellerMarkAsShippedDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) this.tokenInvalid();

    const purchaseId = Number(body.purchase_id);
    const buyerId = Number(body.buyer_id);

    if (
      isNaN(purchaseId) ||
      purchaseId <= 0 ||
      isNaN(buyerId) ||
      buyerId <= 0
    ) {
      this.paramInvalid();
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) this.userNotExist();

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) this.paramInvalid();

    if (order.status !== OrderStatus.CONFIRMED) {
      this.actionDone();
    }

    order.status = OrderStatus.SHIPPING;
    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      OrderStatus.SHIPPING,
      'Seller marked as shipped',
    );

    return buildResponse(APP_RESPONSE.OK);
  }

  async getOrderTimeline(body: GetOrderTimelineDto, userId: number) {
    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      this.paramInvalid();
    }

    const order = await this.orderRepository.findOne({
      where: { id: purchaseId },
    });

    if (!order) this.paramInvalid();

    const isRelated = order.buyer_id === userId || order.seller_id === userId;

    if (!isRelated) this.paramInvalid();

    const timelines = await this.orderTimelineRepository.find({
      where: { order_id: purchaseId },
      order: { created_at: 'ASC' },
    });

    return buildResponse(
      APP_RESPONSE.OK,
      timelines.map((item) => ({
        id: item.id,
        purchase_id: item.order_id,
        state: item.status,
        note: item.note,
        created_at: item.created_at,
      })),
    );
  }

  async getShipFrom(query: GetShipFromQueryDto) {
    const { level, index, count, parent_id } = query;
    const parentIdNum = Number(parent_id);

    if (level == 1) {
      const province = await this.provinceRepository.findOne({
        where: { id: Number(parent_id) },
      });

      if (!province) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
      }
    } else {
      const ward = await this.wardRepository.findOne({
        where: { id: Number(parent_id) },
      });

      if (!ward) {
        return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
      }
    }

    const queryBuilder =
      this.warehouseRepository.createQueryBuilder('warehouse');

    if (level == 1) {
      queryBuilder
        .innerJoin('warehouse.ward', 'ward')
        .where('ward.provinces_id = :provinceId', { provinceId: parentIdNum });
    } else {
      queryBuilder.where('warehouse.ward_id = :wardId', {
        wardId: parentIdNum,
      });
    }

    const [warehouses] = await queryBuilder
      .skip(Number(index))
      .take(Number(count))
      .getManyAndCount();

    const list_address = warehouses.map((wh) => ({
      id: wh.id.toString(),
      name: wh.warehouse_name,
      pick_support: wh.pick_support ? '1' : '0',
      message_pick_support: wh.pick_support ? '1-Có' : '0-Không',
    }));

    return buildResponse(APP_RESPONSE.OK, {
      list_address,
    });
  }

  async getShipFee(userId: number, query: GetShipFeeDto) {
    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const { product_id, address_id } = query;

    const product = await this.productRepository.findOne({
      where: { id: Number(product_id) },
      relations: ['ship_from'],
    });

    const shipFrom = (product as any)?.ship_from;

    if (!product || !shipFrom) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
    }

    const sellerLat = Number(shipFrom.lat);
    const sellerLng = Number(shipFrom.lng);

    let buyerAddress: Address | null = null;

    if (address_id) {
      buyerAddress = await this.addressRepository.findOne({
        where: { id: Number(address_id), user_id: userId },
      });
    } else {
      buyerAddress = await this.addressRepository.findOne({
        where: { user_id: userId, is_default: true },
      });
    }

    if (!buyerAddress) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
    }

    const buyerLat = Number((buyerAddress as any).lat);
    const buyerLng = Number((buyerAddress as any).lng);

    const distance = calculateDistance(
      sellerLat,
      sellerLng,
      buyerLat,
      buyerLng,
    );

    let shipfee = 0;
    let leatime = 0;

    if (distance < 15) {
      shipfee = 20000;
      leatime = 24;
    } else if (distance >= 15 && distance <= 100) {
      shipfee = 30000;
      leatime = 36;
    } else if (distance > 100 && distance < 500) {
      shipfee = 44000;
      leatime = 72;
    } else if (distance >= 500) {
      shipfee = 55000;
      leatime = 120;
    }

    return buildResponse(APP_RESPONSE.OK, {
      ship_fee: shipfee,
      leatime,
    });
  }

  async getListOrderAddress(userId: number) {
    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const address_list = await this.addressRepository.find({
      where: { user_id: Number(userId) },
      order: { is_default: 'DESC', id: 'DESC' },
    });

    return buildResponse(APP_RESPONSE.OK, address_list);
  }

  async addOrderAddress(userId: number, query: AddOrderAddress) {
    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const { address, is_default, address_id, lng, lat } = query;

    if (is_default) {
      await this.addressRepository.update(
        { user_id: userId, is_default: true },
        { is_default: false },
      );
    }

    const newAddress = this.addressRepository.create({
      user_id: userId,
      full_address: address,
      is_default: is_default,
      ...(lat && { lat }),
      ...(lng && { lng }),
      ...(address_id && { ward_id: address_id[0] }),
    } as any);

    await this.addressRepository.save(newAddress);

    return buildResponse(APP_RESPONSE.OK, newAddress);
  }

  async editOrderAddress(
    userId: number,
    id: number,
    query: UpdateOrderAddressDto,
  ) {
    const { address: addressName, is_default, address_id, lng, lat } = query;

    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const addressUpdate = await this.addressRepository.findOne({
      where: { id: Number(id), user_id: userId },
    });

    if (!addressUpdate) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
    }

    if (is_default) {
      await this.addressRepository.update(
        { user_id: userId, is_default: true },
        { is_default: false },
      );
    }

    await this.addressRepository.update(id, {
      ...(addressName && { full_address: addressName }),
      ...(is_default !== undefined && { is_default }),
      ...(lat && { lat }),
      ...(lng && { lng }),
      ...(address_id && { ward_id: address_id[0] }),
    } as any);

    return buildResponse(APP_RESPONSE.OK);
  }

  async delete_order_address(userId: number, id: number) {
    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const address = await this.addressRepository.findOne({
      where: { id: Number(id), user_id: Number(userId) },
    });

    if (!address) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
    }

    await this.addressRepository.delete(id);

    return buildResponse(APP_RESPONSE.OK);
  }

  async get_order_status(userId: number, query: GetOrderStatusDto) {
    if (!userId) {
      return buildResponse(APP_RESPONSE.TOKEN_INVALID);
    }

    const { purchase_id } = query;

    const order = await this.orderRepository.findOne({
      where: { id: Number(purchase_id) },
      relations: [
        'items',
        'items.product',
        'shipping',
        'seller',
        'buyer',
        'statuses',
      ],
      order: {
        statuses: { id: 'DESC' },
      } as any,
    });

    if (!order) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID);
    }

    return buildResponse(APP_RESPONSE.OK, {
      id: order.id,
      ship_from: '',
      ship_to: '',
      price: order.total_price,
      ship_fee: order.shipping_fee,
      create: order.created_at,
      leatime: order.leatime,
      current_status: (order as any).statuses?.[0] || null,
      status_history: (order as any).statuses || [],
      products: (order.items || []).map((item) => ({
        id: item.product?.id,
        name: item.product?.title,
        price: item.product?.price,
        image: item.product?.image_urls || [],
        video: (item.product as any)?.videos || [],
      })),
    });
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

  private tokenInvalid(): never {
    throw new UnauthorizedException(buildResponse(APP_RESPONSE.TOKEN_INVALID));
  }

  private paramInvalid(): never {
    throw new BadRequestException(
      buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
    );
  }

  private actionDone(): never {
    throw new BadRequestException(
      buildResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
    );
  }

  private userNotExist(): never {
    throw new BadRequestException(buildResponse(APP_RESPONSE.USER_NOT_EXIST));
  }

  private productNotExist(): never {
    throw new BadRequestException(
      buildResponse(APP_RESPONSE.PRODUCT_NOT_EXISTED),
    );
  }
}