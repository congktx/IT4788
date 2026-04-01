import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create_product.dto';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariant } from './entities/product_variant.entity';
import { CreateProductVariantDto } from './dto/create_productVariants.dto';
import { RESPONSE_CODE } from './constants';
import { UpdateProductDto } from './dto/update_product.dto';
import { GetUserListingsDto } from './dto/get_user_listing.dto';
import { User } from '../users/entities/user.entity';
import { url } from 'inspector';
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  //add_product
  async create(dto: CreateProductDto, user_id: number) {
    try {
      const variants = dto.variants;
      const isInvalidVariant = variants.some(
        (v) => typeof v.stock !== 'number',
      );
      if (!user_id) {
        return RESPONSE_CODE.TOKEN_INVALID;
      }
      if (
        !dto.title ||
        !dto.price ||
        !dto.category_id ||
        !dto.variants ||
        !dto.ship_from_id
      ) {
        return RESPONSE_CODE.PARAM_MISSING;
      }
      if (typeof dto.price !== 'number' || isInvalidVariant) {
        return RESPONSE_CODE.PARAM_TYPE_INVALID;
      }
      if (dto.price < 0) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
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
      return RESPONSE_CODE.EXCEPTION_ERROR;
    }
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepo.find(); //returning all the products
  }

  async findOne(id: number): Promise<any> {
    return await this.productRepo.findOne({
      where: { id: id },
      relations: ['variants'],
    });
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
      if (!product) return RESPONSE_CODE.PRODUCT_NOT_EXISTED;
      if (!user_id) {
        return RESPONSE_CODE.TOKEN_INVALID;
      }
      if (
        !dto.title ||
        !dto.price ||
        !dto.ship_from_id ||
        !dto.category_id ||
        !dto.variants
      )
        return RESPONSE_CODE.PARAM_MISSING;
      if (
        typeof dto.price !== 'number' ||
        typeof dto.title !== 'string' ||
        isInvalidVariant
      ) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
      }
      if (dto.price < 0) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
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
      return await this.findOne(id);
    } catch (e) {
      console.error(e);
      return RESPONSE_CODE.EXCEPTION_ERROR;
    }
  }
  //delete product
  async remove(id: number) {
    const product = await this.productRepo.findOne({
      where: { id: Number(id) },
      relations: ['variants'],
    });
    if (!product) {
      return RESPONSE_CODE.PRODUCT_NOT_EXISTED;
    }
    await this.variantRepo.delete({ product: { id: id } });
    await this.productRepo.delete(id);
    return RESPONSE_CODE.OK;
  }
  //get_user_listing
  async get_listing(user_id1: number, query: GetUserListingsDto) {
    if (!user_id1) {
      return RESPONSE_CODE.TOKEN_INVALID;
    }
    const { index, count, user_id, keyword, category_id } = query;

    const target_user_id = user_id ? Number(user_id) : user_id1;
    if (user_id) {
      const user = await this.userRepo.findOne({
        where: { id: Number(user_id) },
      });
      if (!user) {
        return RESPONSE_CODE.PARAM_VALUE_INVALID;
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
      const totalSold = p.order_items
        ? p.order_items.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0,
          )
        : 0;
      const variantsData = p.variants
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
        image: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        video: p.videos && p.videos.length > 0 ? p.videos[0] : null,
        like: p.likes ? p.likes.length.toString() : '0',
        comment: p.comments ? p.comments.length.toString() : '0',
        buyer_num: totalSold.toString(),
        variants: variantsData,
      };
    });
    return {
      code: 1000,
      message: 'OK',
      data: data,
    };
  }
}
