import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource, Not } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';

import { Category } from '../../src/modules/products/entities/category.entity';
import { Address } from '../../src/modules/orders/entities/address.entity';
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';
import { User } from '../../src/modules/users/entities/user.entity';

describe('Products - Get User Listings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-listing' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B qua API để test Remote
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });

    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-uuid-listing' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị dữ liệu nền (Category & Address)
    const categoryRepo = dataSource.getRepository(Category);
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Dien tu' });
    categoryId = category.id;

    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    let addressA = await addressRepo.findOne({ where: { user_id: userIdA } });
    if (!addressA) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) ward = await wardRepo.save({ name: 'Ward', provinces_id: province.id });

      addressA = await addressRepo.save({
        user_id: userIdA, ward_id: ward.id, address_name: 'Home',
        address_detail: '123', lat: 0, lng: 0, receiver_name: 'A', phone: '099', full_address: 'FA'
      });
    }

    // 4. Tạo sản phẩm cho User A (để test)
    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'MacBook Pro M3 Max',
        price: 80000000, description: 'Laptop Apple mạnh nhất hiện nay',
        category_id: categoryId, ship_from_id: addressA.id,
        variants: [{ size: '16 inch', color: 'Space Black', stock: 5, weight: 2.1 }]
      });

    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Tai nghe AirPods Pro 2',
        price: 5500000, description: 'Tai nghe chống ồn chủ động',
        category_id: categoryId, ship_from_id: addressA.id,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 50, weight: 0.1 }]
      });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('TC-01: (Thành công) - Lấy danh sách sản phẩm của chính mình', async () => {
    const res = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    // User A vừa được tạo 2 sản phẩm
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('price');
    expect(res.body.data[0]).toHaveProperty('variants');
  });

  it('TC-02: (Thành công) - Lấy danh sách sản phẩm của User A bằng token của User B', async () => {
    const res = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ index: 0, count: 10, user_id: userIdA });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('TC-03: (Thất bại) - Không gửi token', async () => {
    const res = await request(baseURL)
      .post('/api/get_user_listings')
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9998'); // TOKEN_INVALID do Guard chặn
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-04: (Thất bại) - Lấy danh sách của user_id không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10, user_id: 999999 });

    expect(String(res.body.code)).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-05: (Thành công) - Lọc sản phẩm theo keyword (case-insensitive & partial match)', async () => {
    // 1. Tìm bằng từ khóa đầy đủ
    const res1 = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10, keyword: 'MacBook' });

    expect(String(res1.body.code)).toBe('1000');
    expect(res1.body.message).toBe('OK.');
    expect(res1.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);


    const res2 = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10, keyword: 'mac' });

    expect(String(res2.body.code)).toBe('1000');
    expect(res2.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);
    expect(res2.body.data.some((p: any) => p.name.includes('AirPods'))).toBe(false);
  });

  it('TC-06: (Thất bại) - Lấy danh sách sản phẩm của người đã block mình', async () => {
    // 1. User B tiến hành block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 });

    // 2. User A cố gắng xem sản phẩm của User B
    const res = await request(baseURL)
      .post('/api/get_user_listings')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10, user_id: userIdB });

    // 3. Phải báo lỗi 1009 (Not Access) do đã bị block
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A để không ảnh hưởng DB
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });
});
