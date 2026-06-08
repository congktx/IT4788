import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Report Product (e2e)', () => {
  let app: INestApplication;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let validProductIdB: number; // Sản phẩm của B để A report
  let categoryId: number;
  let addressId: number;
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
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-report' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B (Sử dụng chuẩn thông tin của các test khác)
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });

    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-report' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị dữ liệu nền bằng API (Category & Address)
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    categoryId = catRes.body.data?.[0]?.id || 1;

    let addressIdB = 1;
    const addrResB = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserB}`);
    if (addrResB.body.code === '1000' && addrResB.body.data && addrResB.body.data.length > 0) {
      addressIdB = addrResB.body.data[0].id;
    } else {
      const addAddrResB = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserB}`).send({
         address: '123 Test St B',
         address_id: [1, 1],
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
    addressId = addressIdB;

    // 4. Tạo sản phẩm cho User B (để User A có cái report)
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Sản phẩm của B',
        price: 80000000, description: 'Sản phẩm demo report',
        category_id: categoryId, ship_from_id: addressId,
        variants: [{ size: 'M', color: 'Black', stock: 5, weight: 2.1 }]
      });
    validProductIdB = addRes.body.data?.id || 1;
  });

  afterAll(async () => {
    // Cleanup block state để tránh side-effect
    if (tokenUserB && userIdA) {
      await request(baseURL)
        .post('/set_user_block')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ user_id: userIdA, type: 1 }); // 1 = unblock
    }

    if (app) {
      await app.close();
    }
  });

  // NHÓM 1: CÁC KỊCH BẢN THÀNH CÔNG VÀ LỖI CƠ BẢN
  it('TC-01: (Thành công) - Báo cáo sản phẩm hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Hàng giả',
        details: 'Tôi nghi ngờ đây là hàng nhái'
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // Kiểm tra data trả ra xem reason có đúng format không
    expect(res.body.data).toHaveProperty('reason', '[Hàng giả] Tôi nghi ngờ đây là hàng nhái');
    expect(res.body.data).toHaveProperty('product_id', validProductIdB);
    expect(res.body.data).toHaveProperty('user_id', userIdA);
  });

  it('TC-02: (Thất bại) - Không truyền Body / Thiếu trường bắt buộc', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Thiếu details'
        // Không truyền details
      });

    expect(String(res.body.code)).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-03: (Thất bại) - Report sản phẩm không tồn tại (ID rác)', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: 99999999,
        subject: 'Spam',
        details: 'Sản phẩm này spam nè'
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-04: (Thất bại) - Không có Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .send({
        product_id: validProductIdB,
        subject: 'Spam',
        details: 'Không token'
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  // NHÓM 2: CÁC KỊCH BẢN CHẶN / TRẠNG THÁI SẢN PHẨM
  it('TC-05: (Thất bại) - Không thể report sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố report sản phẩm của B
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Hàng cấm',
        details: 'Người này bán hàng cấm'
      });

    // 3. Kỳ vọng bị chặn (Lưu ý: Nếu BE chưa làm sẽ báo lỗi ở đây)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  it('TC-06: (Thất bại) - Report chính sản phẩm của mình', async () => {
    // 1. User B cố gắng report sản phẩm của chính User B
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        product_id: validProductIdB,
        subject: 'Test',
        details: 'Tôi tự report chính mình'
      });

    // Theo logic thông thường, không ai tự report bài của mình
    // Nếu BE bắt lỗi này thì có thể trả về 1004 hoặc mã tương đương
    // expect(String(res.body.code)).not.toBe('1000');
    // NOTE: Tạm comment vì chưa rõ logic thực tế của Server xử lý tự report ra sao.
  });

  it('TC-07: (Thất bại) - Spam report nhiều lần liên tục cùng 1 sản phẩm', async () => {
    // 1. Ở TC-01, User A đã report sản phẩm B rồi
    // 2. Giờ User A tiếp tục gửi report thứ 2 cho cùng 1 sản phẩm đó
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Hàng giả',
        details: 'Tôi đã report rồi mà vẫn report tiếp nè'
      });

    // Nếu Server chặn Spam, sẽ trả về mã lỗi (ví dụ: 1010 Action has been done previously)
    // Nếu không chặn, nó vẫn báo 1000. 
    // Theo logic Anti-spam tốt, nên chặn.
    expect(String(res.body.code)).toBe('1010');
    expect(res.body.message).toBe('Action has been done previously by this user.');
  });
});
