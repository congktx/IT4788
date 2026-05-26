import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('PushSettings - Set Push Settings (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: number;
  let baseURL: string | any;

  let TEST_PHONE: string;
  let PLAIN_PASSWORD: string;

  beforeAll(async () => {
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

    // Login để lấy token và userId
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


  // NHÓM 1: Test các case thành công

  it('SET-PUSH-SETTINGS-01: (Thành công) - Cập nhật 1 trường (like) qua Header, verify bằng API get', async () => {
    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ like: '0' });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);
    expect(res.body.data).toBe('OK');

    // DÙNG API TRỊ API: Gọi get_push_setting để kiểm chứng thay vì soi DB
    const getRes = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(getRes.body.data.like).toBe('0');
  });

  it('SET-PUSH-SETTINGS-02: (Thành công) - Cập nhật nhiều trường cùng lúc, verify bằng API get', async () => {
    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        like: '1',
        comment: '0',
        transaction: '1',
        announcement: '0',
        sound_on: '1',
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    const getRes = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(getRes.body.data.like).toBe('1');
    expect(getRes.body.data.comment).toBe('0');
    expect(getRes.body.data.transaction).toBe('1');
    expect(getRes.body.data.announcement).toBe('0');
    expect(getRes.body.data.sound_on).toBe('1');
  });

  it('SET-PUSH-SETTINGS-03: (Thành công) - Cập nhật sound_default với chuỗi bất kỳ, verify bằng API get', async () => {
    // sound_default không bị ràng buộc IsIn nên nhận bất kỳ chuỗi nào
    const customSound = 'notification_bell';

    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sound_default: customSound });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    const getRes = await request(baseURL)
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(getRes.body.data.sound_default).toBe(customSound);
  });

  // NHÓM 2: Test xác thực Token (Authentication)
  it('SET-PUSH-SETTINGS-04: (Thất bại) - Lỗi 9998 khi không truyền header Authorization', async () => {
    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .send({ like: '1' }); // Không có token

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('SET-PUSH-SETTINGS-05: (Thất bại) - Lỗi 9998 khi token sai hoặc đã hết hạn', async () => {
    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer fakes-token-invalid-abc`)
      .send({ like: '1' });

    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });


  // NHÓM 3: Test validation các trường setting
  it('SET-PUSH-SETTINGS-06: (Thất bại) - Lỗi 1002 khi không truyền trường setting nào', async () => {
    const res = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({}); // Chỉ token trong header, body rỗng

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('SET-PUSH-SETTINGS-07: (Thất bại) - Lỗi 1003 khi các trường setting không phải kiểu chuỗi', async () => {
    // like gửi dạng số nguyên
    const res1 = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ like: 1 }); // số thay vì '1'
    expect(res1.body.code).toBe('1003');
    expect(res1.body.message).toBe('Parameter type is invalid.');

    // comment gửi dạng boolean
    const res2 = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ comment: true });
    expect(res2.body.code).toBe('1003');
    expect(res2.body.message).toBe('Parameter type is invalid.');
  });

  it('SET-PUSH-SETTINGS-08: (Thất bại) - Lỗi 1004 khi trường setting có giá trị nằm ngoài ["0","1"]', async () => {
    // like = '2' (không nằm trong IsIn)
    const res1 = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ like: '2' });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // sound_on = 'yes' (không nằm trong IsIn)
    const res2 = await request(baseURL)
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sound_on: 'yes' });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');
  });
});
