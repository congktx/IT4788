import { Module } from '@nestjs/common';
import { ProductService } from './products.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product_variant.entity';
import { OrderItem } from '../orders/entities/order_item.entity';
import { User } from '../users/entities/user.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, OrderItem, User]),
  ],
  providers: [ProductService],
  controllers: [ProductController],
})
export class productModule {}
