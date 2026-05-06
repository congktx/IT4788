import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Logout (e2e)', () => {
  let app: INestApplication;
  let TEST_PHONE: string;
  let PLAIN_PASSWORD: string;

  beforeAll(async () => {
    // 1. Đọc SĐT + password từ file test-context.json (do 1-signup tạo ra)
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    TEST_PHONE = context.phone_number;
    PLAIN_PASSWORD = context.password;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  it('LOGOUT-01: (Thành công) - Đăng xuất thành công với Token hợp lệ', async () => {
    // Bước A: Login để lấy token thật
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE,
        password: PLAIN_PASSWORD,
      });

    const token = loginRes.body.data.token;

    // Bước B: Dùng Token đó để gọi API Logout
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`) // Gửi qua Header
      .send();

    // ASSERTIONS
    if (res.body.code === '1000') {
      console.log(`\n[LOGOUT CHECK] Successfully logged out user: ${TEST_PHONE}`);
    }
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // OUTPUT: logout trả về data = null (không có thông tin thêm)
    expect(res.body.data).toBeNull();
  });

  it('LOGOUT-02: (Thất bại) - Lỗi 1004 khi Token không đúng định dạng hoặc quá ngắn', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer 123') // Token quá ngắn (< 10 ký tự như code quy định)
      .send();

    expect(res.body.code).toBe('1004'); // Parameter value is invalid
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('LOGOUT-03: (Thất bại) - Lỗi 9998 khi Token sai (Verify thất bại)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer abcdefghij.klmnopqrst.uvwxyz') // Token dài nhưng sai cấu trúc JWT
      .send();

    expect(res.body.code).toBe('9998'); // Token invalid (9998)
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('LOGOUT-04: (Thất bại) - Lỗi 1004 khi hoàn toàn thiếu Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({}); // Không Header, Không Body token

    expect(res.body.code).toBe('1004'); // Parameter value is invalid
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
