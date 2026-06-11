import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
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
import { Address } from '../orders/entities/address.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { CartItem } from './entities/cart-item.entity';

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
      CartItem,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
