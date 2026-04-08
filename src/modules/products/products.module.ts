import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { ProductVariant } from './entities/product_variant.entity';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Like, ProductVariant, Product, Report])],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule { }