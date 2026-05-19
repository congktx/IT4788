import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RedisService } from '../../src/common/redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Check OTP Reset Password (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;
  let TEST_PHONE: string;
  let baseURL: string | any;

  beforeAll(async () => {
    // 1. Đọc SĐT từ file test-context.json
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

    redisService = app.get<RedisService>(RedisService);
    // Dọn sạch key Redis trước khi test
    await redisService.del(`reset_password:${TEST_PHONE}`);
    await redisService.del(`reset_password_cooldown:${TEST_PHONE}`);
    await redisService.del(`reset_password_verified:${TEST_PHONE}`);
  }, 60000);

  afterAll(async () => {
    if (redisService) {
      await redisService.del(`reset_password:${TEST_PHONE}`);
      await redisService.del(`reset_password_cooldown:${TEST_PHONE}`);
      await redisService.del(`reset_password_verified:${TEST_PHONE}`);
    }
    if (app) {
      await app.close();
    }
  }, 20000);

  it('CHECK-OTP-01: (Thành công) - Xác thực mã OTP đúng (1000)', async () => {
    // Bước A: Gọi API tạo OTP (Cloudflare xử lý)
    await request(baseURL)
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    // Bước B: Đọc lén Redis local (vì Cloudflare và local dùng chung Redis 127.0.0.1:6379)
    const realOtp = await redisService.get(`reset_password:${TEST_PHONE}`);
    expect(realOtp).toBeDefined();

    // Bước C: Gửi OTP thật lấy được lên Server
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: realOtp,
      });

    // Kì vọng: Server xác nhận thành công
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);
    expect(res.body.data).toBeNull();
  });

  it('CHECK-OTP-02: (Thất bại) - Lỗi 9993 khi mã OTP sai', async () => {
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: '000000', // Mã sai
      });

    expect(res.body.code).toBe('9993'); // Code verify is incorrect
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('CHECK-OTP-03: (Thất bại) - Lỗi 9993 khi mã OTP không tồn tại (SĐT chưa yêu cầu OTP)', async () => {
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: '0888777666', // SĐT chưa từng yêu cầu tạo OTP
        reset_code: '123456',
      });

    expect(res.body.code).toBe('9993');
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('CHECK-OTP-04: (Thất bại) - Lỗi 1002 khi thiếu cả 2 trường input', async () => {
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-05: (Thất bại) - Lỗi 1002 khi thiếu SĐT', async () => {
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({ reset_code: '123456' }); // Không có phone_number

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-06: (Thất bại) - Lỗi 1002 khi thiếu mã OTP', async () => {
    const res = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({ phone_number: TEST_PHONE }); // Không có reset_code

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-07: (Thất bại) - Lỗi Validation (SĐT sai, Mã sai format...)', async () => {
    // SĐT sai format
    const res1 = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: '123',
        reset_code: '123456',
      });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // Mã OTP không đủ 6 chữ số
    const res2 = await request(baseURL)
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: '12',
      });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');
  });
});
