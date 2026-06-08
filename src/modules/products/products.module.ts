import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Like } from './entities/like.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Report } from './entities/report.entity';
import { ProductVariant } from './entities/product_variant.entity';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Address } from '../orders/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Comment, User, Like, Report, ProductVariant, Brand, Category, Address])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule { }
