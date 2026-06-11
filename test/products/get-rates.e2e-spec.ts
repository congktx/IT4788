import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Rates - Get Rates (e2e)', () => {
  let app: INestApplication;
  let tokenUserA: string;
  let tokenUserB: string;
  let tokenUserC: string; // User hoàn toàn mới không có đánh giá để test TC-07
  let userIdA: number;
  let userIdB: number;
  let userIdC: number;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A từ test-context.json
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-get-rates' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B (Đồng bộ thông tin mock-user-test)
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
    userIdB = Number(loginBRes.body.data.id);

    // 3. Setup User C (User mới tinh để test TC-07)
    const phoneC = '0966666666';
    const passC = '123456';
    let loginCRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneC, password: passC });

    if (loginCRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneC, password: passC, uuid: 'mock-user-c' });
      loginCRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneC, password: passC });
    }
    tokenUserC = loginCRes.body.data.token;
    userIdC = Number(loginCRes.body.data.id);

    // 4. Seeding: User A thực hiện 2 đánh giá cho User B (để làm dữ liệu test xem)
    await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Binh luan 5 sao',
      });

    await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 3,
        content: 'Binh luan 3 sao',
      });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // TC-01: (Thành công) - Lấy danh sách đánh giá của chính mình (Không truyền user_id)
  it('TC-01: (Thành công) - Lấy danh sách đánh giá của chính mình (Không truyền user_id)', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserB}`) // Lấy của B (đã có 2 đánh giá ở trên)
      .send({
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('username');
    expect(res.body.data[0]).toHaveProperty('avatar');
    expect(res.body.data[0]).toHaveProperty('content');
    expect(res.body.data[0]).toHaveProperty('level');
    expect(res.body.data[0]).toHaveProperty('created');
  });

  // TC-02: (Thành công) - Lấy danh sách đánh giá của User khác (Truyền user_id)
  it('TC-02: (Thành công) - Lấy danh sách đánh giá của User khác (Truyền user_id)', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // TC-03: (Thành công) - Lọc danh sách đánh giá theo Level (Số sao)
  it('TC-03: (Thành công) - Lọc danh sách đánh giá theo Level (Số sao = 5)', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    // Chỉ có 1 đánh giá 5 sao
    expect(res.body.data.every((r: any) => r.level === 5)).toBe(true);
    expect(res.body.data.some((r: any) => r.content === 'Binh luan 5 sao')).toBe(true);
  });

  // TC-04: (Thất bại) - Xem đánh giá của User không tồn tại
  it('TC-04: (Thất bại) - Xem đánh giá của User không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: 99999999, // ID ảo
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1013');
    expect(res.body.message).toBe('User does not exist.');
  });

  // TC-05: (Thất bại) - Không đính kèm Token (Chưa đăng nhập)
  it('TC-05: (Thất bại) - Không đính kèm Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .send({
        user_id: userIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  // TC-06: (Thất bại) - Lỗi Validation (Thiếu tham số bắt buộc count)
  it('TC-06: (Thất bại) - Lỗi Validation (Thiếu tham số bắt buộc count)', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        index: 0,
        // Thiếu count
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-07: (Thành công nhưng Hết dữ liệu) - Trả về mảng rỗng khi User chưa có đánh giá nào
  it('TC-07: (Thành công nhưng Hết dữ liệu) - Trả về mảng rỗng khi User chưa có đánh giá nào', async () => {
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdC, // User C mới tinh chưa có review nào
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  // TC-08: (Thất bại) - Không cho phép xem đánh giá của người đã block mình
  it('TC-08: (Thất bại) - Không cho phép xem đánh giá của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố gọi get_rates của B
    const res = await request(baseURL)
      .post('/api/get_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        index: 0,
        count: 10,
      });

    // 3. Kỳ vọng Backend chặn và báo Not Access (Lưu ý: Backend hiện chưa code logic này nên sẽ fail)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });
});
