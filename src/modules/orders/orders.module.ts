import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrderService, OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order_item.entity';
import { Shipping } from './entities/shipping.entity';
import { Address as OrderAddress } from './entities/address.entity';
import { Ward } from './entities/ward.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Province } from './entities/province.entity';
import { Status } from './entities/status_order.entities';
import { OrderTimeline } from './entities/order-timeline.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Address } from '../addresses/entities/address.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Shipping,
      OrderAddress,
      Ward,
      Warehouse,
      Province,
      Status,
      OrderTimeline,
      Product,
      User,
      Address,
      Wallet,
      Transaction,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrderService, OrdersService],
})
export class OrdersModule {}
