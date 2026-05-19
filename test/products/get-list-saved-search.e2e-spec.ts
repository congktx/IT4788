import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Get List Saved Search (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserEmpty: string;
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

    // 1. Setup User A (Có lịch sử)
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
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-get-search' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;

    // 2. Setup User B (Tài khoản mới tinh, không có lịch sử)
    const phoneB = '0988888881';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });
      
    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'user-empty-search' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserEmpty = loginBRes.body.data.token;

    // 3. Thực hiện gọi API search để hệ thống tự động lưu lịch sử tìm kiếm cho User A
    const searchKeywords = ['AirPods Pro', 'MacBook Air', 'iPad Pro', 'Apple Watch', 'iPhone 15'];
    for (const kw of searchKeywords) {
      await request(baseURL)
        .post('/api/search')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ keyword: kw, index: 0, count: 10 });
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('TC-01: (Thất bại) - Không gửi token', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-02: (Thất bại) - Token không hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', 'Bearer invalid_token')
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('TC-03: (Thất bại) - Thiếu tham số index và count', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({}); // Rỗng

    expect(String(res.body.code)).toBe('1004'); // Bị ValidationPipe chặn (Bad Request)
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-04: (Thành công) - Lấy danh sách thành công', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    
    // Danh sách trả về được sắp xếp theo created_at DESC (mới nhất lên đầu)
    expect(res.body.data[0].keyword).toBe('iPhone 15');
    expect(res.body.data[1].keyword).toBe('Apple Watch');
    expect(res.body.data[2].keyword).toBe('iPad Pro');
    expect(res.body.data[3].keyword).toBe('MacBook Air');
    expect(res.body.data[4].keyword).toBe('AirPods Pro');
  });

  it('TC-05: (Thất bại / Hết dữ liệu) - Không có lịch sử tìm kiếm nào (User mới)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserEmpty}`)
      .send({ index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  it('TC-06: (Thành công) - Phân trang: Lấy 2 bản ghi đầu tiên (index = 0, count = 2)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 0, count: 2 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    // 2 cái mới nhất
    expect(res.body.data[0].keyword).toBe('iPhone 15');
    expect(res.body.data[1].keyword).toBe('Apple Watch');
  });

  it('TC-07: (Thành công) - Phân trang: Lấy 2 bản ghi tiếp theo (index = 2, count = 2)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: 2, count: 2 });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    // 2 cái tiếp theo
    expect(res.body.data[0].keyword).toBe('iPad Pro');
    expect(res.body.data[1].keyword).toBe('MacBook Air');
  });

  it('TC-08: (Thất bại) - Tham số index và count không hợp lệ (số âm / zero)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_saved_search')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ index: -1, count: 0 }); // index phải >= 0, count phải >= 1

    expect(String(res.body.code)).toBe('1004'); // Controller ValidationPipe (Bad Request)
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
