import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product_variant.entity';
import { CreateProductDto } from './dto/create_product.dto';
import { CreateProductVariantDto } from './dto/create_productVariants.dto';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Report } from './entities/report.entity';
import { APP_RESPONSE } from '../constants/response.constants';
import { UpdateProductDto } from './dto/update_product.dto';
import { GetUserListingsDto } from './dto/get_user_listing.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,

    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,

    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
  ) {}

  async createProduct(dto: CreateProductDto, user_id: number) {
    try {
      const variants = dto.variants;
      const isInvalidVariant = variants.some(
        (v) => typeof v.stock !== 'number',
      );
      if (!user_id) {
        return APP_RESPONSE.TOKEN_INVALID;
      }
      if (
        !dto.title ||
        !dto.price ||
        !dto.category_id ||
        !dto.variants ||
        !dto.ship_from_id
      ) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }
      if (typeof dto.price !== 'number' || isInvalidVariant) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }
      if (dto.price < 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      const { ...productData } = dto;
      const product = await this.productRepo.save({
        ...productData,
        seller_id: user_id,
      });

      const variantEntities = variants.map((v) =>
        this.variantRepo.create({
          ...v,
          product: product,
        }),
      );
      await this.variantRepo.save(variantEntities);
      return product;
    } catch (e) {
      console.error(e);
      console.log(e);
      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepo.find();
  }

  //update product
  async update(
    user_id: number,
    id: number,
    dto: UpdateProductDto,
  ): Promise<any> {
    try {
      const product = await this.productRepo.findOne({
        where: { id: Number(id) },
        relations: ['variants'],
      });
      const variants = dto.variants as CreateProductVariantDto[];
      const isInvalidVariant = variants.some(
        (v) => typeof v.stock !== 'number' || v.stock < 0,
      );
      if (!product) return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      if (!user_id) {
        return APP_RESPONSE.TOKEN_INVALID;
      }
      if (
        !dto.title ||
        !dto.price ||
        !dto.ship_from_id ||
        !dto.category_id ||
        !dto.variants
      )
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      if (
        typeof dto.price !== 'number' ||
        typeof dto.title !== 'string' ||
        isInvalidVariant
      ) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }
      if (dto.price < 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      const {
        variants: _,
        image_urls_del,
        image_urls: newImages,
        ...productUpdateData
      } = dto;
      await this.productRepo.update(id, {
        ...productUpdateData,
      });

      let currentImg = product.image_urls || [];
      if (newImages && Array.isArray(newImages)) {
        currentImg = newImages;
      }
      let finalImages = currentImg;
      if (image_urls_del && Array.isArray(image_urls_del)) {
        finalImages = currentImg.filter((url) => !image_urls_del.includes(url));
      }
      await this.productRepo.update(id, {
        ...productUpdateData,
        image_urls: finalImages,
      });
      await this.variantRepo.delete({ product: { id: id } });

      const variantEntities = variants.map((v) =>
        this.variantRepo.create({
          ...v,
          product: { id: id } as Product,
        }),
      );
      await this.variantRepo.save(variantEntities);
      return await this.getProductById(id, true);
    } catch (e) {
      console.error(e);
      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  //delete product
  async remove(id: number) {
    const product = await this.productRepo.findOne({
      where: { id: Number(id) },
      relations: ['variants'],
    });
    if (!product) {
      return APP_RESPONSE.PRODUCT_NOT_EXISTED;
    }
    await this.variantRepo.delete({ product: { id: id } });
    await this.productRepo.delete(id);
    return APP_RESPONSE.OK;
  }
  //get_user_listing
  async get_listing(user_id1: number, query: GetUserListingsDto) {
    if (!user_id1) {
      return APP_RESPONSE.TOKEN_INVALID;
    }
    const { index, count, user_id, keyword, category_id } = query;

    const target_user_id = user_id ? Number(user_id) : user_id1;
    if (user_id) {
      const user = await this.userRepo.findOne({
        where: { id: Number(user_id) },
      });
      if (!user) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
    }

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.likes', 'likes')
      .leftJoinAndSelect('product.comments', 'comments')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('product.order_items', 'order_items')
      .where('product.seller_id = :sellerId', { sellerId: target_user_id });

    if (keyword) {
      queryBuilder.andWhere('product.title LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }
    if (category_id) {
      queryBuilder.andWhere('product.category_id = :catId', {
        catId: category_id,
      });
    }
    queryBuilder.skip(index).take(count);

    const products = await queryBuilder.getMany();

    const data = products.map((p) => {
      const variants_data = p.variants
        ? p.variants.map((v) => {
            const variantSold = p.order_items
              ? p.order_items
                  .filter((item) => item.variant_id === v.id)
                  .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
              : 0;
            return {
              id: v.id.toString(),
              size: v.size,
              color: v.color,
              stock: v.stock.toString(),
              sold: variantSold.toString(),
            };
          })
        : [];
      return {
        id: p.id.toString(),
        name: p.title || '',
        price: p.price ? p.price.toString() : '0',
        price_discount: p.price_discount ? p.price_discount.toString() : '0',
        image: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        video: p.videos && p.videos.length > 0 ? p.videos[0] : null,
        like: p.likes ? p.likes.length.toString() : '0',
        comment: p.comments ? p.comments.length.toString() : '0',
        variants: variants_data,
      };
    });
    return {
      code: 1000,
      message: 'OK',
      data: data,
    };
  }

  async getCategories() {
    const data = await this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.category_id', 'category_id')
      .where('product.category_id IS NOT NULL')
      .orderBy('product.category_id', 'ASC')
      .getRawMany();

    return data;
  }

  async getListBrands() {
    const data = await this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.brand_id', 'brand_id')
      .where('product.brand_id IS NOT NULL')
      .orderBy('product.brand_id', 'ASC')
      .getRawMany();

    return data;
  }

  //getProductById(1, true): co variants, getProductById(1): khong co
  async getProductById(id: number, withVariants = false) {
    return this.productRepo.findOne({
      where: { id },
      relations: withVariants ? ['variants'] : [],
    });
  }

  async getListProducts(index: number, count: number) {
    const products = await this.productRepo.find({
      order: { id: 'DESC' },
      skip: index,
      take: count,
    });

    return products;
  }

  async getCommentsProduct(productId: number, index: number, count: number) {
    const comments = await this.commentRepo.find({
      where: { product_id: productId },
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });

    return comments;
  }

  async getUserById(id: number) {
    const user = await this.userRepo
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
    const comment = this.commentRepo.create({
      product_id: productId,
      user_id: userId,
      content,
    });

    await this.commentRepo.save(comment);

    const comments = await this.commentRepo.find({
      where: { product_id: productId },
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });

    return comments;
  }

  async likeProduct(productId: number, userId: number) {
    const existingLike = await this.likeRepo.findOne({
      where: {
        product_id: productId,
        user_id: userId,
      },
    });

    let is_liked = false;

    if (existingLike) {
      await this.likeRepo.remove(existingLike);
      is_liked = false;
    } else {
      const newLike = this.likeRepo.create({
        product_id: productId,
        user_id: userId,
      });

      await this.likeRepo.save(newLike);
      is_liked = true;
    }

    const like_count = await this.likeRepo.count({
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

    const report = this.reportRepo.create({
      product_id: productId,
      user_id: userId,
      reason,
    });

    const savedReport = await this.reportRepo.save(report);

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
    const qb = this.productRepo.createQueryBuilder('product');

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
