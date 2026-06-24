import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { DevToken } from '../dev_tokens/entities/dev-token.entity';
import { getApps } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
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
import { UserBlock } from '../blocks/entities/user-block.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductsSearchService } from './products-search.service';

@Injectable()
export class ProductsService implements OnModuleInit {
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

    @InjectRepository(UserBlock)
    private readonly userBlockRepo: Repository<UserBlock>,

    @InjectRepository(DevToken)
    private readonly devTokenRepo: Repository<DevToken>,

    private readonly notificationsService: NotificationsService,
    private readonly productsSearchService: ProductsSearchService,
  ) {}

  private async sendPushNotification(userId: number, title?: string, body?: string, data?: any) {
    try {
      if (!getApps().length) return;

      const tokens = await this.devTokenRepo.find({
        where: { user_id: userId, is_active: true }
      });

      if (tokens.length === 0) return;

      const deviceTokens = tokens.map(t => t.devtoken);
      
      const message: MulticastMessage = {
        tokens: deviceTokens,
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
      };

      if (title || body) {
        message.notification = {
          title: title || '',
          body: body || '',
        };
      }
      
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`FCM notification sent to user ${userId}, success: ${response.successCount}, failure: ${response.failureCount}`);
    } catch (error) {
      console.error(`Failed to send FCM notification to user ${userId}:`, error);
    }
  }

  async onModuleInit() {
    try {
      await this.productsSearchService.createIndex();
      console.log('Elasticsearch index initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Elasticsearch index:', err);
    }
  }

  async isUserBlockedWithSeller(currentUserId?: number, sellerId?: number) {
    if (!currentUserId || !sellerId) return false;
    if (currentUserId === sellerId) return false;

    const block = await this.userBlockRepo.findOne({
      where: [
        { blocker_id: currentUserId, blocked_id: sellerId },
        { blocker_id: sellerId, blocked_id: currentUserId },
      ],
    });

    return !!block;
  }

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

      if (dto.image_urls !== undefined) {
        if (!Array.isArray(dto.image_urls)) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        if (dto.image_urls.length > 4) {
          return APP_RESPONSE.MAXIMUM_NUMBER_OF_IMAGES;
        }
      }
      const finalImage = [...(dto.image_urls || [])];
      const hasDuplicateImages = new Set(finalImage).size !== finalImage.length;

      if (hasDuplicateImages) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      if (dto.price < 0) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }

      if (dto.variants.length === 0) {
        return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }
      if (dto.videos !== undefined) {
        if (!Array.isArray(dto.videos)) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        const invalidVideo = dto.videos.some((v) => {
          return !v.url;
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

      if (dto.brand_id !== undefined) {
        const brand = await this.brandRepo.findOne({
          where: { id: dto.brand_id },
        });
        if (!brand) {
          return APP_RESPONSE.PARAMETER_VALUE_INVALID;
        }
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
          id: undefined,
          product: product,
        }),
      );

      await this.variantRepo.save(variantEntities);

      // Index to Elasticsearch
      this.productsSearchService.indexProduct(product).catch((err) => {
        console.error('Failed to index new product to Elasticsearch:', err);
      });

      const { title, ...restProduct } = product;
      return {
        code: '1000',
        message: 'OK.',
        data: { ...restProduct, name: title },
      };
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

      if (dto.price_discount !== undefined) {
        if (dto.price !== undefined) {
          if (dto.price < dto.price_discount) {
            return APP_RESPONSE.PARAMETER_VALUE_INVALID;
          }
        } else {
          if (dto.price_discount > product.price) {
            return APP_RESPONSE.PARAMETER_VALUE_INVALID;
          }
        }
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
          return !v.url;
        });
        if (invalidVideo) return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
      }
      if (dto.variants !== undefined) {
        if (!Array.isArray(dto.variants) || dto.variants.length === 0) {
          return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
        }

        const isInvalidVariant = dto.variants.some((v) => {
          return (
            (v.id !== undefined && typeof v.id !== 'number') ||
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

      if (dto.brand_id !== undefined) {
        const brand = await this.brandRepo.findOne({
          where: { id: dto.brand_id },
        });
        if (!brand) {
          return APP_RESPONSE.PARAMETER_VALUE_INVALID;
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

      const imageUrlsDel = dto.image_urls_del;
      if (imageUrlsDel !== undefined) {
        if (
          !Array.isArray(dto.image_urls_del) ||
          dto.image_urls_del.some((i) => typeof i !== 'string')
        ) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        const invalidDelete = dto.image_urls_del.some(
          (img) => !finalImages.includes(img),
        );
        if (invalidDelete) return APP_RESPONSE.PARAMETER_VALUE_INVALID;
        finalImages = finalImages.filter((url) => !imageUrlsDel.includes(url));
      }
      if (dto.image_urls !== undefined) {
        if (
          !Array.isArray(dto.image_urls) ||
          dto.image_urls.some((i) => typeof i !== 'string')
        ) {
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        }
        finalImages = finalImages = [...finalImages, ...dto.image_urls];
      }
      const hasDuplicateImages =
        new Set(finalImages).size !== finalImages.length;

      if (hasDuplicateImages) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
      }
      if (finalImages.length > 4) {
        return APP_RESPONSE.MAXIMUM_NUMBER_OF_IMAGES;
      }

      const finalVideos =
        dto.videos !== undefined ? dto.videos : product.videos || [];

      const hasVideos = finalVideos.length > 0;
      if (finalImages.length > 0 && hasVideos) {
        return APP_RESPONSE.PARAMETER_VALUE_INVALID;
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
        if (!Array.isArray(dto.variants))
          return APP_RESPONSE.PARAMETER_TYPE_INVALID;
        for (const v of dto.variants) {
          if (v.id !== undefined) {
            const variant = await this.variantRepo.findOne({
              where: { id: Number(v.id), product: { id: Number(id) } },
            });
            if (!variant) {
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

      const updateProduct = await this.getProductById(id, true);
      if (!updateProduct) {
        return APP_RESPONSE.PRODUCT_NOT_EXISTED;
      }

      // Update index in Elasticsearch
      this.productsSearchService.indexProduct(updateProduct).catch((err) => {
        console.error('Failed to index updated product to Elasticsearch:', err);
      });

      const { title, ...restProduct } = updateProduct;
      return {
        code: '1000',
        message: 'OK.',
        data: {
          name: title,
          ...restProduct,
        },
      };
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
      return APP_RESPONSE.PARAMETER_NOT_ENOUGH;
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
    await this.variantRepo.softDelete({ product: { id: Number(id) } });
    await this.productRepo.softDelete(id);

    // Remove from Elasticsearch
    this.productsSearchService.removeProduct(id).catch((err) => {
      console.error('Failed to remove deleted product from Elasticsearch:', err);
    });

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
          p.price_discount !== undefined && p.price_discount !== null
            ? String(p.price_discount)
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
      code: '1000',
      message: 'OK.',
      data: data,
    };
  }

  async getCategories(parentId?: number, index?: number, count?: number) {
    const qb = this.categoryRepo.createQueryBuilder('category');

    if (parentId !== undefined) {
      qb.where('category.parent_id = :parentId', { parentId });
    }

    qb.orderBy('category.sort', 'ASC').addOrderBy('category.id', 'ASC');

    if (index !== undefined && count !== undefined) {
      qb.skip(index).take(count);
    }

    return await qb.getMany();
  }

  async getListBrands(
    categoryId?: number,
    index: number = 0,
    count: number = 10,
  ) {
    const qb = this.brandRepo
      .createQueryBuilder('brand')
      .select(['brand.id', 'brand.name', 'brand.category_id']);

    if (categoryId !== undefined && categoryId !== null && categoryId !== 0) {
      qb.where('brand.category_id = :categoryId', { categoryId });
    }

    qb.orderBy('brand.id', 'ASC').skip(index).take(count);

    const rows = await qb.getMany();

    return rows.map((item) => ({
      id: item.id,
      brand_name: item.name,
    }));
  }

  //getProductById(1, true): co variants, getProductById(1): khong co
  async getProductById(id: number, withVariants = false) {
    return this.productRepo.findOne({
      where: { id },
      relations: withVariants ? ['variants'] : [],
    });
  }

  async getListProducts(query: any, authUserId?: number) {
    const {
      category_id,
      keyword,
      brand_id,
      product_size_id,
      price_min,
      price_max,
      condition,
      order,
      latitude,
      longitude,
      last_id,
      index = 0,
      count = 10,
    } = query;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('product.likes', 'likes')
      .leftJoinAndSelect('product.comments', 'comments')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category');

    if (category_id !== undefined) {
      qb.andWhere('product.category_id = :category_id', { category_id });
    }

    if (keyword !== undefined && keyword !== '') {
      qb.andWhere(
        '(product.title LIKE :keyword OR product.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (brand_id !== undefined) {
      qb.andWhere('product.brand_id = :brand_id', { brand_id });
    }

    if (product_size_id !== undefined && product_size_id !== 0) {
      qb.andWhere('variant.id = :product_size_id', { product_size_id });
    }

    if (price_min !== undefined) {
      qb.andWhere('product.price >= :price_min', { price_min });
    }

    if (price_max !== undefined) {
      qb.andWhere('product.price <= :price_max', { price_max });
    }

    if (condition !== undefined && condition !== '') {
      qb.andWhere('product.condition = :condition', { condition });
    }

    if (last_id !== undefined) {
      qb.andWhere('product.id < :last_id', { last_id });
    }

    switch (order) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'created_desc':
        qb.orderBy('product.created_at', 'DESC');
        break;
      case 'like_desc':
        qb.loadRelationCountAndMap('product.like_count', 'product.likes');
        qb.orderBy('product.like_count', 'DESC');
        break;
      case 'comment_desc':
        qb.loadRelationCountAndMap('product.comment_count', 'product.comments');
        qb.orderBy('product.comment_count', 'DESC');
        break;
      case 'discount_percent_desc':
        qb.addSelect(
          '(CASE WHEN product.price > 0 AND product.price_discount IS NOT NULL THEN ((product.price - product.price_discount) / product.price) ELSE 0 END)',
          'discount_percent_value',
        );
        qb.orderBy('discount_percent_value', 'DESC');
        break;
      case 'discount_value_desc':
        qb.addSelect(
          '(CASE WHEN product.price_discount IS NOT NULL THEN (product.price - product.price_discount) ELSE 0 END)',
          'discount_value',
        );
        qb.orderBy('discount_value', 'DESC');
        break;
      case 'distance_asc':
        // Chưa có cột lat/lng của product/shop để tính đúng khoảng cách.
        // Tạm fallback theo newest.
        qb.orderBy('product.id', 'DESC');
        break;
      default:
        qb.orderBy('product.id', 'DESC');
        break;
    }

    qb.skip(index).take(count);

    const products = await qb.getMany();

    return products.map((p) => {
      const likeCount = p.likes ? p.likes.length : 0;
      const commentCount = p.comments ? p.comments.length : 0;
      const variants = p.variants || [];
      const isStock = variants.some((v: any) => Number(v.stock) > 0);
      const isLiked =
        p.likes?.some((like: any) => Number(like.user_id) === Number(authUserId)) ?? false;

      return {
        id: String(p.id),
        name: p.title || '',
        price: p.price ? String(p.price) : '0',
        price_new:
          p.price_discount !== undefined && p.price_discount !== null
            ? String(p.price_discount)
            : '0',
        image: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        video: p.videos && p.videos.length > 0 ? p.videos[0] : null,
        like: String(likeCount),
        comment: String(commentCount),
        is_liked: isLiked,
        is_stock: isStock,
        brand: p.brand
          ? {
              id: String(p.brand.id),
              brand_name: p.brand.name,
            }
          : null,
        category: p.category
          ? {
              id: String(p.category.id),
              name: p.category.name,
            }
          : null,
        variants: variants.map((v: any) => ({
          id: String(v.id),
          size: v.size,
          color: v.color,
          stock: String(v.stock ?? 0),
        })),
      };
    });
  }

  async getProductDetail(productId: number, authUserId?: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['seller', 'variants', 'likes', 'comments', 'category', 'brand', 'ship_from'],
    });

    if (!product) {
      return null;
    }

    let isBlocked = false;

    if (authUserId) {
      isBlocked = await this.isUserBlockedWithSeller(
        authUserId,
        product.seller_id,
      );
    }

    if (isBlocked) {
      return APP_RESPONSE.NOT_ACCESS;
    }

    const likeCount = product.likes ? product.likes.length : 0;
    const commentCount = product.comments ? product.comments.length : 0;

    const isLiked =
      product.likes?.some((like: any) => like.user_id === authUserId) ?? false;

    const canEdit = product.seller_id === authUserId;

    return {
      id: String(product.id),
      name: product.title || '',
      price: product.price ? String(product.price) : '0',
      described: product.description || '',
      created: product.created_at,
      like: String(likeCount),
      comment: String(commentCount),
      is_liked: isLiked,
      image: product.image_urls || [],
      video: [],
      size: (product.variants || []).map((v: any) => ({
        id: String(v.id),
        size: v.size,
        color: v.color,
        stock: String(v.stock ?? 0),
        weight: v.weight ? String(v.weight) : '0',
      })),
      brand: product.brand
        ? {
            id: String(product.brand.id),
            brand_name: product.brand.name,
          }
        : product.brand_id !== undefined && product.brand_id !== null
          ? {
              id: String(product.brand_id),
              brand_name: String(product.brand_id),
            }
          : null,
      seller: product.seller
        ? {
            id: String(product.seller.id),
            username: product.seller.username || '',
            avatar: product.seller.avatar || '',
            fullname: product.seller.fullname || '',
          }
        : null,
      category: product.category
        ? {
            id: String(product.category.id),
            name: product.category.name,
            parent_id: product.category.parent_id ?? 0,
          }
        : null,
      ships_from: product.ship_from?.full_address || '',
      can_edit: canEdit,
      best_offers: [],
      messages: [],
    };
  }

  async getCommentsProduct(productId: number, index: number, count: number) {
    return await this.commentRepo
      .createQueryBuilder('comment')
      .leftJoin(User, 'user', 'user.id = comment.user_id')
      .select([
        'comment.id AS id',
        'comment.product_id AS product_id',
        'comment.user_id AS user_id',
        'comment.content AS content',
        'comment.created_at AS created_at',
        'user.username AS username',
        'user.avatar AS avatar',
      ])
      .where('comment.product_id = :productId', { productId })
      .orderBy('comment.created_at', 'DESC')
      .offset(index)
      .limit(count)
      .getRawMany();
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
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const comment = this.commentRepo.create({
      product_id: productId,
      user_id: userId,
      content,
    });

    await this.commentRepo.save(comment);

    if (product.seller_id !== userId) {
      const notificationResponse = await this.notificationsService.addNotification(userId, {
        type: 'comment_product',
        object_id: product.id,
        title: `Có người vừa bình luận sản phẩm "${product.title}" của bạn`,
        user_id: product.seller_id,
      });

      let notificationIdStr = '';
      if (notificationResponse.code == '1000' && notificationResponse.data) {
        notificationIdStr = String(notificationResponse.data.id);
      }

      await this.sendPushNotification(
        product.seller_id,
        "Thông báo mới",
        `Có người vừa bình luận sản phẩm "${product.title}" của bạn`,
        { type: 'comment_product', object_id: String(product.id), notification_id: notificationIdStr }
      );
    }

    return await this.getCommentsProduct(productId, index, count);
  }

  async likeProduct(productId: number, userId: number) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

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

      if (product.seller_id !== userId) {
        const notificationResponse = await this.notificationsService.addNotification(userId, {
          type: 'like_product',
          object_id: product.id,
          title: `Có người vừa thích sản phẩm "${product.title}" của bạn`,
          user_id: product.seller_id,
        });

        let notificationIdStr = '';
        if (notificationResponse.code === '1000' && notificationResponse.data) {
          notificationIdStr = String(notificationResponse.data.id);
        }

        await this.sendPushNotification(
          product.seller_id,
          'Thông báo mới',
          `Có người vừa thích sản phẩm "${product.title}" của bạn`,
          {
            type: 'like_product',
            object_id: String(product.id),
            notification_id: notificationIdStr,
          },
        );
      }
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
    const existedReport = await this.reportRepo.findOne({
      where: {
        product_id: productId,
        user_id: userId,
      },
    });

    if (existedReport) {
      return APP_RESPONSE.ACTION_DONE_PREVIOUSLY;
    }

    const report = this.reportRepo.create({
      product_id: productId,
      user_id: userId,
      reason: details || subject || '',
    });

    await this.reportRepo.save(report);

    return {
      product_id: productId,
      user_id: userId,
      reason: details || subject || '',
    };
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
    if (keyword !== undefined && keyword.trim() !== '') {
      try {
        const matchedIds = await this.productsSearchService.search(
          keyword,
          categoryId,
          brandId,
          priceMin,
          priceMax,
          index,
          count,
        );

        if (matchedIds.length === 0) {
          return [];
        }

        // Fetch matched products from MySQL database
        const products = await this.productRepo.createQueryBuilder('product')
          .where('product.id IN (:...matchedIds)', { matchedIds })
          .getMany();

        // Sort products based on the relevance score order returned by Elasticsearch
        return matchedIds
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean);
      } catch (error) {
        console.error(
          'Elasticsearch search failed, falling back to database query:',
          error,
        );
      }
    }

    // Fallback or no-keyword query using MySQL database directly
    const qb = this.productRepo.createQueryBuilder('product');

    if (keyword !== undefined && keyword.trim() !== '') {
      const normalizedKeyword = keyword.trim().replace(/\s+/g, ' ');
      const compactKeyword = normalizedKeyword
        .replace(/\s+/g, '')
        .toLowerCase();
      const tokens = normalizedKeyword.toLowerCase().split(' ').filter(Boolean);

      qb.andWhere(
        `
        (
          LOWER(product.title) LIKE :rawKeyword
          OR REPLACE(LOWER(product.title), ' ', '') LIKE :compactKeyword
        )
        `,
        {
          rawKeyword: `%${normalizedKeyword.toLowerCase()}%`,
          compactKeyword: `%${compactKeyword}%`,
        },
      );

      tokens.forEach((token, idx) => {
        qb.andWhere(`LOWER(product.title) LIKE :token${idx}`, {
          [`token${idx}`]: `%${token}%`,
        });
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

    const safeIndex = Number(index) || 0;
    const safeCount = Number(count) || 10;

    const data = await qb
      .orderBy('product.id', 'DESC')
      .offset(safeIndex)
      .limit(safeCount)
      .getMany();

    return data;
  }
}
