import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

describe('User - Set User Info (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let VALID_TOKEN: string;
  let MY_USER_ID: number;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    dataSource = app.get<DataSource>(DataSource);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: context.phone_number,
        password: context.password,
      });
    VALID_TOKEN = loginRes.body.data.token;
    MY_USER_ID = Number(loginRes.body.data.id);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  }, 20000);

  it('SET-INFO-01: (Thất bại) - Không gửi Token → HTTP 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .send({ status: 'New Status' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBeDefined();
  });

  it('SET-INFO-02: (Thất bại) - Email sai định dạng → code 1004', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ email: 'not-an-email' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('SET-INFO-03: (Thành công) - Cập nhật một vài trường (email, status)', async () => {
    const updatePayload = {
      email: 'updatedemail@gmail.com',
      status: 'Feeling productive'
    };

    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // Kiểm tra lại bằng API get_user_info
    const getRes = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(getRes.body.data.email).toBe(updatePayload.email);
    expect(getRes.body.data.status).toBe(updatePayload.status);
  });

  it('SET-INFO-04: (Thành công) - Cập nhật toàn bộ các trường thông tin', async () => {
    const fullPayload = {
      email: 'full.update@example.com',
      username: 'FullUpdateUser',
      status: 'Busy working',
      avatar: 'https://example.com/new_avatar.png',
      firstname: 'John',
      lastname: 'Doe',
      address: 'New York, USA',
      cover_image: 'https://example.com/new_cover.jpg',
      cover_image_web: 'https://example.com/new_cover_web.jpg'
    };

    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send(fullPayload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // Kiểm tra tính nhất quán
    const getRes = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    const data = getRes.body.data;
    expect(data.email).toBe(fullPayload.email);
    expect(data.firstname).toBe(fullPayload.firstname);
    expect(data.lastname).toBe(fullPayload.lastname);
    expect(data.address).toBe(fullPayload.address);
    expect(data.status).toBe(fullPayload.status);
    expect(data.cover_image).toBe(fullPayload.cover_image);
  });

  it('SET-INFO-05: (Tạm thời lỗi) - Gửi body rỗng hiện đang trả về 1005 (Unknown Error)', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(200);
    // Hiện tại Backend chưa xử lý body rỗng nên trả về 1005
    expect(res.body.code).toBe('1005');
    expect(res.body.message).toBe('Unknown error.');
  });
});
