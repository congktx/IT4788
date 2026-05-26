import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Reset Password Final Step (e2e)', () => {
  let app: INestApplication;
  let TEST_PHONE: string;
  let OLD_PASSWORD: string;
  let baseURL: string | any;
  const NEW_PASSWORD = 'new_password_verified_123';

  beforeAll(async () => {
    // Tạo ngẫu nhiên một SĐT mới để tránh lỗi Cooldown và tránh làm hỏng password của test-context.json
    const validPrefixes = ['3', '5', '7', '8', '9'];
    const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
    const suffix = Date.now().toString().slice(-8);
    TEST_PHONE = '0' + prefix + suffix;
    OLD_PASSWORD = 'password123';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // Đăng ký user tạm thời để thao tác reset
    await request(baseURL)
      .post('/auth/signup')
      .send({ phone_number: TEST_PHONE, password: OLD_PASSWORD, uuid: 'mock-uuid-6' });
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  // NHÓM 1: Kiểm tra Validation (Thiếu trường / Sai format)
  it('RESET-01: (Validation) - Lỗi 1002 khi thiếu cả 2 trường', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('RESET-02: (Validation) - Lỗi 1002 khi thiếu phone_number', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ password: 'somepassword123' });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('RESET-03: (Validation) - Lỗi 1002 khi thiếu password', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('RESET-04: (Validation) - Lỗi 1004 khi phone_number sai format', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: 'abc123', password: 'somepassword123' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('RESET-05: (Validation) - Lỗi 1004 khi password quá ngắn (dưới 6 ký tự)', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: '123' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // NHÓM 2: Kiểm tra Logic Nghiệp vụ (Business Logic)
  it('RESET-06: (Logic) - Lỗi 9993 khi CHƯA xác thực OTP (không có cờ Verified)', async () => {
    // SĐT mới tinh chưa hề xin OTP nên chắc chắn không có cờ Verified trên Server
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('9993');
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('RESET-07: (Logic) - Lỗi 1004 khi mật khẩu mới trùng mật khẩu hiện tại', async () => {
    const createRes = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });
    const otp = createRes.body.data.otp;

    await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({ phone_number: TEST_PHONE, reset_code: otp });

    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: OLD_PASSWORD }); // Nhập lại mật khẩu cũ

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // NHÓM 3: Kịch bản Thành công & Xác thực hậu kỳ
  it('RESET-08: (Thành công) - Đổi mật khẩu thành công khi đã có cờ Verified', async () => {
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    const data = res.body.data;
    expect(typeof data.id).toBe('string');
    expect(Number(data.id)).toBeGreaterThan(0);
    expect(data.username).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.token).toMatch(/^eyJ/);
    expect(typeof data.active).toBe('number');

    const verifyRes = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: 'another_password' });
    expect(verifyRes.body.code).toBe('9993');
  });

  it('RESET-09: (Xác thực) - Login bằng mật khẩu MỚI thành công', async () => {
    const res = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token).toMatch(/^eyJ/);
    expect(res.body.data.username).toBeDefined();
  });

  it('RESET-10: (Xác thực) - Login bằng mật khẩu CŨ thất bại', async () => {
    const res = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: OLD_PASSWORD });

    expect(res.body.code).toBe('9995');
    expect(res.body.message).toBe('User is not validated.');
  });
});
