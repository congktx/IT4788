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

    // Login trước để lấy Token hợp lệ
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: TEST_PASSWORD });

    VALID_TOKEN = loginRes.body.data?.token;
    console.log(`[CHANGE-PASSWORD] Đã login, chuẩn bị test với SĐT: ${TEST_PHONE}`);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  // ─────────────────────────────────────────────
  // NHÓM 1: Kiểm tra Token (Xác thực danh tính)
  // ─────────────────────────────────────────────

  it('CHANGE-PWD-01: (Token) - Lỗi 9998 khi không có Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .send({ password: TEST_PASSWORD, new_password: NEW_PASSWORD });

    expect(res.body.code).toBe('9998'); // TOKEN_INVALID
    expect(res.body.message).toBe('Token is invalid.');
  });

  it('CHANGE-PWD-02: (Token) - Lỗi 9998 khi Token không hợp lệ', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', 'Bearer token_gia_mao_123')
      .send({ password: TEST_PASSWORD, new_password: NEW_PASSWORD });

    expect(res.body.code).toBe('9998'); // TOKEN_INVALID
    expect(res.body.message).toBe('Token is invalid.');
  });

  // ─────────────────────────────────────────────
  // NHÓM 2: Kiểm tra Validation (Thiếu trường / Sai format)
  // ─────────────────────────────────────────────

  it('CHANGE-PWD-03: (Validation) - Lỗi 1002 khi thiếu password (mật khẩu hiện tại)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ new_password: NEW_PASSWORD }); // Thiếu password

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHANGE-PWD-04: (Validation) - Lỗi 1002 khi thiếu new_password', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD }); // Thiếu new_password

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('CHANGE-PWD-05: (Validation) - Lỗi 1004 khi new_password quá ngắn (dưới 6 ký tự)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD, new_password: '123' });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // ─────────────────────────────────────────────
  // NHÓM 3: Kiểm tra Logic Nghiệp vụ
  // ─────────────────────────────────────────────

  it('CHANGE-PWD-06: (Logic) - Lỗi 1004 khi mật khẩu hiện tại SAI', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: 'matkhau_sai_bom', new_password: NEW_PASSWORD });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('CHANGE-PWD-07: (Logic) - Lỗi 1004 khi new_password trùng với password hiện tại', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD, new_password: TEST_PASSWORD }); // Giống nhau

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // ─────────────────────────────────────────────
  // NHÓM 4: Kịch bản Thành công & Xác thực hậu kỳ
  // ─────────────────────────────────────────────

  it('CHANGE-PWD-08: (Thành công) - Đổi mật khẩu thành công', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/change_password')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ password: TEST_PASSWORD, new_password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // OUTPUT: change_password chỉ xác nhận đổi mật khẩu thành công, không trả thêm dữ liệu
    expect(res.body.data).toBe('OK');

    console.log(`[CHANGE-PASSWORD CHECK] Đã đổi mật khẩu thành công cho SĐT: ${TEST_PHONE}`);
  });

  it('CHANGE-PWD-09: (Xác thực) - Login bằng mật khẩu MỚI thành công', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: NEW_PASSWORD });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    // OUTPUT: login với mật khẩu mới phải trả về token JWT hợp lệ
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token).toMatch(/^eyJ/);
    expect(res.body.data.username).toBeDefined();

    // Cập nhật mật khẩu mới vào context file để các test sau biết
    const contextPath = path.join(__dirname, 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    context.password = NEW_PASSWORD;
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
  });

  it('CHANGE-PWD-10: (Xác thực) - Login bằng mật khẩu CŨ thất bại', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number: TEST_PHONE, password: TEST_PASSWORD });

    expect(res.body.code).toBe('9995'); // USER_NOT_VALIDATED (sai mật khẩu)
    expect(res.body.message).toBe('User is not validated.');
  });
});
