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

describe('Products - Get Comments Product (e2e)', () => {
  let app: INestApplication;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let baseURL: string | any;
  let validProductIdB: number; // Sản phẩm có bình luận
  let newProductIdB: number;   // Sản phẩm mới chưa có bình luận

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
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-get-comments' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });

    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-get-comments' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // Lấy province / ward hợp lệ
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

    // 3. Chuẩn bị Category & Address
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    if (catRes.body.code === '1000' && catRes.body.data && catRes.body.data.length > 0) {
      categoryId = catRes.body.data[0].id;
    } else {
      categoryId = 1;
    }

    let addressIdB = 1;
    const addrResB = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserB}`);
    if (addrResB.body.code === '1000' && addrResB.body.data && addrResB.body.data.length > 0) {
      addressIdB = addrResB.body.data[0].id;
    } else {
      const addAddrB = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserB}`).send({
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
      if (addAddrB.body.code === '1000' && addAddrB.body.data) {
        addressIdB = addAddrB.body.data.id;
      } else {
        throw new Error(`[DEBUG] Failed to add order address for User B. Response: ${JSON.stringify(addAddrB.body)}`);
      }
    }

    // 4. Tạo sản phẩm B (Đã có bình luận)
    const addProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Sony WH-1000XM5',
        price: 8000000, description: 'Tai nghe chống ồn đỉnh cao',
        category_id: categoryId, ship_from_id: addressIdB,
        variants: [{ size: 'Free Size', color: 'Silver', stock: 20, weight: 0.25 }]
      });
    validProductIdB = addProductBRes.body.data?.id || 1;

    // 5. Tạo sản phẩm B mới (Chưa có bình luận)
    const addNewProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Sony WH-1000XM5 New',
        price: 8500000, description: 'Tai nghe chống ồn mới nguyên seal',
        category_id: categoryId, ship_from_id: addressIdB,
        variants: [{ size: 'Free Size', color: 'Black', stock: 10, weight: 0.25 }]
      });
    newProductIdB = addNewProductBRes.body.data?.id || 2;

    // 6. Seed trước 2 bình luận cho sản phẩm B bằng tài khoản User A
    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận 1', index: 0, count: 10 });

    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận 2', index: 0, count: 10 });
  }, 60000);

  afterAll(async () => {
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

  it('TC-01: (Thành công) - Lấy danh sách bình luận của sản phẩm', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('content');
    expect(res.body.data[0]).toHaveProperty('created_at');
  });

  it('TC-02: (Thất bại) - Sản phẩm không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: 999999,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-03: (Thất bại) - Lỗi Validation (Thiếu tham số bắt buộc product_id)', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-04: (Thất bại) - Lỗi Validation (Thiếu tham số index / count)', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: validProductIdB,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-05: (Thất bại) - Định dạng index không hợp lệ (index < 0)', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: validProductIdB,
        index: -1,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-06: (Thất bại) - Định dạng count không hợp lệ (count < 1)', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 0,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-07: (Thành công nhưng Hết dữ liệu) - Trả về mảng rỗng khi sản phẩm chưa có bình luận', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: newProductIdB, // Sản phẩm mới tinh, chưa từng bình luận
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('TC-08: (Thành công) - Kiểm tra thứ tự và phân trang hoạt động đúng (sắp xếp DESC, skip chuẩn)', async () => {
    // Seed thêm bình luận thứ ba
    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận 3', index: 0, count: 10 });

    // Gọi API với index=1, count=2 (sẽ lấy Bình luận 2 và Bình luận 1)
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .send({
        product_id: validProductIdB,
        index: 1,
        count: 2,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].content).toBe('Bình luận 2');
    expect(res.body.data[1].content).toBe('Bình luận 1');
  });

  
  it('TC-09: (Thất bại - TDD) - Không thể xem bình luận sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố gắng xem bình luận sản phẩm của User B (gửi kèm token của A)
    const res = await request(baseURL)
      .post('/api/get_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });
});
