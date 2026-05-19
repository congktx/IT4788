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
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';

describe('Products - Search (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
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
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-search' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    const userIdA = Number(loginARes.body.data.id);

    // 2. Chuẩn bị dữ liệu nền (Category & Address)
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

    // 3. Tạo sản phẩm để test search
    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'MacBook Air M2',
        price: 25000000, description: 'Laptop mỏng nhẹ',
        category_id: categoryId, ship_from_id: addressA.id,
        variants: [{ size: '13 inch', color: 'Midnight', stock: 5, weight: 1.2 }]
      });

    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'IPhone 15 Pro Max',
        price: 35000000, description: 'Điện thoại xịn',
        category_id: categoryId, ship_from_id: addressA.id,
        variants: [{ size: '256GB', color: 'Titanium', stock: 10, weight: 0.2 }]
      });
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('TC-01: (Thất bại) - Không có điều kiện tìm kiếm', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-02: (Thành công) - Tìm kiếm theo keyword (Original Case)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'MacBook', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);
  });

  it('TC-03: (Thành công) - Tìm kiếm theo keyword (UPPERCASE)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'MACBOOK', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);
  });

  it('TC-04: (Thành công) - Tìm kiếm theo keyword (lowercase)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'macbook', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);
  });

  it('TC-05: (Thành công) - Tìm kiếm theo keyword viết liền không dấu cách (UPPERCASE)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'IPHONE15PROMAX', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: any) => p.name.includes('IPhone 15 Pro Max'))).toBe(true);
  });

  it('TC-06: (Thành công) - Tìm kiếm theo keyword viết liền không dấu cách (lowercase)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'iphone15promax', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((p: any) => p.name.includes('IPhone 15 Pro Max'))).toBe(true);
  });

  it('TC-07: (Thành công) - Tìm kiếm theo category_id', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ category_id: categoryId, index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('TC-08: (Thành công) - Tìm kiếm theo khoảng giá (price_min, price_max)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ price_min: 20000000, price_max: 30000000, index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    // MacBook Air M2 có giá 25tr nằm trong khoảng này
    expect(res.body.data.some((p: any) => p.name.includes('MacBook'))).toBe(true);
  });

  it('TC-09: (Thất bại) - Không có dữ liệu (keyword không tồn tại)', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'TuLanhKhangKhuan123', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  it('TC-10: (Thất bại) - Thiếu index và count', async () => {
    const res = await request(baseURL)
      .post('/api/search')
      .send({ keyword: 'MacBook' }); // Không có index và count

    expect(String(res.body.code)).toBe('1004'); // Controller ValidationPipe (Bad Request -> 1004)
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
