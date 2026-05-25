import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Category } from '../../src/modules/products/entities/category.entity';
import { Address } from '../../src/modules/orders/entities/address.entity';
import { Brand } from '../../src/modules/products/entities/brand.entity';
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { ProductVariant } from '../../src/modules/products/entities/product_variant.entity';
import { User } from '../../src/modules/users/entities/user.entity';

describe('Products - Add Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let validCategoryId: number;
  let validShipFromId: number;
  let validBrandId: number;
  let baseURL: string | any;
  let userId: number;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    const { phone_number, password } = context;
    let loginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number, password });

    if (loginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({
          phone_number,
          password,
          uuid: 'auto-recreate-user'
        });

      loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number, password });
    }

    if (loginRes.body.code !== '1000') {
      console.error('Login failed in Product E2E setup:', loginRes.body);
    }

    accessToken = loginRes.body.data?.token;
    userId = Number(loginRes.body.data?.id);

    const categoryRepo = dataSource.getRepository(Category);
    const addressRepo = dataSource.getRepository(Address);
    const brandRepo = dataSource.getRepository(Brand);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    let category = await categoryRepo.findOne({ where: {} });
    if (!category) {
      category = await categoryRepo.save({ name: 'Dien tu', description: 'Category for testing' });
    }
    validCategoryId = category.id;

    let brand = await brandRepo.findOne({ where: {} });
    if (!brand) {
      brand = await brandRepo.save({ name: 'Apple' });
    }
    validBrandId = brand.id;

    let address = await addressRepo.findOne({ where: { user_id: userId } });
    if (!address) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) {
        province = await provinceRepo.save({ name: 'Ha Noi' });
      }

      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) {
        ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });
      }

      address = await addressRepo.save({
        user_id: userId,
        ward_id: ward.id,
        address_name: 'Home Test',
        address_detail: '123 Test St',
        lat: 21.0285,
        lng: 105.8542,
        receiver_name: 'Test Receiver',
        phone: phone_number,
        full_address: '123 Test St, Dich Vong Hau, Ha Noi'
      });
    }
    validShipFromId = address.id;

    console.log(`[TEST SETUP] Category: ${validCategoryId}, Brand: ${validBrandId}, ShipFrom: ${validShipFromId}, BaseURL: ${typeof baseURL === 'string' ? baseURL : 'local'}`);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  async function syncProductToLocalDb(serverProduct: any) {
    if (typeof baseURL !== 'string' || !baseURL.startsWith('http')) return;

    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const categoryRepo = dataSource.getRepository(Category);
    const brandRepo = dataSource.getRepository(Brand);

    let category = await categoryRepo.findOne({ where: { id: serverProduct.category_id } });
    if (!category && serverProduct.category_id) {
      category = await categoryRepo.save({ id: serverProduct.category_id, name: serverProduct.category_name || 'Synced Category' });
    }

    let brand = await brandRepo.findOne({ where: { id: serverProduct.brand_id } });
    if (!brand && serverProduct.brand_id) {
      brand = await brandRepo.save({ id: serverProduct.brand_id, name: serverProduct.brand_name || 'Synced Brand' });
    }

    const product = await productRepo.save({
      id: serverProduct.id,
      seller_id: serverProduct.seller_id || userId,
      ship_from_id: serverProduct.ship_from_id,
      category_id: serverProduct.category_id,
      brand_id: serverProduct.brand_id,
      title: serverProduct.title,
      description: serverProduct.description,
      price: serverProduct.price,
      image_urls: serverProduct.image_urls || [],
      videos: serverProduct.videos || null,
    });

    if (serverProduct.variants && Array.isArray(serverProduct.variants)) {
      for (const v of serverProduct.variants) {
        await variantRepo.save({
          product_id: product.id,
          size: v.size || null,
          color: v.color || null,
          stock: v.stock || 0,
          weight: v.weight || null,
        });
      }
    }

    console.log(`[SYNC] Product ID ${product.id} synced to local DB`);
  }

  //NHÓM 1: HAPPY PATH

  it('TC-01: (Thành công) - Đầy đủ tất cả các trường hợp lệ', async () => {
    const productData = {
      title: 'iPhone 15 Pro Max 256GB',
      price: 30000000,
      description: 'Điện thoại iPhone 15 Pro Max nguyên seal chính hãng VN/A, bảo hành 12 tháng.',
      image_urls: ['https://example.com/img1.jpg'],
      brand_id: validBrandId,
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: '256GB', color: 'Titan Tự nhiên', stock: 50, weight: 0.25 }]
    };

    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(productData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('iPhone 15 Pro Max 256GB');

    await syncProductToLocalDb(res.body.data);
  });

  it('TC-02: (Thành công) - Chỉ gồm các trường bắt buộc', async () => {
    const productData = {
      title: 'Tai nghe AirPods Pro 2',
      price: 6000000,
      description: 'Tai nghe không dây chống ồn chủ động từ Apple',
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 20, weight: 0.1 }]
    };

    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(productData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    await syncProductToLocalDb(res.body.data);
  });

  //NHÓM 2: KIỂM TRA THIẾU THAM SỐ (1002) -

  it('TC-03: (Thất bại) - Thiếu title', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ price: 20000000, category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ size: '13 inch - 256GB', color: 'Silver', stock: 5, weight: 1.29 }], description: 'MacBook Air M1 (Cố tình thiếu tiêu đề)' });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-04: (Thất bại) - Thiếu price', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'iPad Gen 10 64GB', description: 'iPad Gen 10 (Cố tình thiếu giá tiền)', category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ size: '64GB', color: 'Pink', stock: 15, weight: 0.48 }] });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-05: (Thất bại) - Thiếu variants', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Apple Watch Series 9', price: 9500000, description: 'Đồng hồ thông minh Apple Watch (Cố tình thiếu mảng biến thể)', category_id: validCategoryId, ship_from_id: validShipFromId });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-06: (Thất bại) - Thiếu ship_from_id', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Sạc nhanh 20W Apple', price: 550000, description: 'Cốc sạc 20W cổng Type-C (Cố tình thiếu địa chỉ kho)', category_id: validCategoryId, variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 100, weight: 0.05 }] });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  //NHÓM 3: KIỂM TRA KIỂU DỮ LIỆU & FORMAT

  it('TC-07: (Thất bại) - Title quá dài (>255 ký tự)', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(256),
        price: 490000,
        description: 'Ốp lưng iPhone 15 Pro Max chính hãng Apple (Title quá dài)',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: '15 Pro Max', color: 'Trong suốt', stock: 50, weight: 0.03 }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-08: (Thất bại) - Price không phải là số (1003)', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Cáp sạc USB-C to Lightning',
        price: 'abc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        description: 'Cáp sạc dài 1m (Giá tiền sai kiểu chuỗi)',
        variants: [{ size: '1m', color: 'Trắng', stock: 200, weight: 0.03 }]
      });

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });



  it('TC-09: (Thất bại) - image_urls chứa phần tử không phải string', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Apple Pencil 2',
        price: 2900000,
        description: 'Bút cảm ứng cho iPad (Mảng ảnh chứa số)',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 30, weight: 0.02 }],
        image_urls: [123]
      });

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('TC-10: (Thất bại) - video url không đúng định dạng', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Magic Mouse 2',
        price: 2000000,
        description: 'Chuột không dây Apple (Video URL sai định dạng)',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 15, weight: 0.1 }],
        videos: [{ url: 'invalid-url' }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  //NHÓM 4: GIÁ TRỊ KHÔNG HỢP LỆ (1004)

  it('TC-11: (Thất bại) - Price âm', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'MacBook Pro 14 inch M3', price: -39000000, category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ size: '14 inch', color: 'Space Black', stock: 10, weight: 1.55 }], description: 'MacBook Pro (Cố tình gửi giá âm)' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });


  it('TC-12: (Thất bại) - Variant stock âm (1004)', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'iPad Pro M4 11 inch', price: 25000000, category_id: validCategoryId, ship_from_id: validShipFromId,
        description: 'iPad Pro (Cố tình để tồn kho âm)',
        variants: [{ size: '11 inch - 256GB', color: 'Space Black', stock: -5, weight: 0.44 }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  //NHÓM TỰ ĐỊNH NGHĨA: VALIDATE MEDIA

  it('TC-13: (Thất bại) - Quá số lượng ảnh cho phép (Tối đa 4 ảnh)', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Bàn phím Magic Keyboard', price: 3500000, description: 'Bàn phím không dây (Gửi 5 ảnh)',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Silver', stock: 25, weight: 0.24 }],
        image_urls: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg']
      });

    expect(res.body.code).toBe('1008'); // MAXIMUM_NUMBER_OF_IMAGES
    expect(res.body.message).toBe('Maximum number of images.');
  });

  it('TC-14: (Thất bại) - Có ảnh thì không được có video', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'iMac 24 inch M3', price: 35000000, description: 'Máy tính để bàn iMac (Gửi cả ảnh và video)',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: '24 inch', color: 'Blue', stock: 5, weight: 4.48 }],
        image_urls: ['img1.jpg'],
        videos: [{ url: 'https://example.com/video.mp4', thumb: 'thumb.jpg' }]
      });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });



  it('TC-15: (Thất bại) - Không gửi Token', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .send({ title: 'AirTag (4 Pack)' });

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-16: (Thất bại) - Token sai định dạng', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', 'Bearer invalidtoken123')
      .send({ title: 'AirTag (1 Pack)' });

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-17: (Thất bại) - Variants là mảng rỗng', async () => {
    const res = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Apple TV 4K',
        price: 4000000,
        description: 'Apple TV (Mảng biến thể trống rỗng)',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: []
      });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });
});