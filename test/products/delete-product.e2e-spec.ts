import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

import * as fs from 'fs';
import * as path from 'path';

describe('Products - Delete Product (e2e)', () => {
  let app: INestApplication;

  let tokenUserA: string;
  let tokenUserB: string;
  let productIdA: number;
  let validCategoryId: number;
  let validShipFromId: number;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A (Chủ sản phẩm)
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });
      
    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-delete-uuid' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    
    tokenUserA = loginARes.body.data.token;

    // 2. Setup User B (Kẻ đi xóa trộm) - Sử dụng API để tương thích server remote
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });

    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;

    // 3. Chuẩn bị Category & Address cho User A bằng API
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    if (catRes.body.code === '1000' && catRes.body.data && catRes.body.data.length > 0) {
      validCategoryId = catRes.body.data[0].id;
    } else {
      validCategoryId = 1;
    }

    const addrRes = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserA}`);
    if (addrRes.body.code === '1000' && addrRes.body.data && addrRes.body.data.length > 0) {
      validShipFromId = addrRes.body.data[0].id;
    } else {
      const addAddrRes = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserA}`).send({
         address: '123 Test St',
         address_id: [1, 1],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver A',
         phone: context.phone_number,
         full_address: '123 Test St, Ha Noi',
         address_detail: '123 Test St',
         is_default: true
      });
      if (addAddrRes.body.code === '1000' && addAddrRes.body.data) {
        validShipFromId = addAddrRes.body.data.id;
      } else {
        validShipFromId = 1;
      }
    }

    // 4. Tạo sản phẩm của User A
    const productRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'iPhone 13 128GB (Sản phẩm User A)',
        price: 15000000, description: 'Điện thoại iPhone 13 chính hãng',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: '128GB', color: 'Blue', stock: 10, weight: 0.5 }]
      });

    productIdA = productRes.body.data?.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('TC-01: (Thất bại) - User B cố tình xóa sản phẩm của User A', async () => {
    const res = await request(baseURL)
      .delete(`/api/delete/${productIdA}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.body.code).toBe('1009'); // NOT_ACCESS
    expect(res.body.message).toBe('Not access.');
  });

  it('TC-02: (Thất bại) - Xóa sản phẩm không tồn tại', async () => {
    const res = await request(baseURL)
      .delete('/api/delete/999999')
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.body.code).toBe('9992'); // PRODUCT_NOT_EXISTED
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-03: (Thất bại) - Không gửi Token', async () => {
    const res = await request(baseURL)
      .delete(`/api/delete/${productIdA}`);

    expect(res.body.code).toBe('9998'); // TOKEN_INVALID
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-04: (Thành công) - User A xóa đúng sản phẩm của mình', async () => {
    const res = await request(baseURL)
      .delete(`/api/delete/${productIdA}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // Kiểm tra lại qua API lấy chi tiết sản phẩm
    const checkRes = await request(baseURL)
      .post('/api/get_products')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ id: productIdA });

    expect(checkRes.body.code).toBe('9992');
  });

  it('TC-05: (Thành công) - User A thêm 1 sản phẩm rồi ngay lập tức xóa đi', async () => {
    // 1. Tạo mới 1 sản phẩm
    const productRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Tai nghe AirPods 3',
        price: 4500000, description: 'Tai nghe AirPods thế hệ thứ 3',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 5, weight: 0.1 }]
      });

    const newProductId = productRes.body.data.id;

    // 2. Ngay lập tức xóa
    const res = await request(baseURL)
      .delete(`/api/delete/${newProductId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  it('TC-06: (Thất bại) - User A xóa 1 sản phẩm, rồi lại xóa tiếp sản phẩm đó thêm lần nữa', async () => {
    // 1. Tạo mới 1 sản phẩm
    const productRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Củ sạc 20W Apple',
        price: 550000, description: 'Củ sạc nhanh 20W',
        category_id: validCategoryId, ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 20, weight: 0.1 }]
      });

    const newProductId = productRes.body.data.id;

    // 2. Xóa lần 1
    const res1 = await request(baseURL)
      .delete(`/api/delete/${newProductId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res1.body.code).toBe('1000');
    expect(res1.body.message).toBe('OK.');

    // 3. Xóa lần 2
    const res2 = await request(baseURL)
      .delete(`/api/delete/${newProductId}`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(res2.body.code).toBe('9992');
    expect(res2.body.message).toBe('Product is not existed.');
  });
});
