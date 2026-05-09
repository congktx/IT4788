import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Change Password (e2e)', () => {
  let app: INestApplication;
  let TEST_PHONE: string;
  let TEST_PASSWORD: string;
  let VALID_TOKEN: string;
  const NEW_PASSWORD = 'changed_password_456';

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    TEST_PHONE = context.phone_number;
    TEST_PASSWORD = context.password;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: TEST_PASSWORD });

    VALID_TOKEN = loginRes.body.data?.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  it('CHANGE-PWD-01: (Token) - Lỗi 401 khi không có Header Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .send({ password: TEST_PASSWORD, new_password: NEW_PASSWORD });

    expect(res.status).toBe(401);
  });

  it('CHANGE-PWD-02: (Validation) - Lỗi 1002 khi thiếu mật khẩu hiện tại', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ new_password: NEW_PASSWORD }); // Thiếu trường password

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHANGE-PWD-03: (Validation) - Lỗi 1004 khi mật khẩu mới quá ngắn (dưới 6 ký tự)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD, new_password: '123' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-PWD-04: (Thành công) - Đổi mật khẩu thành công (dùng trường password)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD, new_password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.data).toBe('OK');
  });

  it('CHANGE-PWD-05: (Xác thực) - Đăng nhập lại bằng mật khẩu MỚI thành công', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.token).toBeDefined();

    // Cập nhật lại test-context để các test sau không bị hỏng Login
    const contextPath = path.join(__dirname, 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    context.password = NEW_PASSWORD;
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
  });
});
