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

  let TEST_PHONE: string;
  let PLAIN_PASSWORD: string;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại!');
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
    dataSource = app.get<DataSource>(DataSource);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: PLAIN_PASSWORD });

    userToken = res.body.data.token;
    userId = Number(res.body.data.id);
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  it('GET-PUSH-SETTINGS-01: (Thành công) - Lấy cấu hình thông báo qua Header', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.body.code).toBe('1000');
    expect(res.body.data).toBeDefined();
    const data = res.body.data;
    expect(['0', '1']).toContain(data.like);
    expect(['0', '1']).toContain(data.comment);
  });

  it('GET-PUSH-SETTINGS-02: (Thất bại) - Lỗi 401 khi không gửi Token hoặc Token sai', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/get_push_setting')
      .send({});

    expect(res.status).toBe(401);
  });

  it('GET-PUSH-SETTINGS-03: (Thành công) - Tự động tạo cấu hình mặc định', async () => {
    const repo = dataSource.getRepository(PushSetting);
    await repo.delete({ user_id: userId });

    const res = await request(app.getHttpServer())
      .post('/push_settings/get_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.body.code).toBe('1000');
    expect(res.body.data.like).toBe('1');
    expect(res.body.data.sound_default).toBe('default');
  });
});
