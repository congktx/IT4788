import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Create Code Reset Password (e2e)', () => {
  let app: INestApplication;
  let TEST_PHONE: string;
  let baseURL: string | any;

  beforeAll(async () => {
    // Đọc SĐT từ file test-context.json (do 1-signup tạo ra)
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    TEST_PHONE = context.phone_number;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    baseURL = process.env.TEST_API_URL || app.getHttpServer();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);


  it('CREATE-OTP-01: (Thành công) - Tạo mã OTP thành công', async () => {
    const res = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    // API trả về thành công
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch('OK.');
    expect(res.body.data).toHaveProperty('otp');
  });

  it('CREATE-OTP-02: (Thất bại) - Lỗi 9991 khi gửi yêu cầu liên tục (Chống Spam)', async () => {
    const res = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    expect(res.body.code).toBe('9991'); // SPAM
    expect(res.body.message).toBe('Spam.');
  });

  it('CREATE-OTP-03: (Thất bại) - Lỗi 9995 khi User không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '0999888777' }); // SĐT chưa đăng ký

    expect(res.body.code).toBe('9995'); // User is not validated
    expect(res.body.message).toBe('User is not validated.');
  });

  it('CREATE-OTP-04: (Thất bại) - Lỗi 1002 khi thiếu SĐT', async () => {
    // Gửi body rỗng
    const res1 = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({});
    expect(res1.body.code).toBe('1002');
    expect(res1.body.message).toBe('Parameter is not enough.');

    // Gửi body hoàn toàn trống
    const res2 = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send();
    expect(res2.body.code).toBe('1002');
    expect(res2.body.message).toBe('Parameter is not enough.');
  });

  it('CREATE-OTP-05: (Thất bại) - Lỗi 1003 khi SĐT sai kiểu dữ liệu', async () => {
    const res = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: 987654321 }); // Kiểu Number thay vì String

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('CREATE-OTP-06: (Thất bại) - Lỗi 1004 khi SĐT sai định dạng Việt Nam', async () => {
    // SĐT quá ngắn
    const res1 = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '098' });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // SĐT có ký tự chữ
    const res2 = await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '098abc7890' });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');
  });
});
