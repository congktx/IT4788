import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';
import * as fs from 'fs';
import * as path from 'path';

describe('User - Get User Info (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Token hợp lệ và ID của user đang đăng nhập
  let VALID_TOKEN: string;
  let MY_USER_ID: number;
  // Thông tin user đọc từ context (do các test trước tạo/cập nhật)
  let MY_PHONE_NUMBER: string;

  // Token giả để kiểm tra trường hợp lỗi xác thực
  const INVALID_TOKEN = 'this.is.an.invalid.jwt.token';

  beforeAll(async () => {
    // === Bước 1: Đọc dữ liệu từ file context (do 1-signup tạo ra) ===
    const contextPath = path.join(__dirname, 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error(
        'File test-context.json không tồn tại! Hãy chạy 1-signup trước.',
      );
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    MY_PHONE_NUMBER = context.phone_number;

    // === Bước 2: Khởi động ứng dụng ===
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    dataSource = app.get<DataSource>(DataSource);

    // === Bước 3: Đăng nhập để lấy token hợp lệ ===
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


  // NHÓM 1: KIỂM TRA XÁC THỰC (Authentication - Token)
  it('GET-INFO-01: (Thất bại) - Không gửi Token → HTTP 401', async () => {
    // Kịch bản: Gọi API hoàn toàn không có header Authorization.
    const res = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toBeDefined();
  });

  it('GET-INFO-02: (Thất bại) - Token sai định dạng → HTTP 401', async () => {
    // Kịch bản: Gửi một chuỗi không phải JWT hợp lệ.
    const res = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${INVALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(401);
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

    const setRes = await request(app.getHttpServer())
      .post('/users/set_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send(updatePayload);

    expect(setRes.body.code).toBe('1000');

    const res = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    const data = res.body.data;
    expect(data).toBeDefined();


    expect(data.id).toBe(MY_USER_ID);

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
    expect(data.online).toBe(1);
    expect(data.followed).toBe(false);
    expect(data.is_blocked).toBe(false);
  });

  // NHÓM 3: KIỂM TRA KHI XEM THÔNG TIN NGƯỜI KHÁC (Có truyền user_id)
  it('GET-INFO-04: (Thành công) - Xem thông tin người khác (Kiểm tra ẩn thông tin nhạy cảm và Follow/Block)', async () => {
    const TARGET_USER_ID = 1;

    const targetPayload = {
      email: 'target.user@gmail.com',
      phone_number: '0988123456',
      firstname: 'Secret',
      lastname: 'Person',
      address: 'Secret HQ',
      status: 'This is a public status',
      cover_image: 'https://example.com/target_cover.jpg'
    };

    const userRepository = dataSource.getRepository(User);
    const targetUser = await userRepository.findOneBy({ id: TARGET_USER_ID });

    if (!targetUser) {
      console.warn(`[WARNING] User ID ${TARGET_USER_ID} không tồn tại trong DB, bỏ qua test case này.`);
      return;
    }


    await userRepository.update(TARGET_USER_ID, targetPayload);

    await request(app.getHttpServer())
      .post('/set_user_follow')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ followee_id: TARGET_USER_ID, action: 'follow' });
    const blockRepository = dataSource.getRepository(UserBlock);
    await blockRepository.upsert(
      { blocker_id: TARGET_USER_ID, blocked_id: MY_USER_ID },
      ['blocker_id', 'blocked_id']
    );


    const res = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ user_id: TARGET_USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');

    const data = res.body.data;
    expect(data.id).toBe(TARGET_USER_ID);

    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('phonenumber');
    expect(data).not.toHaveProperty('firstname');
    expect(data).not.toHaveProperty('lastname');
    expect(data).not.toHaveProperty('address');

    expect(data.status).toBe(targetPayload.status);
    expect(data.cover_image).toBe(targetPayload.cover_image);
    expect(data.followed).toBe(true);
    expect(data.is_blocked).toBe(true);


    await request(app.getHttpServer())
      .post('/set_user_follow')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ followee_id: TARGET_USER_ID, action: 'unfollow' });

    // Unblock
    await blockRepository.delete({ blocker_id: TARGET_USER_ID, blocked_id: MY_USER_ID });
  });

  it('GET-INFO-05: (Thất bại) - user_id không tồn tại → code 1013', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/get_user_info')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ user_id: 999999999 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('1013');
    expect(res.body.message).toBe('User does not exist.');
    expect(res.body.data).toBeNull();
  });
});
