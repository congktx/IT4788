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

describe('Products - Report Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenUserA: string;
  let tokenUserB: string;
  let userIdA: number;
  let userIdB: number;
  let validProductIdB: number; // Sản phẩm của B để A report
  let categoryId: number;
  let addressId: number;
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

    // 1. Setup User A
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    let loginARes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });

    if (loginARes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-report' });
      loginARes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    tokenUserA = loginARes.body.data.token;
    userIdA = Number(loginARes.body.data.id);

    // 2. Setup User B (Sử dụng chuẩn thông tin của các test khác)
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

    // 3. Chuẩn bị dữ liệu nền (Category & Address)
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
        user_id: userIdB, ward_id: ward.id, address_name: 'Home Test',
        address_detail: '123 Test St', lat: 21.0285, lng: 105.8542, receiver_name: 'Test Receiver B', phone: '0955555555', full_address: '123 Test St, Dich Vong Hau, Ha Noi'
      });
    }
    addressId = address.id;

    // 4. Tạo sản phẩm cho User B (để User A có cái report)
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Sản phẩm của B',
        price: 80000000, description: 'Sản phẩm demo report',
        category_id: categoryId, ship_from_id: addressId,
        variants: [{ size: 'M', color: 'Black', stock: 5, weight: 2.1 }]
      });
    validProductIdB = addRes.body.data?.id || 1;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  // NHÓM 1: CÁC KỊCH BẢN THÀNH CÔNG VÀ LỖI CƠ BẢN
  it('TC-01: (Thành công) - Báo cáo sản phẩm hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Hàng giả',
        details: 'Tôi nghi ngờ đây là hàng nhái'
      });

    expect(String(res.body.code)).toBe('1000');
    expect(res.body.message).toBe('OK.');
    // Kiểm tra data trả ra xem reason có đúng format không
    expect(res.body.data).toHaveProperty('reason', '[Hàng giả] Tôi nghi ngờ đây là hàng nhái');
    expect(res.body.data).toHaveProperty('product_id', validProductIdB);
    expect(res.body.data).toHaveProperty('user_id', userIdA);
  });

  it('TC-02: (Thất bại) - Không truyền Body / Thiếu trường bắt buộc', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Thiếu details'
        // Không truyền details
      });

    expect(String(res.body.code)).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-03: (Thất bại) - Báo cáo sản phẩm không tồn tại (product_id sai)', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: 99999999,
        subject: 'Spam',
        details: 'Sản phẩm ảo'
      });

    expect(String(res.body.code)).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-04: (Thất bại) - Không có Token (Chưa đăng nhập)', async () => {
    const res = await request(baseURL)
      .post('/api/report_product')
      .send({
        product_id: validProductIdB,
        subject: 'Spam',
        details: 'Không token'
      });

    expect(String(res.body.code)).toBe('9998');
    expect(res.body.message).toBe('Token is invalid.');
  });

  // NHÓM 2: CÁC KỊCH BẢN CHẶN / TRẠNG THÁI SẢN PHẨM
  it('TC-05: (Thất bại) - Không thể report sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 0 }); // 0 = block

    // 2. User A cố report sản phẩm của B
    const res = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        product_id: validProductIdB,
        subject: 'Xúc phạm',
        details: 'Nội dung phản cảm'
      });

    // 3. Kỳ vọng Backend chặn lại và báo Not Access (Lưu ý: Backend hiện chưa code logic này nên sẽ fail)
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userIdA, type: 1 });
  });

  it('TC-06: (Thất bại) - Report sản phẩm đã bị xóa', async () => {
    // 1. User A tạo 1 sản phẩm
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Sản phẩm sắp xóa',
        price: 1000,
        description: 'Demo delete',
        category_id: categoryId,
        ship_from_id: addressId,
        variants: [{ size: 'S', color: 'White', stock: 1, weight: 0.1 }]
      });
    const tempProductId = addRes.body.data.id;

    // 2. User A tự xóa sản phẩm đó
    await request(baseURL)
      .post('/api/delete_product')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ id: tempProductId });

    // 3. User B cố report sản phẩm vừa bị xóa của A
    const reportRes = await request(baseURL)
      .post('/api/report_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        product_id: tempProductId,
        subject: 'Hàng giả',
        details: 'Report sản phẩm đã xóa'
      });

    // 4. Kỳ vọng báo lỗi 9992 Sản phẩm không tồn tại
    expect(String(reportRes.body.code)).toBe('9992');
    expect(reportRes.body.message).toBe('Product is not existed.');
  });
});
