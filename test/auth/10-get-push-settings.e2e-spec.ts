import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { PushSetting } from '../../src/modules/push_settings/entities/push-setting.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('PushSettings - Get Push Settings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
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

    dataSource = app.get<DataSource>(DataSource);

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
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  }, 20000);

  it('GET-PUSH-SETTINGS-01: (Thành công) - Lấy cấu hình thông báo qua Header', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({}); // Body rỗng

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);
    expect(res.body.data).toBeDefined();

    // OUTPUT: kiểm tra giá trị và kiểu dữ liệu của từng trường
    const data = res.body.data;
    expect(['0', '1']).toContain(data.like);            // chỉ nhận '0' hoặc '1'
    expect(['0', '1']).toContain(data.comment);         // chỉ nhận '0' hoặc '1'
    expect(['0', '1']).toContain(data.transaction);     // chỉ nhận '0' hoặc '1'
    expect(['0', '1']).toContain(data.announcement);   // chỉ nhận '0' hoặc '1'
    expect(['0', '1']).toContain(data.sound_on);        // chỉ nhận '0' hoặc '1'
    expect(typeof data.sound_default).toBe('string');  // sound_default là chuỗi bất kỳ
  });

  it('GET-PUSH-SETTINGS-02: (Thành công) - Lấy cấu hình thông báo khi truyền token qua Body', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .send({
        token: userToken,
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // OUTPUT: token qua body cũng trả về data có cấu trúc đúng
    const data = res.body.data;
    expect(['0', '1']).toContain(data.like);
    expect(['0', '1']).toContain(data.comment);
    expect(typeof data.sound_default).toBe('string');
  });

  it('GET-PUSH-SETTINGS-03: (Thất bại) - Lỗi 9998 do Token sai hoặc hết hạn', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer fakes-token-invalid-abc`)
      .send({});

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('GET-PUSH-SETTINGS-04: (Thất bại) - Lỗi 1004 khi không truyền token nào cả', async () => {
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      // Không set header, không gửi token trong body
      .send({});

    // Theo logic: if (!accessToken || accessToken.trim().length < 10) sẽ về lỗi INVALID (1004)
    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('GET-PUSH-SETTINGS-05: (Thất bại) - Lỗi 1003 khi token trong body không phải kiểu chuỗi', async () => {
    // Gửi token dạng số nguyên
    const res1 = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .send({
        token: 123456789012345,
      });
    expect(res1.body.code).toBe('1003');
    expect(res1.body.message).toBe('Parameter type is invalid.');

    // Gửi token dạng boolean
    const res2 = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .send({
        token: true,
      });
    expect(res2.body.code).toBe('1003');
    expect(res2.body.message).toBe('Parameter type is invalid.');
  });

  it('GET-PUSH-SETTINGS-06: (Thành công) - Tự động tạo cấu hình mặc định khi user chưa có setting', async () => {
    const repo = dataSource.getRepository(PushSetting);

    if (!process.env.TEST_API_URL) {
      // Xóa record push_setting của user để mô phỏng trạng thái "user mới" (chỉ khi chạy local)
      await repo.delete({ user_id: userId });
    }

    // Gọi API get_push_setting - hệ thống phải tự tạo record default (hoặc trả về cấu hình hiện tại)
    const res = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // Verify response trả về đúng giá trị (giá trị mặc định hoặc giá trị hiện có trên server)
    expect(res.body.data.like).toBeDefined();
    expect(res.body.data.comment).toBeDefined();
    expect(res.body.data.transaction).toBeDefined();
    expect(res.body.data.announcement).toBeDefined();
    expect(res.body.data.sound_on).toBeDefined();
    expect(res.body.data.sound_default).toBeDefined();

    if (!process.env.TEST_API_URL) {
      // Verify record mới đã được tạo trong DB local
      const created = await repo.findOne({ where: { user_id: userId } });
      expect(created).toBeDefined();
      expect(created!.like).toBe(1);
      expect(created!.comment).toBe(1);
      expect(created!.transaction).toBe(1);
      expect(created!.announcement).toBe(1);
      expect(created!.sound_on).toBe(1);
      expect(created!.sound_default).toBe('default');
    }
  });
});
