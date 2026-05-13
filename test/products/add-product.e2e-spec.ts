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

describe('Products - Add Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let validCategoryId: number;
  let validShipFromId: number;
  let validBrandId: number;

  beforeAll(async () => {
    // Đọc thông tin user từ context
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

    // Login để lấy token
    const { phone_number, password } = context;
    let loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number, password });

    // Nếu user không tồn tại hoặc sai pass (do DB bị reset), tự động tạo lại
    if (loginRes.body.code === '9995') {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          phone_number,
          password,
          uuid: 'auto-recreate-user'
        });

      loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone_number, password });
    }

    if (loginRes.body.code !== '1000') {
      console.error('Login failed in Product E2E setup:', loginRes.body);
    }

    accessToken = loginRes.body.data?.token;
    const userId = Number(loginRes.body.data?.id);

    // CHUẨN BỊ DỮ LIỆU HỢP LỆ 
    const categoryRepo = dataSource.getRepository(Category);
    const addressRepo = dataSource.getRepository(Address);
    const brandRepo = dataSource.getRepository(Brand);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    // 1. Category
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) {
      category = await categoryRepo.save({ name: 'Dien tu', description: 'Category for testing' });
    }
    validCategoryId = category.id;

    // 2. Brand
    let brand = await brandRepo.findOne({ where: {} });
    if (!brand) {
      brand = await brandRepo.save({ name: 'Apple' });
    }
    validBrandId = brand.id;

    // 3. Address (Requires Ward -> Province)
    let address = await addressRepo.findOne({ where: { user_id: userId } });
    if (!address) {
      // Province
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) {
        province = await provinceRepo.save({ name: 'Ha Noi' });
      }

      // Ward
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) {
        ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });
      }

      // Create Address
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

    console.log(`[TEST SETUP] Category: ${validCategoryId}, Brand: ${validBrandId}, ShipFrom: ${validShipFromId}`);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  //NHÓM 1: HAPPY PATH

  it('TC-01: (Thành công) - Đầy đủ tất cả các trường hợp lệ', async () => {
    const productData = {
      title: 'Sản phẩm Toàn Diện',
      price: 200000,
      price_discount: 180000,
      description: 'Mô tả chi tiết',
      image_urls: ['https://example.com/img1.jpg'],
      brand_id: validBrandId,
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: 'L', color: 'Red', stock: 10, weight: 1.2 }],
      videos: [{ url: 'https://example.com/video.mp4', thumb: 'https://example.com/thumb.jpg' }]
    };

    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(productData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('Sản phẩm Toàn Diện');
  });

  it('TC-02: (Thành công) - Chỉ gồm các trường bắt buộc', async () => {
    const productData = {
      title: 'Sản phẩm Tối Thiểu',
      price: 100000,
      price_discount: 90000,
      description: 'Mô tả',
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: 'M', color: 'Blue', stock: 5, weight: 0.5 }]
    };

    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(productData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  //NHÓM 2: KIỂM TRA THIẾU THAM SỐ (1002) -

  it('TC-03: (Thất bại) - Thiếu title', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '', price: 100, price_discount: 0, category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ stock: 1 }], description: 'Test' });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-04: (Thất bại) - Thiếu price', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test', description: 'Test', category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ stock: 1 }] });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-05: (Thất bại) - Thiếu variants', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test', price: 100, price_discount: 0, description: 'Test', category_id: validCategoryId, ship_from_id: validShipFromId });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-06: (Thất bại) - Thiếu ship_from_id', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test', price: 100, price_discount: 0, description: 'Test', category_id: validCategoryId, variants: [{ stock: 1 }] });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  //NHÓM 3: KIỂM TRA KIỂU DỮ LIỆU & FORMAT

  it('TC-07: (Thất bại) - Title quá dài (>255 ký tự)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(256),
        price: 100,
        price_discount: 0,
        description: 'Test desc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-08: (Thất bại) - Price không phải là số (1003)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test',
        price: 'abc',
        price_discount: 0,
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        description: 'Test desc',
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }]
      });

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });



  it('TC-09: (Thất bại) - image_urls chứa phần tử không phải string', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test',
        price: 100,
        price_discount: 0,
        description: 'Test desc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }],
        image_urls: [123]
      });

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('TC-10: (Thất bại) - video url không đúng định dạng', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test',
        price: 100,
        price_discount: 0,
        description: 'Test desc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }],
        videos: [{ url: 'invalid-url' }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  //NHÓM 4: GIÁ TRỊ KHÔNG HỢP LỆ (1004)

  it('TC-11: (Thất bại) - Price âm', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test', price: -100, price_discount: 0, category_id: validCategoryId, ship_from_id: validShipFromId, variants: [{ size: 'L', color: 'White', stock: 1, weight: 1 }], description: 'Test desc' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });


  it('TC-12: (Thất bại) - Variant stock âm (1004)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test', price: 100, price_discount: 0, category_id: validCategoryId, ship_from_id: validShipFromId,
        description: 'Test desc',
        variants: [{ size: 'L', color: 'Red', stock: -5, weight: 1 }]
      });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  //NHÓM TỰ ĐỊNH NGHĨA: VALIDATE MEDIA

  it('TC-13: (Thất bại) - Quá số lượng ảnh cho phép (Tối đa 4 ảnh)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Images', price: 100, price_discount: 0, description: 'Test',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }],
        image_urls: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg']
      });

    expect(res.body.code).toBe('1008'); // MAXIMUM_NUMBER_OF_IMAGES
    expect(res.body.message).toBe('Maximum number of images.');
  });

  it('TC-14: (Thất bại) - Có ảnh thì không được có video', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Image and Video', price: 100, price_discount: 0, description: 'Test',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }],
        image_urls: ['img1.jpg'],
        videos: [{ url: 'https://example.com/video.mp4', thumb: 'thumb.jpg' }]
      });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-15: (Thất bại) - Có video thì không được có ảnh', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Video and Image', price: 100, price_discount: 0, description: 'Test',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'S', color: 'Black', stock: 1, weight: 0.1 }],
        videos: [{ url: 'https://example.com/video.mp4', thumb: 'thumb.jpg' }],
        image_urls: ['img1.jpg']
      });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });


  it('TC-16: (Thất bại) - Không gửi Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .send({ title: 'No Token' });

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-17: (Thất bại) - Token sai định dạng', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', 'Bearer invalidtoken123')
      .send({ title: 'Invalid Token' });

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-18: (Thất bại) - Variants là mảng rỗng', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Empty Variants',
        price: 100,
        price_discount: 0,
        description: 'Test desc',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: []
      });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });
});
