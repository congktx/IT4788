import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order_item.entity';
import { Shipping } from './entities/shipping.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Address as OrderAddress } from './entities/address.entity';
import { Address } from '../orders/entities/address.entity';
import { Ward } from './entities/ward.entity';
import { Province } from './entities/province.entity';
import { Warehouse } from './entities/warehouse.entity';
import { OrderTimeline } from './entities/order-timeline.entity';
import { CartItem } from './entities/cart-item.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { GetListPurchasesDto } from './dto/get-list-purchases.dto';
import { GetListPurchasesSellerDto } from './dto/get_list_purchases_seller.dto';
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
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';
import { APP_RESPONSE, buildResponse } from '../constants/response.constants';
import { AddOrderAddressDto } from './dto/add_order_address.dto';
import { AddCartDto } from './dto/add-cart.dto';
import { EditCartDto } from './dto/edit-cart.dto';
import { DeleteCartDto } from './dto/delete-cart.dto';
import { INITIAL_WALLET_BALANCE } from '../../common/constants/wallet.constants';

const errorResponse = (response: { code: string; message: string }) =>
  buildResponse(response, null);

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

    @InjectRepository(OrderAddress)
    private readonly orderAddressRepository: Repository<OrderAddress>,

    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,

    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,

    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,

    @InjectRepository(OrderTimeline)
    private readonly orderTimelineRepository: Repository<OrderTimeline>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async createOrder(body: CreateOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    if (!body.items || body.items.length === 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const bodyAny = body as any;

    /**
     * Theo đặc tả:
     * order_source = 0: tạo đơn từ giỏ hàng
     * order_source = 1: tạo đơn trực tiếp từ sản phẩm
     *
     * Giữ fallback body.source để không vỡ nếu FE/mobile cũ vẫn gửi "source".
     */
    const orderSource = Number(bodyAny.order_source ?? bodyAny.source);

    if (Number.isNaN(orderSource) || (orderSource !== 0 && orderSource !== 1)) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const addressId = Number(body.address_id);

    if (Number.isNaN(addressId) || addressId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const address = await this.addressRepository.findOne({
      where: {
        id: addressId,
        user_id: buyer.id,
      },
    });

    if (!address) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const productIds = body.items.map((item) => Number(item.product_id));

    if (productIds.some((id) => Number.isNaN(id) || id <= 0)) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const uniqueProductIds = Array.from(new Set(productIds));

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.ship_from', 'ship_from')
      .where('product.id IN (:...productIds)', {
        productIds: uniqueProductIds,
      })
      .getMany();

    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PRODUCT_NOT_EXISTED),
      );
    }

    const firstSellerId = products[0].seller_id;
    const isSameSeller = products.every(
      (product) => product.seller_id === firstSellerId,
    );

    if (!isSameSeller) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    let totalPrice = 0;

    const itemPayloads = body.items.map((item) => {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (Number.isNaN(quantity) || quantity <= 0) {
        throw new BadRequestException(
          errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
        );
      }

      const product = products.find((p) => p.id === productId);

      if (!product) {
        throw new BadRequestException(
          errorResponse(APP_RESPONSE.PRODUCT_NOT_EXISTED),
        );
      }

      const itemTotal = Number(product.price) * quantity;
      totalPrice += itemTotal;

      return {
        product_id: product.id,
        quantity,
        total_price: itemTotal,
      };
    });

    const { ship_fee, leatime } = await this.calculateShipFeeForOrder(
      products[0].id,
      address.id,
      buyer.id,
    );

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        buyer_id: buyer.id,
        seller_id: firstSellerId,
        buyer_address_id: address.id,
        seller_address_id: products[0].ship_from?.id,
        status: OrderStatus.PENDING,
        total_price: totalPrice,
        shipping_fee: ship_fee,
        leatime,
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

      if (orderSource === 0) {
        await manager.delete(CartItem, {
          user_id: buyer.id,
          product_id: In(uniqueProductIds),
        });
      }

      return buildResponse(APP_RESPONSE.OK, {
        order_id: savedOrder.id,
        status: savedOrder.status,
        total_price: Number(savedOrder.total_price),
        shipping_fee: Number(savedOrder.shipping_fee),
        ship_fee: Number(savedOrder.shipping_fee),
        leatime: savedOrder.leatime,
        final_price:
          Number(savedOrder.total_price || 0) +
          Number(savedOrder.shipping_fee || 0),
        address_id: address.id,
        order_source: orderSource,
        source: orderSource,
      });
    });
  }

  async getListPurchasesSeller(
    body: GetListPurchasesSellerDto,
    userId: number,
  ) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const index = Number(body.index ?? 0);
    const count = Number(body.count ?? 10);

    if (isNaN(index) || isNaN(count) || index < 0 || count <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('order.seller_id = :sellerId', { sellerId: seller.id });

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

  async getListPurchases(body: GetListPurchasesDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const index = Number(body.index ?? 0);
    const count = Number(body.count ?? 10);

    if (isNaN(index) || isNaN(count) || index < 0 || count <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
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

  async getCart(userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const cartItems = await this.cartItemRepository.find({
      where: { user_id: buyer.id },
      relations: ['product', 'product.seller'],
      order: { updated_at: 'DESC', id: 'DESC' },
    });

    const shopMap = new Map<
      number,
      {
        shop_id: number;
        shop_name: string;
        shop_avatar: string;
        items: {
          cart_item_id: number;
          product_id: number;
          name: string;
          image: string;
          price: string;
          quantity: number;
          subtotal: string;
        }[];
        shop_total: string;
      }
    >();

    for (const cartItem of cartItems) {
      const product = cartItem.product;

      if (!product) {
        continue;
      }

      const seller = product.seller;
      const shopId = product.seller_id;
      const price = Number(product.price || 0);
      const subtotal = price * cartItem.quantity;

      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, {
          shop_id: shopId,
          shop_name: seller?.fullname || seller?.username || '',
          shop_avatar: seller?.avatar || '',
          items: [],
          shop_total: '0',
        });
      }

      const shop = shopMap.get(shopId)!;

      shop.items.push({
        cart_item_id: cartItem.id,
        product_id: product.id,
        name: product.title || '',
        image: this.getFirstImage(product.image_urls),
        price: this.formatMoney(price),
        quantity: cartItem.quantity,
        subtotal: this.formatMoney(subtotal),
      });

      shop.shop_total = this.formatMoney(Number(shop.shop_total) + subtotal);
    }

    return buildResponse(APP_RESPONSE.OK, Array.from(shopMap.values()));
  }

  async addCart(userId: number, body: AddCartDto) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const product = await this.productRepository.findOne({
      where: { id: Number(body.product_id) },
    });

    if (!product) {
      return buildResponse(APP_RESPONSE.PRODUCT_NOT_EXISTED, null);
    }

    let cartItem = await this.cartItemRepository.findOne({
      where: {
        user_id: buyer.id,
        product_id: product.id,
      },
    });

    if (cartItem) {
      cartItem.quantity += Number(body.quantity);
    } else {
      cartItem = this.cartItemRepository.create({
        user_id: buyer.id,
        product_id: product.id,
        quantity: Number(body.quantity),
      });
    }

    const savedCartItem = await this.cartItemRepository.save(cartItem);
    const subtotal = Number(product.price || 0) * savedCartItem.quantity;

    return buildResponse(APP_RESPONSE.OK, {
      cart_item_id: savedCartItem.id,
      product_id: savedCartItem.product_id,
      quantity: savedCartItem.quantity,
      subtotal: this.formatMoney(subtotal),
    });
  }

  async editCart(userId: number, body: EditCartDto) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const cartItem = await this.cartItemRepository.findOne({
      where: {
        id: Number(body.cart_item_id),
        user_id: buyer.id,
      },
      relations: ['product'],
    });

    if (!cartItem || !cartItem.product) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
    }

    cartItem.quantity = Number(body.quantity);
    const savedCartItem = await this.cartItemRepository.save(cartItem);
    const subtotal =
      Number(cartItem.product.price || 0) * savedCartItem.quantity;

    return buildResponse(APP_RESPONSE.OK, {
      cart_item_id: savedCartItem.id,
      quantity: savedCartItem.quantity,
      subtotal: this.formatMoney(subtotal),
    });
  }

  async deleteCart(userId: number, body: DeleteCartDto) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const cartItem = await this.cartItemRepository.findOne({
      where: {
        id: Number(body.cart_item_id),
        user_id: buyer.id,
      },
    });

    if (!cartItem) {
      return buildResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID, null);
    }

    await this.cartItemRepository.delete(cartItem.id);

    return buildResponse(APP_RESPONSE.OK, null);
  }

  async findAll() {
    return await this.orderAddressRepository.find();
  }

  async getShipFrom(query: GetShipFromQueryDto) {
    const { level, index, count, parent_id } = query;
    const leveldefault = level ?? 2;
    if (index === undefined || count === undefined || parent_id === undefined) {
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }

    const levelNum = Number(leveldefault);
    const indexNum = Number(index);
    const countNum = Number(count);
    const parentIdNum = Number(parent_id);

    if (
      isNaN(indexNum) ||
      isNaN(countNum) ||
      isNaN(parentIdNum) ||
      isNaN(levelNum)
    ) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    if (indexNum < 0 || countNum <= 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
    if (!parentIdNum) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    if (leveldefault == 1) {
      const province = await this.provinceRepository.findOne({
        where: { id: Number(parent_id) },
      });
      if (!province) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
    } else {
      const ward = await this.wardRepository.findOne({
        where: { id: Number(parent_id) },
      });
      if (!ward) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
    }
    if (index < 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
    const queryBuilder =
      this.warehouseRepository.createQueryBuilder('warehouse');
    if (leveldefault == 1) {
      queryBuilder
        .innerJoin('warehouse.ward', 'ward')
        .where('ward.provinces_id = :provinceId', { provinceId: parentIdNum });
    } else {
      queryBuilder.where('warehouse.ward_id = :wardId', {
        wardId: parentIdNum,
      });
    }

    const offset = indexNum * countNum;
    const [warehouses] = await queryBuilder
      .skip(offset)
      .take(count)
      .getManyAndCount();
    const list_address = warehouses.map((wh) => ({
      id: wh.id.toString(),
      name: wh.warehouse_name,
      pick_support: wh.pick_support ? '1' : '0',
      message_pick_support: wh.pick_support ? '1-Có' : '0-Không',
    }));
    return buildResponse(APP_RESPONSE.OK, list_address);
  }

  async getShipFee(user_id: number, query: GetShipFeeDto) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }

    const { product_id, address_id } = query;

    if (product_id === undefined || product_id === null) {
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }

    const productIdNum = Number(product_id);

    if (Number.isNaN(productIdNum) || productIdNum <= 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const product = await this.productRepository.findOne({
      where: { id: productIdNum },
      relations: ['ship_from'],
    });

    if (!product || !product.ship_from) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    let addressIdNum: number | null = null;

    if (address_id !== undefined && address_id !== null) {
      addressIdNum = Number(address_id);

      if (Number.isNaN(addressIdNum)) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (addressIdNum <= 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
    }

    let buyerAddress: OrderAddress | null = null;

    if (addressIdNum !== null) {
      buyerAddress = await this.orderAddressRepository.findOne({
        where: {
          id: addressIdNum,
          user_id,
        },
      });
    } else {
      buyerAddress = await this.orderAddressRepository.findOne({
        where: {
          user_id,
          is_default: true,
        },
      });
    }

    if (!buyerAddress) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const sellerLat = Number(product.ship_from.lat);
    const sellerLng = Number(product.ship_from.lng);
    const buyerLat = Number(buyerAddress.lat);
    const buyerLng = Number(buyerAddress.lng);

    if (
      Number.isNaN(sellerLat) ||
      Number.isNaN(sellerLng) ||
      Number.isNaN(buyerLat) ||
      Number.isNaN(buyerLng)
    ) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const distance = calculateDistance(
      sellerLat,
      sellerLng,
      buyerLat,
      buyerLng,
    );

    const { ship_fee, leatime } = this.calculateShipFeeByDistance(distance);

    return buildResponse(APP_RESPONSE.OK, {
      ship_fee,
      shipping_fee: ship_fee,
      leatime,
      distance,
    });
  }

  async getListOrderAddress(user_id: number) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }
    const address_list = await this.orderAddressRepository.find({
      where: { user_id: Number(user_id) },
      order: { is_default: 'DESC', id: 'DESC' },
    });
    return buildResponse(APP_RESPONSE.OK, address_list);
  }

  async addOrderAddress(user_id: number, query: AddOrderAddressDto) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }

    if (!query) {
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }

    const {
      address,
      is_default,
      address_id,
      lng,
      lat,
      receiver_name,
      phone,
      full_address,
      address_detail,
    } = query;

    if (!Array.isArray(address_id) || address_id.length < 2) {
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }

    const [ward_id, province_id] = address_id;

    if (!ward_id || !province_id) {
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }

    const wardIdNum = Number(ward_id);
    const provinceIdNum = Number(province_id);

    if (
      Number.isNaN(wardIdNum) ||
      Number.isNaN(provinceIdNum) ||
      wardIdNum <= 0 ||
      provinceIdNum <= 0
    ) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return APP_RESPONSE.PARAMETER_TYPE_INVALID;
    }

    const ward = await this.wardRepository.findOne({
      where: {
        id: wardIdNum,
        provinces_id: provinceIdNum,
      },
    });

    if (!ward) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    if (is_default) {
      await this.orderAddressRepository.update(
        { user_id, is_default: true },
        { is_default: false },
      );
    }

    const new_address = this.orderAddressRepository.create({
      user_id,
      address_name: address,
      is_default,
      ward_id: wardIdNum,
      lat: Number(lat),
      lng: Number(lng),
      address_detail,
      receiver_name,
      phone,
      full_address,
    });

    await this.orderAddressRepository.save(new_address);

    return buildResponse(APP_RESPONSE.OK, new_address);
  }

  async editOrderAddress(
    user_id: number,
    id: number,
    query: UpdateOrderAddressDto,
  ) {
    if (isNaN(Number(id))) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    const {
      address: address_name,
      is_default,
      address_id,
      lng,
      lat,
      phone,
      full_address,
      receiver_name,
      address_detail,
    } = query;
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }
    const address = query.address;

    if (address_id !== undefined) {
      if (!Array.isArray(address_id) || address_id.length < 1) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      const [ward_id, province_id] = address_id;
      if (!ward_id && !province_id) return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
    }
    if (
      (typeof lat !== 'number' && lat !== undefined) ||
      (typeof lng !== 'number' && lng !== undefined) ||
      (typeof receiver_name === 'number' && receiver_name !== undefined) ||
      (Array.isArray(phone) && phone !== undefined) ||
      (typeof full_address === 'number' && full_address !== undefined) ||
      (Array.isArray(address_detail) && address_detail !== undefined) ||
      (typeof is_default === 'string' && is_default !== undefined)
    )
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    if (typeof address === 'number' && address !== undefined)
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    const addressUpdate = await this.orderAddressRepository.findOne({
      where: { id: Number(id), user_id },
    });
    if (!addressUpdate) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
    if (address_id !== undefined && address_id.length > 0) {
      const newWardId = Number(address_id[0]);

      const ward = await this.wardRepository.findOne({
        where: { id: Number(address_id[0]) },
      });
      if (!ward) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      if (
        addressUpdate.ward_id === newWardId &&
        addressUpdate.address_name === address_name
      ) {
        return APP_RESPONSE.ACTION_DONE_PREVIOUSLY;
      }
    }

    if (is_default) {
      await this.orderAddressRepository.update(
        { user_id, is_default: true },
        { is_default: false },
      );
    }
    await this.orderAddressRepository.update(id, {
      ...(address_name && { address_name }),
      ...(is_default !== undefined && { is_default }),
      ...(address_id && { ward_id: address_id[0] }),
      ...(lat && { lat }),
      ...(lng && { lng }),
      ...(phone && { phone }),
      ...(full_address && { full_address }),
      ...(receiver_name && { receiver_name }),
      ...(address_detail && { address_detail }),
    });
    return APP_RESPONSE.OK;
  }

  async delete_order_address(user_id: number, id: number) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }

    const userId = Number(user_id);
    const addressId = Number(id);

    if (Number.isNaN(addressId) || addressId <= 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const address = await this.orderAddressRepository.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
    });

    if (!address) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const usedByOrder = await this.orderRepository.count({
      where: [
        { buyer_address_id: addressId },
        { seller_address_id: addressId },
      ],
    });

    const usedByProduct = await this.productRepository.count({
      where: {
        ship_from_id: addressId,
      },
    });

    if (usedByOrder > 0 || usedByProduct > 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(OrderAddress, {
          id: addressId,
          user_id: userId,
        });

        if (address.is_default) {
          const nextDefaultAddress = await manager.findOne(OrderAddress, {
            where: {
              user_id: userId,
            },
            order: {
              id: 'DESC',
            },
          });

          if (nextDefaultAddress) {
            await manager.update(
              OrderAddress,
              { id: nextDefaultAddress.id },
              { is_default: true },
            );
          }
        }
      });

      return APP_RESPONSE.OK;
    } catch (error) {
      console.error('delete_order_address error:', error);
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
  }

  async get_order_status(user_id: number, query: GetOrderStatusDto) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }
    const { purchase_id } = query;
    const purchase = await this.orderRepository.findOne({
      where: { id: Number(purchase_id) },
    });
    if (!purchase) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
    const order = await this.orderRepository.findOne({
      where: { id: Number(purchase_id) },
      relations: [
        'statuses',
        'items',
        'items.product',
        'shipping',
        'seller_address',
        'seller_address.ward',
        'seller_address.ward.province',
        'buyer_address',
        'buyer_address.ward',
        'buyer_address.ward.province',
      ],
      order: {
        statuses: { id: 'DESC' },
      },
    });
    if (!order) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }
    const selleraddress = order.seller_address;
    const full_addr_seller = `${selleraddress.address_name}, ${selleraddress.ward?.name || ''}, ${selleraddress.ward?.province?.name || ''}`;

    const buyeraddress = order.buyer_address;
    const full_addr_buyer = `${buyeraddress.address_name}, ${buyeraddress.ward?.name || ''}, ${buyeraddress.ward?.province?.name || ''}`;

    return buildResponse(APP_RESPONSE.OK, {
      id: order.id,
      ship_from: full_addr_seller,
      ship_to: full_addr_buyer,
      price: order.total_price,
      ship_fee: order.shipping_fee,
      create: order.created_at,
      leatime: order.leatime,
      current_status: order.statuses[0],
      status_history: order.statuses,
      products: order.items.map((item) => ({
        id: item.product.id,
        name: item.product.title,
        price: item.product.price,
        image: item.product.image_urls || [],
        video: item.product.videos || [],
      })),
    });
  }

  private calculateShipFeeByDistance(distance: number) {
    let ship_fee = 0;
    let leatime = 0;

    if (distance < 15) {
      ship_fee = 20000;
      leatime = 24;
    } else if (distance >= 15 && distance <= 100) {
      ship_fee = 30000;
      leatime = 36;
    } else if (distance > 100 && distance < 500) {
      ship_fee = 44000;
      leatime = 72;
    } else {
      ship_fee = 55000;
      leatime = 120;
    }

    return { ship_fee, leatime };
  }

  private async calculateShipFeeForOrder(
    productId: number,
    buyerAddressId: number,
    userId: number,
  ) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['ship_from'],
    });

    if (!product || !product.ship_from) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const buyerAddress = await this.orderAddressRepository.findOne({
      where: {
        id: buyerAddressId,
        user_id: userId,
      },
    });

    if (!buyerAddress) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const sellerLat = Number(product.ship_from.lat);
    const sellerLng = Number(product.ship_from.lng);
    const buyerLat = Number(buyerAddress.lat);
    const buyerLng = Number(buyerAddress.lng);

    if (
      Number.isNaN(sellerLat) ||
      Number.isNaN(sellerLng) ||
      Number.isNaN(buyerLat) ||
      Number.isNaN(buyerLng)
    ) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const distance = calculateDistance(
      sellerLat,
      sellerLng,
      buyerLat,
      buyerLng,
    );

    return this.calculateShipFeeByDistance(distance);
  }

  async getProvinces() {
    const provinces = await this.provinceRepository.find({
      order: { name: 'ASC' },
    });

    return buildResponse(
      APP_RESPONSE.OK,
      provinces.map((province) => ({
        id: province.id,
        name: province.name,
      })),
    );
  }

  async getWardsByProvince(provinceId: number) {
    const provinceIdNum = Number(provinceId);

    if (Number.isNaN(provinceIdNum) || provinceIdNum <= 0) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const province = await this.provinceRepository.findOne({
      where: { id: provinceIdNum },
    });

    if (!province) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    const wards = await this.wardRepository.find({
      where: { provinces_id: provinceIdNum },
      order: { name: 'ASC' },
    });

    return buildResponse(
      APP_RESPONSE.OK,
      wards.map((ward) => ({
        id: ward.id,
        name: ward.name,
        province_id: ward.provinces_id,
      })),
    );
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

  private formatMoney(value: number): string {
    return Number(value || 0).toString();
  }

  async getPurchase(body: GetPurchaseDto, userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.seller', 'seller')
      .leftJoinAndSelect('order.shipping', 'shipping')
      .where('order.id = :purchaseId', { purchaseId })
      .andWhere(
        '(order.buyer_id = :userId OR order.seller_id = :userId)',
        { userId: user.id },
      )
      .getOne();

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
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

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
      relations: ['shipping'],
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    let updatedAddress: Address | null = null;

    if (body.address_id) {
      const addressId = Number(body.address_id);

      if (isNaN(addressId) || addressId <= 0) {
        throw new BadRequestException(
          errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
        );
      }

      const address = await this.addressRepository.findOne({
        where: {
          id: addressId,
          user_id: buyer.id,
        },
      });

      if (!address) {
        throw new BadRequestException(
          errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
        );
      }

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

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.id);

    if (Number.isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        order.status = OrderStatus.CANCELLED;
        order.cancel_reason = body.reason ?? null;
        await manager.save(Order, order);

        let wallet = await manager.findOne(Wallet, {
          where: { user_id: buyer.id },
        });

        if (!wallet) {
          wallet = manager.create(Wallet, {
            user_id: buyer.id,
            balance: INITIAL_WALLET_BALANCE,
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
          note: body.reason ?? 'Buyer cancelled order',
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
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  async setAcceptBuyer(body: SetAcceptBuyerDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
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
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new BadRequestException(errorResponse(APP_RESPONSE.USER_NOT_EXIST));
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    order.status =
      isAccept === 1 ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.orderRepository.save(order);

    await this.addTimeline(
      order.id,
      order.status,
      isAccept === 1 ? 'Seller accepted order' : 'Seller rejected order',
    );

    return APP_RESPONSE.OK;
  }

  async buyerConfirmReceived(body: BuyerConfirmReceivedDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    order.status = OrderStatus.DELIVERED;
    await this.orderRepository.save(order);
    await this.addTimeline(
      order.id,
      OrderStatus.DELIVERED,
      'Buyer confirmed received',
    );

    return APP_RESPONSE.OK;
  }

  async refundOrder(body: RefundOrderDto, userId: number) {
    const buyer = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!buyer) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.purchase_id);

    if (isNaN(purchaseId) || purchaseId <= 0) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyer.id,
      },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    return this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.REFUNDED;
      order.refund_reason = body.reason ?? null;

      await manager.save(Order, order);

      let wallet = await manager.findOne(Wallet, {
        where: { user_id: buyer.id },
      });

      if (!wallet) {
        wallet = manager.create(Wallet, {
          user_id: buyer.id,
          balance: INITIAL_WALLET_BALANCE,
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
        description: `Refund for order #${order.id}`,
      });

      await manager.save(Transaction, transaction);

      const timeline = manager.create(OrderTimeline, {
        order_id: order.id,
        status: OrderStatus.REFUNDED,
        note: body.reason ?? 'Refund requested',
      });

      await manager.save(OrderTimeline, timeline);

      return APP_RESPONSE.OK;
    });
  }

  async sellerMarkAsShipped(body: SellerMarkAsShippedDto, userId: number) {
    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new UnauthorizedException(
        errorResponse(APP_RESPONSE.TOKEN_INVALID),
      );
    }

    const purchaseId = Number(body.purchase_id);
    const buyerId = Number(body.buyer_id);

    if (
      isNaN(purchaseId) ||
      purchaseId <= 0 ||
      isNaN(buyerId) ||
      buyerId <= 0
    ) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new BadRequestException(errorResponse(APP_RESPONSE.USER_NOT_EXIST));
    }

    const order = await this.orderRepository.findOne({
      where: {
        id: purchaseId,
        buyer_id: buyerId,
        seller_id: seller.id,
      },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.ACTION_DONE_PREVIOUSLY),
      );
    }

    order.status = OrderStatus.SHIPPING;
    await this.orderRepository.save(order);
    await this.addTimeline(
      order.id,
      OrderStatus.SHIPPING,
      'Seller marked as shipped',
    );

    return APP_RESPONSE.OK;
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
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const order = await this.orderRepository.findOne({
      where: { id: purchaseId },
    });

    if (!order) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

    const isRelated = order.buyer_id === userId || order.seller_id === userId;

    if (!isRelated) {
      throw new BadRequestException(
        errorResponse(APP_RESPONSE.PARAMETER_VALUE_INVALID),
      );
    }

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
}

export { OrdersService as OrderService };
