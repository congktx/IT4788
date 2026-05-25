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

describe('Rates - Set Rate (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let categoryId: number;
  let addressId: number;
  let validProductIdB: number;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Setup User A từ test-context.json
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-set-rate' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B (Đồng bộ thông tin mock-user-test)
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

    // 3. Chuẩn bị danh mục và địa chỉ giao hàng để tạo sản phẩm
    const categoryRepo = dataSource.getRepository(Category);
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Dien tu' });
    categoryId = category.id;

    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    let address = await addressRepo.findOne({ where: { user_id: userIdB } });
    if (!address) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });

      address = await addressRepo.save({
        user_id: userIdB, ward_id: ward.id, address_name: 'Home Test B',
        address_detail: '123 Test St B', lat: 21.0285, lng: 105.8542, receiver_name: 'Test Receiver B', phone: '0955555555', full_address: '123 Test St B, Dich Vong Hau, Ha Noi'
      });
    }
    addressId = address.id;

    // 4. Tạo 1 sản phẩm của User B để dùng cho việc đánh giá sản phẩm
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'iPad Pro M4 2024',
        price: 28000000, description: 'iPad siêu mỏng nhẹ thế hệ mới chip M4',
        category_id: categoryId, ship_from_id: addressId,
        variants: [{ size: 'L', color: 'Blue', stock: 10, weight: 1.5 }]
      });
    validProductIdB = addRes.body.data?.id || 1;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  // TC-01: (Thành công) - Thực hiện đánh giá hợp lệ
  it('TC-01: (Thành công) - Thực hiện đánh giá hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Người bán rất uy tín, đóng gói cẩn thận',
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toHaveProperty('user_id', userIdB);
    expect(res.body.data).toHaveProperty('reviewer_id', userIdA);
    expect(res.body.data).toHaveProperty('level', 5);
    expect(res.body.data).toHaveProperty('content', 'Người bán rất uy tín, đóng gói cẩn thận');
  });

  // TC-02: (Thất bại) - Thiếu các trường bắt buộc
  it('TC-02: (Thất bại) - Thiếu các trường bắt buộc (Không truyền content)', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        // Thiếu content
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-03: (Thất bại) - Đánh giá cho User không tồn tại
  it('TC-03: (Thất bại) - Đánh giá cho User không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: 99999999, // ID ảo không tồn tại
        level: 4,
        content: 'Tuyệt vời',
      });

    expect(String(res.body.code)).toBe('1013');
    expect(res.body.message).toBe('User does not exist.');
  });

  // TC-04: (Thất bại) - Không có Token (Chưa đăng nhập)
  it('TC-04: (Thất bại) - Không có Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .send({
        user_id: userIdB,
        level: 4,
        content: 'Tuyệt vời',
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  // TC-05: (Thất bại) - Số sao (level) không hợp lệ
  it('TC-05: (Thất bại) - Số sao (level) không hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 6, // Vượt quá mức tối đa 5 sao
        content: 'Rất tốt',
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // TC-06: (Thất bại) - Cố ý đánh giá người đã block mình
  it('TC-06: (Thất bại) - Cố ý đánh giá người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố gửi đánh giá cho B
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Cố ý đánh giá mặc dù bị block',
      });

    // 3. Kỳ vọng Backend chặn và báo Not Access (Lưu ý: Backend hiện chưa code logic này nên sẽ fail)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  // TC-07: (Thành công) - Thực hiện đánh giá đính kèm sản phẩm (product_id)
  it('TC-07: (Thành công) - Thực hiện đánh giá đính kèm sản phẩm (product_id)', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 4,
        content: 'Điện thoại xài rất mượt',
        product_id: validProductIdB,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toHaveProperty('user_id', userIdB);
    expect(res.body.data).toHaveProperty('product_id', validProductIdB);
    expect(res.body.data).toHaveProperty('level', 4);
  });

  // TC-08: (Thành công) - Thực hiện đánh giá đính kèm đơn hàng (purchase_id)
  it('TC-08: (Thành công) - Thực hiện đánh giá đính kèm đơn hàng (purchase_id)', async () => {
    const mockPurchaseId = 98765; // Mock ID giao dịch
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Giao hàng siêu nhanh, chủ shop thân thiện',
        purchase_id: mockPurchaseId,
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toHaveProperty('user_id', userIdB);
    expect(res.body.data).toHaveProperty('purchase_id', mockPurchaseId);
    expect(res.body.data).toHaveProperty('level', 5);
  });

  // TC-09: (Thất bại) - Không thể đánh giá sản phẩm của người đã block mình
  it('TC-09: (Thất bại) - Không thể đánh giá sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố đánh giá sản phẩm của B
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        product_id: validProductIdB,
        level: 5,
        content: 'Cố ý đánh giá sản phẩm của người đã block mình',
      });

    // 3. Kỳ vọng Backend chặn và báo Not Access (1009)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  // TC-10: (Thất bại) - Đánh giá cho sản phẩm không tồn tại
  it('TC-10: (Thất bại) - Đánh giá cho sản phẩm không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Đánh giá sản phẩm ảo',
        product_id: 999999, // ID không tồn tại
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  // TC-11: (Thất bại) - Đánh giá cho đơn hàng không tồn tại
  it('TC-11: (Thất bại) - Đánh giá cho đơn hàng không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/set_rates')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        user_id: userIdB,
        level: 5,
        content: 'Đánh giá đơn hàng ảo',
        purchase_id: 999999, // ID không tồn tại
      });

    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
