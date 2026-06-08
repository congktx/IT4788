import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('PushSettings - Get Push Settings (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: number;
  let baseURL: string | any;

  let TEST_PHONE: string;
  let PLAIN_PASSWORD: string;

  beforeAll(async () => {
    // Đọc thông tin login từ test-context giống các file test khác
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error(
        'File test-context.json không tồn tại! Hãy chạy 1-signup trước để tạo dữ liệu.',
      );
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
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // Login để lấy access token
    const res = await request(baseURL)
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE,
        password: PLAIN_PASSWORD,
      });

    userToken = res.body.data.token;
    userId = Number(res.body.data.id);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  it('GET-PUSH-SETTINGS-01: (Thành công) - Lấy cấu hình thông báo qua Header', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({}); // Body rỗng

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(['0', '1']).toContain(data.like);
    expect(['0', '1']).toContain(data.comment);
    expect(['0', '1']).toContain(data.transaction);
    expect(['0', '1']).toContain(data.announcement);
    expect(['0', '1']).toContain(data.sound_on);
    expect(typeof data.sound_default).toBe('string');
  });

  it('GET-PUSH-SETTINGS-02: (Thất bại) - Lỗi 9998 do Token sai hoặc hết hạn', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer fakes-token-invalid-abc`)
      .send({});

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('GET-PUSH-SETTINGS-03: (Thất bại) - Lỗi 9998 khi không truyền header Authorization', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .send({});

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('GET-PUSH-SETTINGS-04: (Thành công) - Tự động tạo cấu hình mặc định khi user chưa có setting', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    expect(res.body.data.like).toBeDefined();
    expect(res.body.data.comment).toBeDefined();
    expect(res.body.data.transaction).toBeDefined();
    expect(res.body.data.announcement).toBeDefined();
    expect(res.body.data.sound_on).toBeDefined();
    expect(res.body.data.sound_default).toBeDefined();
  });
});
