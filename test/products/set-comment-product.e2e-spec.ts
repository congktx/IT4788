import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import { AllExceptionsFilter } from '../../src/all-exceptions.filter';
import { LoggingInterceptor } from '../../src/common/logging.interceptor';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Set Comments Product (e2e)', () => {
  let app: INestApplication;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let baseURL: string | any;
  let validProductIdB: number; // Sản phẩm của B để A comment

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-comments' });
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
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-comment' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị Address & Category bằng API cho việc add product
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
         address_detail: '123 Test St B'
      });
      if (addAddrResB.body.code === '1000' && addAddrResB.body.data) {
        addressIdB = addAddrResB.body.data.id;
      }
    }

    // 4. Tạo sản phẩm của User B để User A comment
    const addProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Samsung Galaxy S24 Ultra',
        price: 30000000, description: 'Điện thoại cao cấp của Samsung',
        category_id: categoryId, ship_from_id: addressIdB,
        variants: [{ size: '256GB', color: 'Titanium Black', stock: 15, weight: 0.3 }]
      });
    validProductIdB = addProductBRes.body.data?.id || 1;
  });

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


  it('TC-01: (Thành công) - Bình luận sản phẩm hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Sản phẩm này chụp hình rất đẹp!',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('content', 'Sản phẩm này chụp hình rất đẹp!');
  });


  it('TC-02: (Thất bại) - Thiếu các trường bắt buộc (Không truyền content)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });


  it('TC-03: (Thất bại) - Không đính kèm Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .send({
        product_id: validProductIdB,
        content: 'Bình luận ẩn danh',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });


  it('TC-04: (Thất bại) - ID sản phẩm không tồn tại (Rác)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: 99999999, // ID không có thực
        content: 'Sản phẩm này ảo quá',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-05: (Thất bại) - Không cho phép bình luận vào sản phẩm của người đã block mình', async () => {
    // Bước 1: User B tiến hành block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // Bước 2: User A cố tình gửi bình luận vào sản phẩm của B
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận lén lút',
        index: 0,
        count: 10,
      });

    // Bước 3: Đảm bảo Server chặn ngay lập tức
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // Bước 4: Clean up: Unblock
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  it('TC-06: (Thành công) - Thêm nhiều bình luận liên tiếp để test phân trang', async () => {
    // A comment thêm 2 cái nữa
    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận thứ hai', index: 0, count: 10 });

    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận thứ ba', index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // Kiểm tra xem bình luận mới nhất có nằm ở đầu mảng (index 0) không
    expect(res.body.data[0].content).toBe('Bình luận thứ ba');
  });

  it('TC-07: (Thành công) - Phân trang bình luận (Lấy index=0, count=1)', async () => {
    const res = await request(baseURL)
      .post('/api/get_comments_product') // Lưu ý: Hàm này dùng get_comments_product để lấy chứ không phải set
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 1, // Chỉ lấy 1 bình luận mới nhất
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('Bình luận thứ ba');
  });

  it('TC-08: (Thành công) - Phân trang bình luận (Lấy index=0, count=2 trong lúc gọi set_comments_product)', async () => {
    // Khi gọi API set_comments_product, nó cũng trả về danh sách comments mới nhất
    // Ta truyền count=2 thì nó phải trả về 2 comments mới nhất
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận thứ tư',
        index: 0,
        count: 2, // Lấy bình luận thứ tư và thứ ba
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].content).toBe('Bình luận thứ tư');
    expect(res.body.data[1].content).toBe('Bình luận thứ ba');
  });


  it('TC-09: (Thất bại) - Chỉ mục phân trang (index) không hợp lệ (index < 0)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận với index âm',
        index: -1,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
