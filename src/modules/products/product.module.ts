import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Report } from './entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Comment, User, Like, Report])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductModule {}