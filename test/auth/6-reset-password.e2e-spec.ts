import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RedisService } from '../../src/common/redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Reset Password Final Step (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;
  let TEST_PHONE: string;
  let OLD_PASSWORD: string;
  let baseURL: string | any;
  const NEW_PASSWORD = 'new_password_verified_123';
  const VERIFIED_KEY_PREFIX = 'reset_password_verified';

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    TEST_PHONE = context.phone_number;
    OLD_PASSWORD = context.password;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    redisService = app.get<RedisService>(RedisService);
    // Đảm bảo sạch sẽ trước khi test
    await redisService.del(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`);
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
    // Đảm bảo cờ chưa tồn tại
    await redisService.del(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`);

    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('9993');
    expect(res.body.message).toBe('Code verify is incorrect.');
  });

  it('RESET-07: (Logic) - Lỗi 1004 khi mật khẩu mới trùng mật khẩu hiện tại', async () => {
    // Cắm cờ vào Redis để giả lập vừa xác thực OTP xong
    await redisService.set(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`, '1', 600);

    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: OLD_PASSWORD }); // Nhập lại mật khẩu cũ

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');

    // Xóa cờ sau test này để test tiếp theo không bị ảnh hưởng
    await redisService.del(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`);
  });

  // ─────────────────────────────────────────────
  // NHÓM 3: Kịch bản Thành công & Xác thực hậu kỳ
  // ─────────────────────────────────────────────

  it('RESET-08: (Thành công) - Đổi mật khẩu thành công khi đã có cờ Verified', async () => {
    // Bước A: Cắm cờ vào Redis để giả lập đã nhập đúng OTP
    await redisService.set(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`, '1', 600);

    // Bước B: Gọi API Reset Password
    const res = await request(baseURL)
      .post('/auth/reset_password')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // OUTPUT: reset_password trả về thông tin user + token mới (giống login)
    const data = res.body.data;
    expect(typeof data.id).toBe('string');       // id là chuỗi số
    expect(Number(data.id)).toBeGreaterThan(0);  // id hợp lệ
    expect(data.username).toBeDefined();          // có trường username
    expect(typeof data.token).toBe('string');    // token là chuỗi JWT
    expect(data.token).toMatch(/^eyJ/);          // JWT bắt đầu bằng eyJ
    expect(typeof data.active).toBe('number');   // active là số (1 hoặc -1)

    // KIỂM CHỨNG BẢO MẬT: Cờ phải bị xóa ngay sau khi đổi mật khẩu thành công
    const flagAfter = await redisService.get(`${VERIFIED_KEY_PREFIX}:${TEST_PHONE}`);
    expect(flagAfter).toBeNull();
  });

  it('RESET-09: (Xác thực) - Login bằng mật khẩu MỚI thành công', async () => {
    const res = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // OUTPUT: login bằng mật khẩu mới cũng trả về thông tin đầy đủ
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token).toMatch(/^eyJ/);
    expect(res.body.data.username).toBeDefined();

    // Cập nhật context để các test file sau dùng mật khẩu mới
    const contextPath = path.join(__dirname, 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    context.password = NEW_PASSWORD;
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
  });

  it('RESET-10: (Xác thực) - Login bằng mật khẩu CŨ thất bại', async () => {
    const res = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: OLD_PASSWORD });

    // Mật khẩu cũ phải KHÔNG còn hoạt động được nữa (Hệ thống trả về 9995)
    expect(res.body.code).toBe('9995');
    expect(res.body.message).toBe('User is not validated.');
  });
});
