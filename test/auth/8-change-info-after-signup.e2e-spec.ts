import '../setup-env';
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
  let baseURL: string | any;

  beforeAll(async () => {
    // Đọc SĐT và mật khẩu hiện tại từ context
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
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // Login trước để lấy Token hợp lệ
    const loginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: TEST_PASSWORD });

    VALID_TOKEN = loginRes.body.data?.token;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  // NHÓM 1: Kiểm tra Token (Xác thực danh tính)
  it('CHANGE-INFO-01: (Token) - Lỗi 1002 khi không có Token', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .send({ username: 'New Username' });

    expect(res.body.code).toBe('1002'); // PARAMETER_NOT_ENOUGH
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHANGE-INFO-02: (Token) - Lỗi 1004 khi Token quá ngắn', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', 'Bearer abc') // Token < 10 chars -> length invalid
      .send({ username: 'New Username' });

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-INFO-03: (Token) - Lỗi 9998 khi Token không hợp lệ (sai định dạng JWT)', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', 'Bearer token_gia_mao_phai_du_dai_hon_10_ky_tu')
      .send({ username: 'New Username' });

    expect(res.body.code).toBe('9998'); // TOKEN_INVALID
    expect(res.body.message).toBe('Token is invalid.');
  });


  // NHÓM 2: Kiểm tra Validation (Thiếu trường / Sai cấu trúc)
  it('CHANGE-INFO-04: (Validation) - Lỗi 1002 khi thiếu username', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({}); // Thiếu username

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHANGE-INFO-05: (Validation) - Lỗi 1003 khi username không phải chuỗi', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: 12345 }); // Sai kiểu dữ liệu

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('CHANGE-INFO-06: (Validation) - Lỗi 1004 khi username quá ngắn (< 3 ký tự)', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: 'ab' }); 

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-INFO-07: (Validation) - Lỗi 1004 khi username quá dài (> 50 ký tự)', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: 'a'.repeat(51) }); 

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-INFO-08: (Logic) - Lỗi 1004 khi username chứa ký tự đặc biệt không được phép', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: 'Invalid @Username!' }); // Chứa @ và !

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-INFO-09: (Validation) - Lỗi 1003 khi avatar không phải chuỗi', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: 'Valid Username', avatar: 12345 }); // avatar sai kiểu dữ liệu

    expect(res.body.code).toBe('1003'); // PARAMETER_TYPE_INVALID
    expect(res.body.message).toBe('Parameter type is invalid.');
  });


  // NHÓM 3: Kịch bản Thành công
  it('CHANGE-INFO-10: (Thành công) - Thay đổi thông tin bằng Token trong Body', async () => {
    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      // Không gửi header, gửi token qua body
      .send({ token: VALID_TOKEN, username: 'UpdatedName1' });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // OUTPUT: kiểm tra cấu trúc đầy đủ của data trả về
    const data = res.body.data;
    expect(data.username).toBe('UpdatedName1');             
    expect(typeof data.id).toBe('string');                 
    expect(data.phone_number).toBe(TEST_PHONE);              
    expect(data.role).toBeDefined();                         
    expect(data.password).toBeUndefined();                   
  });

  it('CHANGE-INFO-11: (Thành công) - Đổi username thành công (kèm avatar)', async () => {
    const newUsername = 'Super User 99';
    const newAvatar = 'https://example.com/avatar.png';

    const res = await request(baseURL)
      .post('/auth/change_info_after_signup')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ username: newUsername, avatar: newAvatar });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toMatch(/^OK\.?$/);

    // OUTPUT: kiểm tra các trường data trả về khớp với giá trị vừa được set
    const data = res.body.data;
    expect(data.username).toBe(newUsername);                // username đúng với đầu vào
    expect(data.avatar).toBe(newAvatar);                    // avatar đúng với đầu vào
    expect(typeof data.id).toBe('string');                  // id là chuỗi số
    expect(data.phone_number).toBe(TEST_PHONE);              // phone_number không bị đổi
    expect(data.role).toBeDefined();                         // có trường role
    expect(data.password).toBeUndefined();                   // không lộ password ra ngoài
  });

});
