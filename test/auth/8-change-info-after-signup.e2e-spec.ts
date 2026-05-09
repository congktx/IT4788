import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Change Info After Signup (e2e)', () => {
  let app: INestApplication;
  let TEST_PHONE: string;
  let TEST_PASSWORD: string;
  let VALID_TOKEN: string;

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

  it('CHANGE-INFO-01: (Thành công) - Cập nhật thông tin lần đầu và kiểm tra bảo mật', async () => {
    const newUsername = 'User ' + Math.floor(Math.random() * 1000);
    const newAvatar = 'https://example.com/avatar.png';

    const res = await request(app.getHttpServer())
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        username: newUsername,
        avatar: newAvatar,
      });

    expect(res.body.code).toBe('1000');
    const data = res.body.data;
    expect(data.username).toBe(newUsername);
    expect(data.avatar).toBe(newAvatar);
    
    // Đảm bảo các thông tin nhạy cảm không bị trả về
    expect(data.password).toBeUndefined();
    expect(data.phone_number).toBe(TEST_PHONE);
  });

  it('CHANGE-INFO-02: (Thất bại) - Lỗi 401 khi không gửi Header Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_info_after_signup')
      .send({
        username: 'Hieu',
        avatar: 'avatar.png',
      });

    expect(res.status).toBe(401);
  });

  it('CHANGE-INFO-03: (Thất bại) - Lỗi 1004 khi username quá ngắn', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        username: 'Hi',
        avatar: 'avatar.png',
      });

    expect(res.body.code).toBe('1004');
  });
});
