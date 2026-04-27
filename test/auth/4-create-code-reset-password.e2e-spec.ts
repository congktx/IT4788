import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { RedisService } from '../../src/common/redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Create Code Reset Password (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;
  let TEST_PHONE: string;

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

    // Lấy RedisService từ app để kiểm chứng OTP và dọn dẹp cooldown
    redisService = app.get<RedisService>(RedisService);

    // Dọn sạch key Redis liên quan đến SĐT test (tránh dính cooldown từ lần chạy cũ)
    await redisService.del(`reset_password:${TEST_PHONE}`);
    await redisService.del(`reset_password_cooldown:${TEST_PHONE}`);
  }, 60000);

  afterAll(async () => {
    // Dọn sạch Redis sau khi test xong để không ảnh hưởng các test suite khác
    if (redisService) {
      await redisService.del(`reset_password:${TEST_PHONE}`);
      await redisService.del(`reset_password_cooldown:${TEST_PHONE}`);
    }
    if (app) {
      await app.close();
    }
  }, 20000);


  it('CREATE-OTP-01: (Thành công) - Tạo mã OTP và lưu vào Redis', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    // API trả về thành công
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // OUTPUT: API này chỉ gửi mã qua SMS, không trả dữ liệu nhạy cảm ra ngoài
    expect(res.body.data).toBeNull();

    // Kiểm chứng trực tiếp trong Redis: OTP phải tồn tại
    const savedOtp = await redisService.get(`reset_password:${TEST_PHONE}`);
    expect(savedOtp).toBeDefined();
    expect(savedOtp).not.toBeNull();
    expect(savedOtp!.length).toBe(6); // Mã OTP có đúng 6 chữ số

    // Log ra màn hình để bạn "thấy tận mắt" mã OTP
    console.log(`\n[OTP CHECK] Mã OTP được tạo cho ${TEST_PHONE}: ${savedOtp}`);
  });

  it('CREATE-OTP-02: (Thất bại) - Lỗi 9991 khi gửi yêu cầu liên tục (Chống Spam)', async () => {
    // Lưu ý: Test CREATE-OTP-01 vừa chạy xong, cooldown vẫn đang active trong Redis
    // Nên lần gọi thứ 2 này sẽ bị chặn ngay lập tức

    const res = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: TEST_PHONE });

    expect(res.body.code).toBe('9991'); // SPAM
    expect(res.body.message).toBe('Spam.');
  });

  it('CREATE-OTP-03: (Thất bại) - Lỗi 9995 khi User không tồn tại', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '0999888777' }); // SĐT chưa đăng ký

    expect(res.body.code).toBe('9995'); // User is not validated
    expect(res.body.message).toBe('User is not validated.');
  });

  it('CREATE-OTP-04: (Thất bại) - Lỗi 1002 khi thiếu SĐT', async () => {
    // Gửi body rỗng
    const res1 = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({});
    expect(res1.body.code).toBe('1002');
    expect(res1.body.message).toBe('Parameter is not enough.');

    // Gửi body hoàn toàn trống
    const res2 = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send();
    expect(res2.body.code).toBe('1002');
    expect(res2.body.message).toBe('Parameter is not enough.');
  });

  it('CREATE-OTP-05: (Thất bại) - Lỗi 1003 khi SĐT sai kiểu dữ liệu', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: 987654321 }); // Kiểu Number thay vì String

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('CREATE-OTP-06: (Thất bại) - Lỗi 1004 khi SĐT sai định dạng Việt Nam', async () => {
    // SĐT quá ngắn
    const res1 = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '098' });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // SĐT có ký tự chữ
    const res2 = await request(app.getHttpServer())
      .post('/auth/create_code_reset_password')
      .send({ phone_number: '098abc7890' });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');
  });
});
