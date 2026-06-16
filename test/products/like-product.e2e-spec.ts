import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/all-exceptions.filter';
import { LoggingInterceptor } from '../../src/common/logging.interceptor';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Like Product (e2e)', () => {
  let app: INestApplication;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let baseURL: string | any;
  let productAId: number;
  let productBId: number;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    baseURL = process.env.TEST_API_URL;

    if (!baseURL) {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe());
      app.useGlobalInterceptors(new LoggingInterceptor());
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();

      baseURL = app.getHttpServer();
    }

    // 1. Setup User A
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-like' });
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
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-like' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị Address & Category cho việc add product
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    categoryId = catRes.body.data?.[0]?.id || 1;

    let provinceId = 1;
    let wardId = 8;
    const provRes = await request(baseURL).get('/order/provinces');
    if (provRes.status !== 404 && provRes.body.code === '1000' && provRes.body.data && provRes.body.data.length > 0) {
      provinceId = provRes.body.data[0].id;
      const wardRes = await request(baseURL).get(`/order/wards?province_id=${provinceId}`);
      if (wardRes.body.code === '1000' && wardRes.body.data && wardRes.body.data.length > 0) {
        wardId = wardRes.body.data[0].id;
      }
    } else {
      console.warn(`[DEBUG] /order/provinces returned 404 or empty. Server might be outdated. Falling back to address_id: [8, 1]`);
    }

    let addressIdA = 1;
    const addrResA = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserA}`);
    if (addrResA.body.code === '1000' && addrResA.body.data && addrResA.body.data.length > 0) {
      addressIdA = addrResA.body.data[0].id;
    } else {
      const addAddrResA = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserA}`).send({
         address: '123 Test St A',
         address_id: [wardId, provinceId],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver A',
         phone: context.phone_number,
         full_address: '123 Test St A, Ha Noi',
         address_detail: '123 Test St A',
         is_default: true
      });
      if (addAddrResA.body.code === '1000' && addAddrResA.body.data) {
        addressIdA = addAddrResA.body.data.id;
      } else {
        throw new Error(`[DEBUG] Failed to add order address for User A. Response: ${JSON.stringify(addAddrResA.body)}`);
      }
    }

    let addressIdB = 1;
    const addrResB = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserB}`);
    if (addrResB.body.code === '1000' && addrResB.body.data && addrResB.body.data.length > 0) {
      addressIdB = addrResB.body.data[0].id;
    } else {
      const addAddrResB = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserB}`).send({
         address: '123 Test St B',
         address_id: [wardId, provinceId],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver B',
         phone: phoneB,
         full_address: '123 Test St B, Ha Noi',
         address_detail: '123 Test St B',
         is_default: true
      });
      if (addAddrResB.body.code === '1000' && addAddrResB.body.data) {
        addressIdB = addAddrResB.body.data.id;
      } else {
        throw new Error(`[DEBUG] Failed to add order address for User B. Response: ${JSON.stringify(addAddrResB.body)}`);
      }
    }

    // 4. User A tạo sản phẩm A (để B like)
    const addProductARes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Product of A',
        price: 25000000, description: 'Test like 1',
        category_id: categoryId, ship_from_id: addressIdA,
        variants: [{ size: '13 inch', color: 'Midnight', stock: 5, weight: 1.2 }]
      });
    productAId = addProductARes.body?.data?.id || 1;

    // 5. User B tạo sản phẩm B (để test block)
    const addProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Product of B',
        price: 30000000, description: 'Test like block',
        category_id: categoryId, ship_from_id: addressIdB,
        variants: [{ size: 'M', color: 'Red', stock: 10, weight: 1.0 }]
      });
    productBId = addProductBRes.body?.data?.id || 2;
  });

  afterAll(async () => {
    // Cleanup Block (Tránh ảnh hưởng các test suite khác)
    if (tokenUserB && userIdA) {
      await request(baseURL).post('/set_user_block').set('Authorization', `Bearer ${tokenUserB}`).send({ user_id: userIdA, type: 1 });
    }
    if (tokenUserA && userIdB) {
      await request(baseURL).post('/set_user_block').set('Authorization', `Bearer ${tokenUserA}`).send({ user_id: userIdB, type: 1 });
    }
    if (app) {
      await app.close();
    }
  });

  it('TC-01: (Thất bại) - Không gửi token', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .send({ product_id: productAId });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-02: (Thất bại) - Gửi token không hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', 'Bearer invalid_token_123')
      .send({ product_id: productAId });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-03: (Thất bại) - Thiếu product_id', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({}); // Rỗng

    expect(String(res.body.code)).toBe('1004'); // Controller ValidationPipe (Bad Request)
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-04: (Thất bại) - product_id rác (không tồn tại)', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ product_id: 99999999 });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed');
  });

  it('TC-05: (Thành công) - Like sản phẩm (Lần 1)', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ product_id: productAId });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.is_liked).toBe(true);
    expect(Number(res.body.data.like_count)).toBeGreaterThanOrEqual(1);
  });

  it('TC-06: (Thành công) - Unlike sản phẩm (Gọi lại Lần 2)', async () => {
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ product_id: productAId });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.is_liked).toBe(false);
    // Số like sẽ giảm đi so với lúc nãy
  });

  it('TC-07: (Thất bại) - Không thể like sản phẩm của user đã block mình', async () => {
    const blockRes = await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // Bước 2: User A cố gắng like sản phẩm của User B
    const res = await request(baseURL)
      .post('/api/like_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: productBId });
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');
  });
});
