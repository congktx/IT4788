import { RESPONSE_CODE } from '../products/constants';
import { Injectable } from '@nestjs/common';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Ward } from './entities/ward.entity';
import { Province } from './entities/province.entity';
import { Warehouse } from './entities/warehouse.entity';
import { GetShipFromQueryDto } from './dto/ship_from.dto';
import { GetShipFeeDto } from './dto/getshipfee.dto';
import { Product } from '../products/entities/product.entity';
import { AddOrderAddress } from './dto/add_order_address.dto';
import { UpdateOrderAddressDto } from './dto/update_order_address.dto';
import { GetOrderStatusDto } from './dto/get_order_status.dto';
import { Order } from './entities/order.entity';
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
export class OrderService {
  constructor(
    @InjectRepository(Address)
    private addressRepo: Repository<Address>,
    @InjectRepository(Ward)
    private wardRepo: Repository<Ward>,
    @InjectRepository(Province)
    private provinceRepo: Repository<Province>,
    @InjectRepository(Warehouse)
    private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async findAll() {
    return await this.addressRepo.find();
  }
  //get_ship_from
  async getShipFrom(query: GetShipFromQueryDto) {
    const { level, index, count, parent_id } = query;
    const parentIdNum = Number(parent_id);
    if (level == 1) {
      const province = await this.provinceRepo.findOne({
        where: { id: Number(parent_id) },
      });
      if (!province) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
      }
    } else {
      const ward = await this.wardRepo.findOne({
        where: { id: Number(parent_id) },
      });
      if (!ward) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
      }
    }
    const queryBuilder = this.warehouseRepo.createQueryBuilder('warehouse');
    if (level == 1) {
      queryBuilder
        .innerJoin('warehouse.ward', 'ward')
        .where('ward.provinces_id = :provinceId', { provinceId: parentIdNum });
    } else {
      queryBuilder.where('warehouse.ward_id = :wardId', {
        wardId: parentIdNum,
      });
    }
    const [warehouses, total] = await queryBuilder
      .skip(index)
      .take(count)
      .getManyAndCount();
    const list_address = warehouses.map((wh) => ({
      id: wh.id.toString(),
      name: wh.warehouse_name,
      pick_support: wh.pick_support ? '1' : '0',
      message_pick_support: wh.pick_support ? '1-Có' : '0-Không',
    }));
    return {
      code: '1000',
      message: 'OK',
      data: {
        list_address: list_address,
      },
    };
  }
  //get_ship_fee
  async getShipFee(user_id: number, query: GetShipFeeDto) {
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const { product_id, address_id } = query;

    const product = await this.productRepo.findOne({
      where: { id: Number(product_id) },
      relations: ['ship_from'],
    });
    if (!product || !product.ship_from) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }

    const sellerLat = Number(product.ship_from.lat);
    const sellerLng = Number(product.ship_from.lng);

    let buyerAddress: Address | null = null;
    if (address_id) {
      buyerAddress = await this.addressRepo.findOne({
        where: { id: Number(address_id), user_id: user_id },
      });
    } else {
      buyerAddress = await this.addressRepo.findOne({
        where: { user_id: user_id, is_default: true },
      });
    }
    if (!buyerAddress) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }

    const buyerLat = Number(buyerAddress.lat);
    const buyerLng = Number(buyerAddress.lng);

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

    return {
      code: '1000',
      message: 'OK',
      data: {
        shipfee: shipfee,
        leatime: leatime,
      },
    };
  }
  //get_list_order_address
  async getListOrderAddress(user_id: number) {
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const addressList = await this.addressRepo.find({
      where: { user_id: Number(user_id) },
      order: { is_default: 'DESC', id: 'DESC' },
    });
    return {
      code: '1000',
      message: 'OK',
      data: addressList,
    };
  }
  //add order address
  async addOrderAddress(user_id: number, query: AddOrderAddress) {
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const { address, is_default, address_id, lng, lat } = query;
    if (is_default) {
      await this.addressRepo.update(
        { user_id: user_id, is_default: true },
        { is_default: false },
      );
    }
    const newAddress = this.addressRepo.create({
      user_id: user_id,
      address_name: address,
      is_default: is_default,
      ward_id: address_id[0],
      lat: lat,
      lng: lng,
    });
    await this.addressRepo.save(newAddress);

    return {
      code: '1000',
      message: 'OK',
      data: newAddress,
    };
  }
  async editOrderAddress(
    user_id: number,
    id: number,
    query: UpdateOrderAddressDto,
  ) {
    const { address: address_name, is_default, address_id, lng, lat } = query;
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }

    const addressUpdate = await this.addressRepo.findOne({
      where: { id: Number(id), user_id: user_id },
    });
    if (!addressUpdate) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }
    if (address_id && address_id.length > 0) {
      const newWardId = Number(address_id[0]);

      if (
        addressUpdate.ward_id === newWardId &&
        addressUpdate.address_name === address_name
      ) {
        return RESPONSE_CODE.ACTION_DONE_PREVIOUS_BY_USER;
      }
      const ward = await this.wardRepo.findOne({
        where: { id: Number(address_id[0]) },
      });
      if (!ward) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
      }
    }

    if (is_default) {
      await this.addressRepo.update(
        { user_id: user_id, is_default: true },
        { is_default: false },
      );
    }
    await this.addressRepo.update(id, {
      ...(address_name && { address_name }),
      ...(is_default !== undefined && { is_default }),
      ...(address_id && { ward_id: address_id[0] }),
      ...(lat && { lat }),
      ...(lng && { lng }),
    });
    return {
      code: '1000',
      message: 'OK',
    };
  }
  //delete_order_address
  async delete_order_address(user_id: number, id: number) {
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const address = await this.addressRepo.findOne({
      where: { id: Number(id), user_id: Number(user_id) },
    });
    if (!address) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }
    await this.addressRepo.delete(id);
    return RESPONSE_CODE.OK;
  }
  //get_order_status
  async get_order_status(user_id: number, query: GetOrderStatusDto) {
    if (!user_id) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const { /*product_id,*/ purchase_id } = query;
    const purchase = await this.orderRepo.findOne({
      where: { id: Number(purchase_id) },
    });
    if (!purchase) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }
    /*const product = await this.productRepo.findOne({
      where: { id: Number(product_id) },
    });
    if (!product) {
      return RESPONSE_CODE.PRODUCT_NOT_EXISTED;
    }*/
    const order = await this.orderRepo.findOne({
      where: { id: Number(purchase_id) },
      relations: [
        'status',
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
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }
    const selleraddress = order.seller_address;
    const full_addr_seller = `${selleraddress.address_name}, ${selleraddress.ward?.name || ''}, ${selleraddress.ward?.province?.name || ''}`;

    const buyeraddress = order.buyer_address;
    const full_addr_buyer = `${buyeraddress.address_name}, ${buyeraddress.ward?.name || ''}, ${buyeraddress.ward?.province?.name || ''}`;

    return {
      code: '1000',
      message: 'OK',
      data: {
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
      },
    };
  }
}
