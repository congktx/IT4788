import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('User - Set User Info (e2e)', () => {
  let app: INestApplication;
  let VALID_TOKEN: string;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    VALID_TOKEN = loginRes.body.data.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  it('SET-INFO-01: (Thành công) - Cập nhật đầy đủ thông tin', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        username: 'Antigravity AI',
        email: 'ai@google.com',
        firstname: 'Anti',
        lastname: 'Gravity',
        address: 'Google HQ',
        status: 'Active'
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  it('SET-INFO-02: (Thành công) - Cập nhật một phần (Partial Update)', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        status: 'Chilling'
      });

    expect(res.body.code).toBe('1000');
  });

  it('SET-INFO-03: (Thất bại) - Lỗi 401 khi không có Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .send({ username: 'Hacker' });

    expect(res.status).toBe(401);
  });

  it('SET-INFO-04: (Thất bại) - Lỗi 1004 khi Email sai định dạng', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ email: 'not-an-email' });

    expect(res.body.code).toBe('1004');
  });

  it('SET-INFO-05: (Lưu ý) - Body rỗng trả về mã lỗi do Logic Backend chưa lọc', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    // Chúng ta tạm giữ mã lỗi hiện tại (1005 hoặc lỗi SQL) như thảo luận trước đó
    expect(res.body.code).not.toBe('1000');
  });
});
