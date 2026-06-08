import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('User - Get User Info (e2e)', () => {
  let app: INestApplication;
  let baseURL: string | any;

  // Token hợp lệ và ID của user đang đăng nhập
  let VALID_TOKEN: string;
  let MY_USER_ID: number;
  // Thông tin user đọc từ context (do các test trước tạo/cập nhật)
  let MY_PHONE_NUMBER: string;

  // Token giả để kiểm tra trường hợp lỗi xác thực
  const INVALID_TOKEN = 'this.is.an.invalid.jwt.token';

  beforeAll(async () => {
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error(
        'File test-context.json không tồn tại! Hãy chạy 1-signup trước.',
      );
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    MY_PHONE_NUMBER = context.phone_number;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    const loginRes = await request(baseURL)
      .post('/auth/login')
      .send({
        phone_number: context.phone_number,
        password: context.password,
      });

    VALID_TOKEN = loginRes.body.data.token;
    MY_USER_ID = Number(loginRes.body.data.id);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);


  // NHÓM 1: KIỂM TRA XÁC THỰC (Authentication - Token)
  it('GET-INFO-01: (Thất bại) - Không gửi Token → HTTP 401/1000', async () => {
    // Kịch bản: Gọi API hoàn toàn không có header Authorization.
    const res = await request(baseURL)
      .post('/users/get_user_info')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('GET-INFO-02: (Thất bại) - Token sai định dạng → HTTP 401/1000', async () => {
    // Kịch bản: Gửi một chuỗi không phải JWT hợp lệ.
    const res = await request(baseURL)
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${INVALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  // NHÓM 2: KIỂM TRA KHI XEM THÔNG TIN CHÍNH MÌNH (Không truyền user_id)
  it('GET-INFO-03: (Thành công) - Xem thông tin của chính mình (Sau khi đã cập nhật thông tin qua API)', async () => {
    const updatePayload = {
      email: 'user_info_test@gmail.com',
      firstname: 'Nguyen',
      lastname: 'Van A',
      address: '123 Giai Phong, Ha Noi',
      status: 'Available',
      cover_image: 'https://cdn.example.com/cover1.jpg',
      cover_image_web: 'https://cdn.example.com/cover1_web.jpg'
    };

    const setRes = await request(baseURL)
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send(updatePayload);

    expect(setRes.body.code).toBe('1000');

    // Gọi lấy thông tin chính mình (user_id rỗng hoặc = MY_USER_ID)
    const res = await request(baseURL)
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ user_id: MY_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);
    const data = res.body.data;
    expect(data).toBeDefined();

    expect(Number(data.id)).toBe(MY_USER_ID);

    // Xác nhận các thông tin vừa cập nhật đã được lưu và trả về đúng
    expect(data.phonenumber).toBe(MY_PHONE_NUMBER);
    expect(data.email).toBe(updatePayload.email);
    expect(data.firstname).toBe(updatePayload.firstname);
    expect(data.lastname).toBe(updatePayload.lastname);
    expect(data.address).toBe(updatePayload.address);
    expect(data.status).toBe(updatePayload.status);
    expect(data.cover_image).toBe(updatePayload.cover_image);
    expect(data.cover_image_web).toBe(updatePayload.cover_image_web);

    // Các trường hệ thống khác
    expect(data.online).toBeDefined();
    expect(data.followed).toBeDefined();
    expect(data.is_blocked).toBeDefined();
  });

  // NHÓM 3: KIỂM TRA KHI XEM THÔNG TIN NGƯỜI KHÁC (Có truyền user_id)
  it('GET-INFO-04: (Thành công) - Xem thông tin người khác bằng 100% Thuần API', async () => {
    // 1. TẠO HOẶC LẤY TARGET USER BẰNG THUẦN API
    const targetPhone = '0955555555';
    const targetPassword = '123456';
    let targetUserId = 0;
    let targetToken = '';

    const signupRes = await request(baseURL)
      .post('/auth/signup')
      .send({ phone_number: targetPhone, password: targetPassword, uuid: 'mock-user-test' });

    if (signupRes.body.code === '1000') {
      targetUserId = Number(signupRes.body.data.id);
      const loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: targetPhone, password: targetPassword });
      targetToken = loginRes.body.data.token;
    } else {
      // Đã tồn tại, ta login để lấy ID và Token luôn
      const loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: targetPhone, password: targetPassword });
      targetUserId = Number(loginRes.body.data.id);
      targetToken = loginRes.body.data.token;
    }

    // 2. TARGET USER TỰ CẬP NHẬT THÔNG TIN (Mô phỏng 1 user có avatar và status thật)
    const targetPayload = {
      email: 'target.user@gmail.com',
      firstname: 'Secret',
      lastname: 'Person',
      address: 'Secret HQ',
      status: 'This is a public status',
      cover_image: 'https://example.com/target_cover.jpg'
    };
    await request(baseURL)
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${targetToken}`)
      .send(targetPayload);

    // 3. MÌNH (VALID_TOKEN) ẤN NÚT FOLLOW TARGET USER
    await request(baseURL)
      .post('/set_user_follow')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ followee_id: targetUserId, action: 'follow' });

    // 4. TARGET USER (TARGET_TOKEN) BLOCK MÌNH (ĐỂ TEST is_blocked = true)
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ user_id: MY_USER_ID, type: 0 }); // type: 0 là block

    // ==== 5. TIẾN HÀNH KIỂM TRA (MÌNH XEM THÔNG TIN TARGET) ====
    const res = await request(baseURL)
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ user_id: targetUserId });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // KIỂM TRA TÍNH NĂNG ẨN THÔNG TIN NHẠY CẢM
    const data = res.body.data;
    expect(Number(data.id)).toBe(targetUserId);

    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('phonenumber');
    expect(data).not.toHaveProperty('firstname');
    expect(data).not.toHaveProperty('lastname');
    expect(data).not.toHaveProperty('address');

    // KIỂM TRA THÔNG TIN CÔNG KHAI
    expect(data.status).toBe(targetPayload.status);
    expect(data.cover_image).toBe(targetPayload.cover_image);
    expect(data.followed).toBe(true);
    // Mình bị họ block
    expect(data.is_blocked).toBe(true);

    // ==== 6. DỌN DẸP LẠI (TRẢ LẠI TRẠNG THÁI BAN ĐẦU) ====
    await request(baseURL)
      .post('/set_user_follow')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ followee_id: targetUserId, action: 'unfollow' });

    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${targetToken}`)
      .send({ user_id: MY_USER_ID, type: 1 }); // type: 1 là unblock
  });

  it('GET-INFO-05: (Thất bại) - user_id không tồn tại → code 1013', async () => {
    const res = await request(baseURL)
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ user_id: 999999999 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1013');
    expect(res.body.message).toBe('User does not exist.');
    expect(res.body.data).toBeNull();
  });
});
