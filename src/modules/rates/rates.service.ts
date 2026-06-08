import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rate } from './entities/rate.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserExists(userId: number) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id'])
      .where('user.id = :id', { id: userId })
      .getRawOne();

    return user;
  }

  async getRates(
    userId: number,
    index: number,
    count: number,
    level?: number,
    productId?: number,
    purchaseId?: number,
  ) {
    const qb = this.rateRepository
      .createQueryBuilder('rate')
      .leftJoin(User, 'reviewer', 'reviewer.id = rate.reviewer_id')
      .select([
        'rate.id AS id',
        'reviewer.username AS username',
        'reviewer.avatar AS avatar',
        'rate.content AS content',
        'rate.level AS level',
        'rate.product_id AS product_id',
        'rate.purchase_id AS purchase_id',
        'rate.created_at AS created',
      ])
      .where('rate.user_id = :userId', { userId });

    if (level !== undefined && level !== 0) {
      qb.andWhere('rate.level = :level', { level });
    }

    if (productId !== undefined) {
      qb.andWhere('rate.product_id = :productId', { productId });
    }

    if (purchaseId !== undefined) {
      qb.andWhere('rate.purchase_id = :purchaseId', { purchaseId });
    }

    const data = await qb
      .orderBy('rate.created_at', 'DESC')
      .offset(index)
      .limit(count)
      .getRawMany();

    return data;
  }

  async setRate(
    userId: number,
    reviewerId: number,
    level: number,
    content: string,
    productId?: number,
    purchaseId?: number,
    ) {
    const rate = this.rateRepository.create({
        user_id: userId,
        reviewer_id: reviewerId,
        level,
        content,
        product_id: productId,
        purchase_id: purchaseId,
    });

    return await this.rateRepository.save(rate);
  }
}