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

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    userToken = res.body.data.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  it('SET-PUSH-SETTINGS-01: (Thành công) - Cập nhật tất cả cài đặt', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        like: '0',
        comment: '1',
        announcement: '0',
        transaction: '1',
        sound_on: '0',
        sound_default: 'custom_sound.mp3'
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.like).toBe('0');
    expect(res.body.data.sound_default).toBe('custom_sound.mp3');
  });

  it('SET-PUSH-SETTINGS-02: (Thành công) - Cập nhật một phần (Partial Update)', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        comment: '0'
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.comment).toBe('0');
  });

  it('SET-PUSH-SETTINGS-03: (Thất bại) - Lỗi 401 khi không gửi Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/set_push_setting')
      .send({ like: '1' });

    expect(res.status).toBe(401);
  });

  it('SET-PUSH-SETTINGS-04: (Thất bại) - Lỗi 1004 khi giá trị sai định dạng (không phải 0/1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/push_settings/set_push_setting')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ like: '5' });

    expect(res.body.code).toBe('1004');
  });
});
