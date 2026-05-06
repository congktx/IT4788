import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from '../../src/modules/users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Login (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Dữ liệu được đọc từ file test-context.json (do 1-signup ghi ra sau khi random)
  let TEST_PHONE: string;
  let PLAIN_PASSWORD: string;

  beforeAll(async () => {
    // Đọc SĐT + password mà file 1-signup đã random và ghi ra
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error(
        'File test-context.json không tồn tại! Hãy chạy 1-signup trước để tạo dữ liệu.'
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

    dataSource = app.get<DataSource>(DataSource);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  }, 20000);


  it('LOGIN-01: (Thành công) - Mật khẩu đúng, sinh ra JWT Token', async () => {
    // Dữ liệu đã được 1-signup random và lưu vào Database thật + ghi ra test-context.json

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE,
        password: PLAIN_PASSWORD
      });

    // ASSERTIONS
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();

    // OUTPUT: Kiểm tra cấu trúc và giá trị data trả về
    const data = res.body.data;
    expect(typeof data.id).toBe('string');           
    expect(Number(data.id)).toBeGreaterThan(0);      
    expect(data.username).toBe(TEST_PHONE);        
    expect(typeof data.token).toBe('string');       
    expect(data.token).toMatch(/^eyJ/);             
    expect('active' in data).toBe(true);             
    expect(typeof data.active).toBe('number');       
  });

  it('LOGIN-02: (Thất bại) - Sai mật khẩu (9995)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE,
        password: 'wrongpassword'
      });

    expect(res.body.code).toBe('9995');
    expect(res.body.message).toBe('User is not validated.');
  });

  it('LOGIN-03: (Thất bại) - User không tồn tại (9995)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: '0999999999',
        password: 'password123'
      });

    expect(res.body.code).toBe('9995');
    expect(res.body.message).toBe('User is not validated.');
  });

  it('LOGIN-04: (Thất bại) - Lỗi 1002 khi thiếu điện thoại hoặc mật khẩu', async () => {
    // Thiếu phone_number
    const res1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        password: 'password123'
      });
    expect(res1.body.code).toBe('1002');
    expect(res1.body.message).toBe('Parameter is not enough.');

    // Thiếu password
    const res2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE
      });
    expect(res2.body.code).toBe('1002');
    expect(res2.body.message).toBe('Parameter is not enough.');

    // Thiếu cả 2 trường
    const res3 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({});
    expect(res3.body.code).toBe('1002');
    expect(res3.body.message).toBe('Parameter is not enough.');
  });

  it('LOGIN-05: (Thất bại) - Lỗi 1003 khi sai kiểu dữ liệu', async () => {
    // phone_number sai kiểu
    const res1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: 987654321,
        password: 'password123'
      });
    expect(res1.body.code).toBe('1003');
    expect(res1.body.message).toBe('Parameter type is invalid.');

    // password sai kiểu
    const res2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: TEST_PHONE,
        password: 123456
      });
    expect(res2.body.code).toBe('1003');
    expect(res2.body.message).toBe('Parameter type is invalid.');

    // Cả 2 trường sai kiểu
    const res3 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone_number: 987654321,
        password: 123456
      });
    expect(res3.body.code).toBe('1003');
    expect(res3.body.message).toBe('Parameter type is invalid.');
  });
});
