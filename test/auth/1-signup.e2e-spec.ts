import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
// import { clearDatabase } from '../utils/db.util'; // Không dùng nữa (Non-destructive testing)
import bcrypt from 'bcrypt';
import { User } from '../../src/modules/users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth - Signup (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let currentTestPhone: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    // Sinh SĐT hợp lệ và đảm bảo chưa tồn tại trong DB (retry nếu trùng)
    const validPrefixes = ['3', '5', '7', '8', '9'];
    const userRepository = dataSource.getRepository(User);

    do {
      const prefix = validPrefixes[Math.floor(Math.random() * validPrefixes.length)];
      const suffix = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 chữ số
      currentTestPhone = '0' + prefix + suffix;

      const existed = await userRepository.findOne({
        where: { phone_number: currentTestPhone },
      });

      if (!existed) break; // Số chưa tồn tại → dùng luôn
      console.warn(`[SIGNUP] SĐT ${currentTestPhone} đã tồn tại trong DB, thử lại...`);
    } while (true);

    // Ghi SĐT + password ra file để các test suite khác (login, ...) có thể đọc lại
    const contextPath = path.join(__dirname, 'test-context.json');
    fs.writeFileSync(contextPath, JSON.stringify({
      phone_number: currentTestPhone,
      password: 'password123'
    }));
  }, 60000); 

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }, 60000);


  it('SIGNUP-01: (Thành công) - Lưu user mới vào Database', async () => {
    const signupData = {
      phone_number: currentTestPhone,
      password: 'password123',
      uuid: 'device-id-123'
    };

    // Bắn request
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData);

    // Kì vọng API trả về 1000
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // OUTPUT: Kiểm tra cấu trúc và giá trị data trả về
    const data = res.body.data;
    expect(typeof data.id).toBe('string');              
    expect(Number(data.id)).toBeGreaterThan(0);         
    expect(data.username).toBe(signupData.phone_number);
    expect(data.avatar).toBeNull();                    
    expect(data.active).toBe(-1);                       
    expect(data.token).toBeUndefined();              
    const userRepository = dataSource.getRepository(User);

    const dbUser = await userRepository.createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phone_number = :phone', { phone: signupData.phone_number })
      .getOne();

    expect(dbUser).toBeDefined();
    expect(dbUser!.phone_number).toBe(signupData.phone_number);
    const isMatched = await bcrypt.compare(signupData.password, dbUser!.password);
    expect(isMatched).toBe(true);
  });

  it('SIGNUP-02: (Thất bại) - Lỗi 9996 khi SĐT trùng lặp', async () => {
    const signupData = {
      phone_number: currentTestPhone,
      password: 'password123',
      uuid: 'device-id-123'
    };

    // DB đang chứa sẵn user từ test SIGNUP-01, không cần đẩy tay nữa
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(signupData);

    // Kì vọng API chặn lại (9996 User Existed)
    expect(res.body.code).toBe('9996');
    expect(res.body.message).toBe('User existed.');

    const userRepository = dataSource.getRepository(User);
    const count = await userRepository.count({ where: { phone_number: currentTestPhone } });
    expect(count).toBe(1);
  });

  it('SIGNUP-03: (Thất bại) - Lỗi 1002 khi thiếu điện thoại hoặc mật khẩu', async () => {
    // Thiếu phone_number
    const res1 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        password: 'password123',
        uuid: 'device-id-123'
      });
    expect(res1.body.code).toBe('1002');
    expect(res1.body.message).toBe('Parameter is not enough.');

    // Thiếu password
    const res2 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '0888999777',
        uuid: 'device-id-123'
      });
    expect(res2.body.code).toBe('1002');
    expect(res2.body.message).toBe('Parameter is not enough.');

    // Thiếu hoàn toàn cả phone lẫn password
    const res3 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        uuid: 'device-id-123'
      });
    expect(res3.body.code).toBe('1002');
    expect(res3.body.message).toBe('Parameter is not enough.');
  });

  it('SIGNUP-04: (Thất bại) - Lỗi 1003 khi sai kiểu dữ liệu', async () => {
    // Truyền phone_number là kiểu Number thay vì String
    const res1 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: 987654321,
        password: 'password123',
        uuid: 'device-id-123'
      });
    expect(res1.body.code).toBe('1003');
    expect(res1.body.message).toBe('Parameter type is invalid.');

    // Truyền password sai kiểu dữ liệu (Number)
    const res2 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '0888999777',
        password: 123456,
        uuid: 'device-id-123'
      });
    expect(res2.body.code).toBe('1003');
    expect(res2.body.message).toBe('Parameter type is invalid.');

    // Truyền sai kiểu cả 2 trường
    const res3 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: 987654321,
        password: 123456,
        uuid: 'device-id-123'
      });
    expect(res3.body.code).toBe('1003');
    expect(res3.body.message).toBe('Parameter type is invalid.');
  });

  it('SIGNUP-05: (Thất bại) - Lỗi 1004 khi giá trị tham số bất thường (VD: format sai)', async () => {
    // Cả điện thoại và pass đều sai định dạng
    const res1 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '098', // quá ngắn
        password: '12',      // quá ngắn
        uuid: 'device-id-123'
      });
    expect(res1.body.code).toBe('1004');
    expect(res1.body.message).toBe('Parameter value is invalid.');

    // SĐT sai chuẩn, password đúng chuẩn
    const res2 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '098', // quá ngắn
        password: 'password123',
        uuid: 'device-id-123'
      });
    expect(res2.body.code).toBe('1004');
    expect(res2.body.message).toBe('Parameter value is invalid.');

    // SĐT đúng chuẩn, password sai chuẩn
    const res3 = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '0888999777',
        password: '12', // quá ngắn
        uuid: 'device-id-123'
      });
    expect(res3.body.code).toBe('1004');
    expect(res3.body.message).toBe('Parameter value is invalid.');
  });

  it('SIGNUP-06: (Thất bại) - Lỗi 1004 khi SĐT đúng định dạng 10 số nhưng sai đầu số nhà mạng VN (VD: 01, 02...)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        phone_number: '0123456789', // Đầu số 01 không hợp lệ (cũ)
        password: 'password123',
        uuid: 'device-id-123'
      });
    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
