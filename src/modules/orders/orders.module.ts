import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './orders.service';
import { Address } from './entities/address.entity';
import { Ward } from './entities/ward.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Province } from './entities/province.entity';
import { OrdersController } from './orders.controller';
import { Product } from '../products/entities/product.entity';
import { Order } from './entities/order.entity';
import { Status } from './entities/status_order.entities';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Address,
      Ward,
      Warehouse,
      Province,
      Product,
      Order,
      Status,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrderService],
})
export class OrderModule {}
