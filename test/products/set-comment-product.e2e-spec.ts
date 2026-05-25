import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Category } from '../../src/modules/products/entities/category.entity';
import { Address } from '../../src/modules/orders/entities/address.entity';
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';

describe('Products - Set Comments Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let baseURL: string | any;
  let validProductIdB: number; // Sản phẩm của B để A comment

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-comments' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B qua API để test Remote
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });

    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;
    userIdB = Number(loginBRes.body.data.id);

    // 3. Chuẩn bị Address & Category cho việc add product
    const categoryRepo = dataSource.getRepository(Category);
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Tech' });
    categoryId = category.id;

    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    let addressB = await addressRepo.findOne({ where: { user_id: userIdB } });
    if (!addressB) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });

      addressB = await addressRepo.save({
        user_id: userIdB, ward_id: ward.id, address_name: 'Home Test B',
        address_detail: '123 Test St B', lat: 21.0285, lng: 105.8542, receiver_name: 'Test Receiver B', phone: '0955555555', full_address: '123 Test St B, Dich Vong Hau, Ha Noi'
      });
    }

    // 4. Tạo sản phẩm của User B để User A comment
    const addProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Samsung Galaxy S24 Ultra',
        price: 30000000, description: 'Điện thoại cao cấp của Samsung',
        category_id: categoryId, ship_from_id: addressB.id,
        variants: [{ size: '256GB', color: 'Titanium Black', stock: 15, weight: 0.3 }]
      });
    validProductIdB = addProductBRes.body.data?.id || 1;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  // TC-01: (Thành công) - Bình luận sản phẩm hợp lệ
  it('TC-01: (Thành công) - Bình luận sản phẩm hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Sản phẩm này chụp hình rất đẹp!',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('content', 'Sản phẩm này chụp hình rất đẹp!');
  });

  // TC-02: (Thất bại) - Thiếu các trường bắt buộc (Không truyền content)
  it('TC-02: (Thất bại) - Thiếu các trường bắt buộc (Không truyền content)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-03: (Thất bại) - Bình luận sản phẩm không tồn tại
  it('TC-03: (Thất bại) - Bình luận sản phẩm không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: 999999,
        content: 'Sản phẩm ảo',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  // TC-04: (Thất bại) - Không đính kèm Token (Chưa đăng nhập)
  it('TC-04: (Thất bại) - Không đính kèm Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .send({
        product_id: validProductIdB,
        content: 'Bình luận không token',
        index: 0,
        count: 10,
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  // TC-05: (Thất bại) - Lỗi Validation (Thiếu index / count)
  it('TC-05: (Thất bại) - Lỗi Validation (Thiếu index / count)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận thiếu index',
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-06: (Thất bại) - Số lượng phân trang không hợp lệ (count < 1)
  it('TC-06: (Thất bại) - Số lượng phân trang không hợp lệ (count < 1)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Phân trang sai',
        index: 0,
        count: 0, // Nhỏ hơn Min(1)
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-07: (Thất bại - TDD) - Không thể bình luận sản phẩm của người đã block mình
  it('TC-07: (Thất bại - TDD) - Không thể bình luận sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố comment sản phẩm của B
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Cố ý comment dù bị block',
        index: 0,
        count: 10,
      });

    // 3. Kỳ vọng chặn và báo Not Access (1009)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  // TC-08: (Thành công) - Phân trang bình luận (Đảm bảo sắp xếp DESC và skip đúng index)
  it('TC-08: (Thành công) - Phân trang bình luận (Đảm bảo sắp xếp DESC và skip đúng index)', async () => {
    // Seed thêm 2 bình luận nữa
    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận thứ hai', index: 0, count: 5 });

    await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ product_id: validProductIdB, content: 'Bình luận thứ ba', index: 0, count: 5 });

    // Gọi API với index=1 (skip bình luận mới nhất), count=2
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận thứ tư', // Mới nhất sau khi lưu sẽ ở index 0
        index: 1, // Bỏ qua bình luận thứ tư
        count: 2, // Lấy bình luận thứ ba và thứ hai
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].content).toBe('Bình luận thứ ba');
    expect(res.body.data[1].content).toBe('Bình luận thứ hai');
  });

  // TC-09: (Thất bại) - Chỉ mục phân trang (index) không hợp lệ (index < 0)
  it('TC-09: (Thất bại) - Chỉ mục phân trang (index) không hợp lệ (index < 0)', async () => {
    const res = await request(baseURL)
      .post('/api/set_comments_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        content: 'Bình luận với index âm',
        index: -1, // Nhỏ hơn Min(0)
        count: 10,
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
