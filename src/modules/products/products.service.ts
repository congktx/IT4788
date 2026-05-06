import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product_variant.entity';
import { CreateProductDto } from './dto/create_product.dto';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Like } from './entities/like.entity';
import { Report } from './entities/report.entity';
import { APP_RESPONSE } from '../constants/response.constants';
import { UpdateProductDto } from './dto/update_product.dto';
import { GetUserListingsDto } from './dto/get_user_listing.dto';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Address } from '../orders/entities/address.entity';

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

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,

    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
  ) {}

  async createProduct(dto: CreateProductDto, user_id: number) {
    try {
      if (!user_id) {
        return APP_RESPONSE.TOKEN_INVALID;
      }

      const user = await this.userRepo.findOne({
        where: { id: Number(user_id) },
        select: { role: true },
      });

      if (!user) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      if (user.role !== 'seller') return APP_RESPONSE.NOT_ACCESS;
      if (
        dto.title === undefined ||
        dto.price === undefined ||
        dto.category_id === undefined ||
        dto.variants === undefined ||
        dto.ship_from_id === undefined ||
        dto.brand_id === undefined
      ) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      if (
        typeof dto.title !== 'string' ||
        typeof dto.price !== 'number' ||
        typeof dto.category_id !== 'number' ||
        typeof dto.ship_from_id !== 'number' ||
        typeof dto.brand_id !== 'number' ||
        !Array.isArray(dto.variants)
      ) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (dto.price < 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      if (dto.variants.length === 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      if (dto.videos !== undefined) {
        if (!Array.isArray(dto.videos)) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        const invalidVideo = dto.videos.some((v) => {
          return !v.url || !v.thumb;
        });
        if (invalidVideo) return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }

      const isInvalidVariant = dto.variants.some((v) => {
        return (
          typeof v.stock !== 'number' ||
          v.stock < 0 ||
          typeof v.size !== 'string' ||
          typeof v.color !== 'string' ||
          typeof v.weight !== 'number' ||
          v.weight < 0
        );
      });

      if (isInvalidVariant) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      const category = await this.categoryRepo.findOne({
        where: { id: dto.category_id },
      });
      if (!category) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      if (dto.price_new !== undefined && typeof dto.price_new !== 'number')
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      if (!dto.price_new) {
        dto.price_new = dto.price;
      }

      const brand = await this.brandRepo.findOne({
        where: { id: dto.brand_id },
      });
      if (!brand) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      const shipFrom = await this.addressRepo.findOne({
        where: { id: dto.ship_from_id, user_id },
      });
      if (!shipFrom) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      const product = await this.productRepo.save({
        ...dto,
        seller_id: user_id,
      });

      const variantEntities = dto.variants.map((v) =>
        this.variantRepo.create({
          ...v,
          product: product,
        }),
      );

      await this.variantRepo.save(variantEntities);

      return product;
    } catch (e) {
      console.error('CREATE PRODUCT ERROR:', e);
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
      if (!user_id) {
        return APP_RESPONSE.TOKEN_INVALID;
      }

      if (isNaN(Number(id)) || id <= 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      const product = await this.productRepo.findOne({
        where: { id: Number(id) },
        relations: ['variants'],
      });

      if (!product) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      if (product.seller_id !== user_id) {
        return APP_RESPONSE.NOT_ACCESS;
      }
      if (dto.title !== undefined && typeof dto.title !== 'string') {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (dto.price !== undefined && typeof dto.price !== 'number') {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (dto.price !== undefined && dto.price < 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      if (
        dto.category_id !== undefined &&
        typeof dto.category_id !== 'number'
      ) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (
        dto.ship_from_id !== undefined &&
        typeof dto.ship_from_id !== 'number'
      ) {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }

      if (dto.videos !== undefined) {
        if (!Array.isArray(dto.videos)) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        const invalidVideo = dto.videos.some((v) => {
          return !v.url || !v.thumb;
        });
        if (invalidVideo) return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }
      if (dto.variants !== undefined) {
        if (!Array.isArray(dto.variants) || dto.variants.length === 0) {
          return APP_RESPONSE.PARAMETER_VALUE_INVALID;
        }

        const isInvalidVariant = dto.variants.some((v) => {
          return (
            typeof v.stock !== 'number' ||
            v.stock < 0 ||
            typeof v.size !== 'string' ||
            typeof v.color !== 'string' ||
            typeof v.weight !== 'number' ||
            v.weight < 0
          );
        });

        if (isInvalidVariant) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
      }

      if (dto.category_id !== undefined) {
        const category = await this.categoryRepo.findOne({
          where: { id: dto.category_id },
        });
        if (!category) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      if (dto.ship_from_id !== undefined) {
        const address = await this.addressRepo.findOne({
          where: { id: dto.ship_from_id, user_id },
        });
        if (!address) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      let finalImages = [...(product.image_urls || [])];

      if (dto.image_urls !== undefined) {
        if (
          !Array.isArray(dto.image_urls) ||
          dto.image_urls.some((i) => typeof i !== 'string')
        ) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        finalImages = finalImages = [...finalImages, ...dto.image_urls];
      }

      const imageUrlsDel = dto.image_urls_del;
      if (imageUrlsDel !== undefined) {
        if (
          !Array.isArray(dto.image_urls_del) ||
          dto.image_urls_del.some((i) => typeof i !== 'string')
        ) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        finalImages = finalImages.filter((url) => !imageUrlsDel.includes(url));
      }

      const { variants, image_urls, image_urls_del, ...productUpdateData } =
        dto;

      const updatePayload: any = { ...productUpdateData };

      if (dto.image_urls !== undefined || dto.image_urls_del !== undefined) {
        updatePayload.image_urls = finalImages;
      }

      if (Object.keys(updatePayload).length > 0) {
        await this.productRepo.update(id, updatePayload);
      }

      if (dto.variants !== undefined) {
        if (!Array.isArray(variants))
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        for (const v of dto.variants) {
          if (v.id) {
            const variants = await this.variantRepo.find({
              where: { id: Number(v.id) },
            });
            if (!variants) {
              return APP_RESPONSE.PARAMETER_VALUE_INVALID;
            }

            await this.variantRepo.update(v.id, {
              size: v.size,
              stock: v.stock,
              color: v.color,
              weight: v.weight,
            });
          } else {
            await this.variantRepo.save(
              this.variantRepo.create({
                ...v,
                product: { id: Number(id) },
              }),
            );
          }
        }
      }

      return await this.getProductById(id, true);
    } catch (e) {
      console.error('UPDATE PRODUCT ERROR:', e);
      return APP_RESPONSE.EXCEPTION_ERROR;
    }
  }

  //delete product
  async remove(id: number, user_id: number) {
    if (!user_id) {
      return APP_RESPONSE.TOKEN_INVALID;
    }
    if (isNaN(Number(id))) {
      return APP_RESPONSE.PARAMETER_TYPE_INVALID;
    }
    const product = await this.productRepo.findOne({
      where: { id: Number(id) },
      relations: ['variants'],
    });
    if (!product) {
      return APP_RESPONSE.PRODUCT_NOT_EXISTED;
    }
    if (product.seller_id !== user_id) {
      return APP_RESPONSE.NOT_ACCESS;
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

    const pageIndex = Number(index);
    const pageCount = Number(count);

    if (
      !Number.isInteger(pageIndex) ||
      pageIndex < 0 ||
      !Number.isInteger(pageCount) ||
      pageCount <= 0
    ) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    }

    if (user_id !== undefined) {
      if (typeof user_id !== 'number') {
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      }
    }
    const target_user_id = user_id ?? user_id1;
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

    if (keyword !== undefined) {
      if (typeof keyword !== 'string')
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      queryBuilder.andWhere('LOWER(product.title) LIKE LOWER(:keyword)', {
        keyword: `%${keyword}%`,
      });
    }
    if (category_id !== undefined) {
      if (typeof category_id !== 'number')
        return APP_RESPONSE.PARAMETER_TYPE_INVALID;
      queryBuilder.andWhere('product.category_id = :catId', {
        catId: category_id,
      });
    }
    queryBuilder.skip(pageIndex * pageCount).take(pageCount);

    const products = await queryBuilder.getMany();

    const data = products.map((p) => {
      const is_liked = (p.likes || []).some((l) => l.user_id === user_id1);

      const is_stock = (p.variants || []).some((v) => Number(v.stock) > 0);
      const variants_data = (p.variants || []).map((v) => ({
        id: String(v.id),
        size: v.size,
        color: v.color,
        stock: String(v.stock ?? 0),
      }));
      return {
        id: p.id.toString(),
        name: p.title || '',
        price: p.price ? p.price.toString() : '0',
        price_new:
          p.price_new !== undefined && p.price_new !== null
            ? String(p.price_new)
            : '0',
        image: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        video: p.videos && p.videos.length > 0 ? p.videos[0] : null,
        like: p.likes ? p.likes.length.toString() : '0',
        comment: p.comments ? p.comments.length.toString() : '0',
        variants: variants_data,
        is_stock,
        is_liked,
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
