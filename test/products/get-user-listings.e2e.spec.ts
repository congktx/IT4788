import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Get User Listings (e2e)', () => {
  let app: INestApplication;
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
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-listing' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị dữ liệu nền bằng API (Category & Address)
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    categoryId = catRes.body.data?.[0]?.id || 1;

    let addressIdA = 1;
    const addrRes = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserA}`);
    if (addrRes.body.code === '1000' && addrRes.body.data && addrRes.body.data.length > 0) {
      addressIdA = addrRes.body.data[0].id;
    } else {
      const addAddrRes = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserA}`).send({
         address: '123 Test St A',
         address_id: [1, 1],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver A',
         phone: context.phone_number,
         full_address: '123 Test St A, Ha Noi',
         address_detail: '123 Test St A',
         is_default: true
      });
      if (addAddrRes.body.code === '1000' && addAddrRes.body.data) {
        addressIdA = addAddrRes.body.data.id;
      }
    }

    // 4. Tạo sản phẩm cho User A (để test)
    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'MacBook Pro M3 Max',
        price: 80000000, description: 'Laptop Apple mạnh nhất hiện nay',
        category_id: categoryId, ship_from_id: addressIdA,
        variants: [{ size: '16 inch', color: 'Space Black', stock: 5, weight: 2.1 }]
      });

    await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Tai nghe AirPods Pro 2',
        price: 5500000, description: 'Tai nghe chống ồn chủ động',
        category_id: categoryId, ship_from_id: addressIdA,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 50, weight: 0.1 }]
      });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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
    expect(res2.body.message).toBe('OK.');
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
