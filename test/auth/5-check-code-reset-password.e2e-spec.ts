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

    redisService = app.get<RedisService>(RedisService);
    
    // Đảm bảo sạch sẽ trước khi test
    await redisService.del(`reset_password:${TEST_PHONE}`);
    await redisService.del(`reset_password_cooldown:${TEST_PHONE}`);
    await redisService.del(`reset_password_verified:${TEST_PHONE}`);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  it('CHECK-OTP-01: (Thành công) - Xác thực mã OTP đúng', async () => {
    // Bước A: Tạo mã OTP trước (qua API 4)
    await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    // Bước B: "Moi" mã OTP thật ra từ Redis để test
    const realOtp = await redisService.get(`reset_password:${TEST_PHONE}`);
    expect(realOtp).toBeDefined();

    // Bước C: Gọi API Check OTP bằng mã vừa lấy được
    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: realOtp,
      });

    // Kì vọng: Thành công
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // OUTPUT: chỉ xác nhận OTP đúng, không trả dữ liệu đặc biệt
    expect(res.body.data).toBeNull();

    // Kiểm chứng quan trọng: Phải có 1 flag "Vừa xác thực xong" trong Redis
    const verifiedFlag = await redisService.get(`reset_password_verified:${TEST_PHONE}`);
    expect(verifiedFlag).toBe('1');
  });

  it('CHECK-OTP-02: (Thất bại) - Lỗi 9993 khi mã OTP sai', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: '000000', // Mã sai bét
      });

    expect(res.body.code).toBe('9993'); // Code verify invalid
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('CHECK-OTP-03: (Thất bại) - Lỗi 9993 khi mã OTP đã hết hạn hoặc không tồn tại', async () => {
    // Xóa mã trong Redis đi cho nó coi như hết hạn
    await redisService.del(`reset_password:${TEST_PHONE}`);

    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: '123456',
      });

    expect(res.body.code).toBe('9993');
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('CHECK-OTP-04: (Thất bại) - Lỗi 1002 khi thiếu cả 2 trường input', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-05: (Thất bại) - Lỗi 1002 khi thiếu SĐT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({ reset_code: '123456' }); // Không có phone_number

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-06: (Thất bại) - Lỗi 1002 khi thiếu mã OTP', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({ phone_number: TEST_PHONE }); // Không có reset_code

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHECK-OTP-07: (Thất bại) - Lỗi Validation (SĐT sai, Mã sai format...)', async () => {
    // SĐT sai format
    const res1 = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: '123',
        reset_code: '123456',
      });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // Mã OTP không đủ 6 chữ số
    const res2 = await request(app.getHttpServer())
      .post('/auth/check_code_reset_password')
      .send({
        phone_number: TEST_PHONE,
        reset_code: '12',
      });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');
  });
});
