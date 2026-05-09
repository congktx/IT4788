import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { DevToken } from '../../src/modules/dev_tokens/entities/dev-token.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('DevTokens - Set Devtoken (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let userId: number;

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

    dataSource = app.get<DataSource>(DataSource);

    // BƯỚC 1: Login để lấy token và user_id
    const res = await request(app.getHttpServer())
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

  it('SET-DEVTOKEN-01: (Thành công) - Login lấy token rồi lưu devtoken thành công vào Database', async () => {
    const testDevtokenStr = 'test-fcm-token-123456';
    const testDevtypeStr = '1';

    // BƯỚC 2: Gọi API set_devtoken
    const res = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: testDevtypeStr,
        devtoken: testDevtokenStr,
      });

    // Expect API trả về 1000 - OK
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBe('OK');
    const devTokenRepository = dataSource.getRepository(DevToken);
    const dbDevToken = await devTokenRepository.findOne({
      where: { devtoken: testDevtokenStr },
    });

    // Expect bản ghi tồn tại và map đúng user_id đang thao tác
    expect(dbDevToken).toBeDefined();
    expect(dbDevToken!.devtype).toBe(testDevtypeStr);
    expect(dbDevToken!.user_id).toBe(userId);
  });

  it('SET-DEVTOKEN-02: (Thất bại) - Lỗi 1004 do devtoken truyền vào quá ngắn (dưới 10 ký tự)', async () => {
    const res = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: '1',
        devtoken: 'short', // ngắn hơn 10 ký tự, bị chặn bởi DTO validator
      });


    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('SET-DEVTOKEN-03: (Thất bại) - Lỗi 9998 do Token đăng nhập gửi lên bị sai/hết hạn', async () => {
    const res = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer fakes-token-invalid-abc`)
      .send({
        devtype: '1',
        devtoken: 'test-fcm-token-123456',
      });

    // 9998 là mã lỗi Token invalid
    expect(res.body.code).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('SET-DEVTOKEN-04: (Thất bại) - Lỗi 1002 khi thiếu trường devtype hoặc devtoken', async () => {
    // Thiếu devtype
    const res1 = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtoken: 'test-fcm-token-123456',
      });
    expect(res1.body.code).toBe('1002');
    expect(res1.body.message).toBe('Parameter is not enough.');

    // Thiếu devtoken
    const res2 = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: '1',
      });
    expect(res2.body.code).toBe('1002');
    expect(res2.body.message).toBe('Parameter is not enough.');

    // Thiếu cả 2
    const res3 = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res3.body.code).toBe('1002');
    expect(res3.body.message).toBe('Parameter is not enough.');
  });

  it('SET-DEVTOKEN-05: (Thất bại) - Lỗi 1003 do sai kiểu dữ liệu truyền vào', async () => {
    // devtype gửi dạng số thay vì chuỗi
    const res1 = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: 1,
        devtoken: 'test-fcm-token-123456',
      });
    expect(res1.body.code).toBe('1003');
    expect(res1.body.message).toBe('Parameter type is invalid.');

    // devtoken gửi dạng boolean
    const res2 = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: '1',
        devtoken: true,
      });
    expect(res2.body.code).toBe('1003');
    expect(res2.body.message).toBe('Parameter type is invalid.');
  });

  it('SET-DEVTOKEN-06: (Thất bại) - Lỗi 1004 do devtype truyền vào sai giá trị cho phép (chỉ nhận \'0\' hoặc \'1\')', async () => {
    const res = await request(app.getHttpServer())
      .post('/dev_tokens/set_devtoken')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        devtype: '2', // không nằm trong ['0', '1']
        devtoken: 'test-fcm-token-123456',
      });
    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
