import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Report } from './entities/report.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,

    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async getCategories() {
    const data = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category_id', 'category_id')
      .where('product.category_id IS NOT NULL')
      .orderBy('product.category_id', 'ASC')
      .getRawMany();

    return data;
  }

  async getListBrands() {
    const data = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.brand_id', 'brand_id')
      .where('product.brand_id IS NOT NULL')
      .orderBy('product.brand_id', 'ASC')
      .getRawMany();

    return data;
  }

  async getProductById(id: number) {
    const product = await this.productRepository.findOne({
        where: { id },
  });

    return product;
  }

  async getListProducts(index: number, count: number) {
    const products = await this.productRepository.find({
        order: { id: 'DESC' },
        skip: index,
        take: count,
    });

    return products;
  }

  async getCommentsProduct(productId: number, index: number, count: number) {
    const comments = await this.commentRepository.find({
        where: { product_id: productId },
        order: { created_at: 'DESC' },
        skip: index,
        take: count,
    });

    return comments;
  }

  async getUserById(id: number) {
    const user = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id'])
        .where('user.id = :id', { id })
        .getRawOne();

    return user;
  }

  async setCommentsProduct(
    productId: number,
    userId: number,
    content: string,
    index: number,
    count: number,
  ) {
    const comment = this.commentRepository.create({
        product_id: productId,
        user_id: userId,
        content,
    });

    await this.commentRepository.save(comment);

    const comments = await this.commentRepository.find({
        where: { product_id: productId },
        order: { created_at: 'DESC' },
        skip: index,
        take: count,
    });

    return comments;
  }

  async likeProduct(productId: number, userId: number) {
    const existingLike = await this.likeRepository.findOne({
        where: {
        product_id: productId,
        user_id: userId,
        },
    });

    let is_liked = false;

    if (existingLike) {
        await this.likeRepository.remove(existingLike);
        is_liked = false;
    } else {
        const newLike = this.likeRepository.create({
        product_id: productId,
        user_id: userId,
        });

        await this.likeRepository.save(newLike);
        is_liked = true;
    }

    const like_count = await this.likeRepository.count({
        where: { product_id: productId },
    });

    return {
        is_liked,
        like_count,
    };
  }

  async reportProduct(
    productId: number,
    userId: number,
    subject: string,
    details: string,
    ) {
    const reason = `[${subject}] ${details}`;

    const report = this.reportRepository.create({
        product_id: productId,
        user_id: userId,
        reason,
    });

    const savedReport = await this.reportRepository.save(report);

    return savedReport;
  }

  async searchProducts(
    keyword: string | undefined,
    categoryId: number | undefined,
    brandId: number | undefined,
    priceMin: number | undefined,
    priceMax: number | undefined,
    index: number,
    count: number,
    ) {
    const qb = this.productRepository.createQueryBuilder('product');

    if (keyword !== undefined && keyword !== '') {
        qb.andWhere('product.title LIKE :keyword', {
        keyword: `%${keyword}%`,
        });
    }

    if (categoryId !== undefined) {
        qb.andWhere('product.category_id = :categoryId', { categoryId });
    }

    if (brandId !== undefined) {
        qb.andWhere('product.brand_id = :brandId', { brandId });
    }

    if (priceMin !== undefined) {
        qb.andWhere('product.price >= :priceMin', { priceMin });
    }

    if (priceMax !== undefined) {
        qb.andWhere('product.price <= :priceMax', { priceMax });
    }

    const data = await qb
        .orderBy('product.id', 'DESC')
        .offset(index)
        .limit(count)
        .getMany();

    return data;
    }
}