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
import { Brand } from '../../src/modules/products/entities/brand.entity';
import { Province } from '../../src/modules/orders/entities/province.entity';
import { Ward } from '../../src/modules/orders/entities/ward.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Products - Edit Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let otherUserToken: string;
  let validCategoryId: number;
  let validShipFromId: number;
  let validBrandId: number;
  let myProductId: number;
  let otherProductId: number;
  let baseURL: string | any;

  beforeAll(async () => {
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại!');
    }
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    // 1. Login User chính
    let loginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: context.phone_number, password: context.password });
      
    if (loginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: context.phone_number, password: context.password, uuid: 'user-a-edit-uuid' });
      loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: context.phone_number, password: context.password });
    }
    accessToken = loginRes.body.data?.token;

    // 2. Setup User phụ (otherUser) bằng API
    const otherPhone = '0988888899';
    const otherPass = '123456';
    let otherLoginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: otherPhone, password: otherPass });

    if (otherLoginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: otherPhone, password: otherPass, uuid: 'otheruser-edit-uuid' });
      otherLoginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: otherPhone, password: otherPass });
    }
    otherUserToken = otherLoginRes.body.data.token;

    const categoryRepo = dataSource.getRepository(Category);
    const brandRepo = dataSource.getRepository(Brand);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);
    const addressRepo = dataSource.getRepository(Address);

    let category = await categoryRepo.findOne({ where: {} });
    if (!category) category = await categoryRepo.save({ name: 'Dien tu', description: 'Test' });
    validCategoryId = category.id;

    let brand = await brandRepo.findOne({ where: {} });
    if (!brand) brand = await brandRepo.save({ name: 'Apple' });
    validBrandId = brand.id;

    let province = await provinceRepo.findOne({ where: {} });
    if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
    let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
    if (!ward) ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });

    const userId = loginRes.body.data?.id;
    let address = await addressRepo.save({
      user_id: userId,
      ward_id: ward.id,
      address_name: 'Home',
      address_detail: '123 Test',
      lat: 0, lng: 0, receiver_name: 'Test', phone: '0123456789', full_address: 'Full'
    });
    validShipFromId = address.id;

    const otherUserId = otherLoginRes.body.data.id;
    const otherAddress = await addressRepo.save({
      user_id: otherUserId,
      ward_id: ward.id,
      address_name: 'Other Home',
      address_detail: '456 Other St',
      lat: 0, lng: 0, receiver_name: 'Other', phone: otherPhone, full_address: 'Other Full'
    });
    const otherShipFromId = otherAddress.id;


    const myProdRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'MacBook Air M1',
        price: 18000000,
        description: 'MacBook Air M1 chính hãng VN/A',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: '13 inch', color: 'Space Gray', stock: 10, weight: 1.29 }]
      });
    myProductId = myProdRes.body.data?.id;

    // 5. Tạo sản phẩm của User phụ
    const otherProdRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        title: 'MacBook Pro M2 (Người khác)',
        price: 25000000,
        description: 'MacBook Pro M2 256GB',
        category_id: validCategoryId,
        ship_from_id: otherShipFromId,
        variants: [{ size: '13 inch', color: 'Silver', stock: 5, weight: 1.4 }]
      });
    otherProductId = otherProdRes.body.data?.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  //TEST CASES 

  it('TC-01: (Thành công) - Chỉnh sửa toàn bộ thông tin sản phẩm', async () => {
    const updateData = {
      title: 'MacBook Air M1 (Đã qua sử dụng)',
      price: 15000000,
      description: 'MacBook Air M1 cũ hình thức 99%',
      category_id: validCategoryId,
      ship_from_id: validShipFromId,
      variants: [{ size: '13 inch', color: 'Silver', stock: 5, weight: 1.29 }]
    };

    const res = await request(baseURL)
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.title).toBe(updateData.title);
    expect(String(res.body.data.price)).toBe(String(updateData.price));
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data.variants[0].size).toBe('13 inch');
  });

  it('TC-02: (Thành công) - Cập nhật một phần (chỉ đổi giá)', async () => {
    const res = await request(baseURL)
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ price: 14500000 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(String(res.body.data.price)).toBe('14500000');
    expect(res.body.data.title).toBe('MacBook Air M1 (Đã qua sử dụng)');
  });

  it('TC-03: (Thất bại) - Sửa sản phẩm không tồn tại', async () => {
    const res = await request(baseURL)
      .patch('/api/update/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Sản phẩm không tồn tại' });

    expect(res.body.code).toBe('9992'); // PRODUCT_NOT_EXISTED
    expect(res.body.message).toBe('Product is not existed.');
  });

  it('TC-04: (Thất bại) - Sửa sản phẩm của người khác (Check NOT_ACCESS)', async () => {
    const res = await request(baseURL)
      .patch(`/api/update/${otherProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Cố tình đổi tên sản phẩm của người khác' });

    expect(res.body.code).toBe('1009'); // NOT_ACCESS
    expect(res.body.message).toBe('Not access.');
  });

  it('TC-05: (Thất bại) - Variants không hợp lệ (stock âm)', async () => {
    const res = await request(baseURL)
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        variants: [{ size: '13 inch', color: 'Space Gray', stock: -1, weight: 1 }]
      });

    expect(res.body.code).toBe('1004'); // PARAMETER_VALUE_INVALID
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-06: (Thành công) - Thêm và xóa ảnh', async () => {
    // Thêm ảnh ban đầu qua API thay vì DB để chạy remote
    await request(baseURL)
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ image_urls: ['img1.jpg', 'img2.jpg'] });

    const res = await request(baseURL)
      .patch(`/api/update/${myProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        image_urls: ['img3.jpg'], // Upload mới
        image_urls_del: ['img1.jpg'] // Xóa ảnh cũ
      });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.image_urls).toContain('img2.jpg');
    expect(res.body.data.image_urls).toContain('img3.jpg');
    expect(res.body.data.image_urls).not.toContain('img1.jpg');
  });

  it('TC-07: (Thất bại) - Sửa sản phẩm vừa bị xóa', async () => {
    // 1. Tạo sản phẩm mới
    const myProdRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'AirPods (Sắp bị xóa)',
        price: 3000000,
        description: 'Tai nghe sắp bị xóa khỏi hệ thống',
        category_id: validCategoryId,
        ship_from_id: validShipFromId,
        variants: [{ size: 'Tiêu chuẩn', color: 'Trắng', stock: 5, weight: 0.1 }]
      });
    const tempProductId = myProdRes.body.data?.id;

    // 2. Xóa sản phẩm
    await request(baseURL)
      .delete(`/api/delete/${tempProductId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // 3. Cố gắng update sản phẩm đã xóa
    const res = await request(baseURL)
      .patch(`/api/update/${tempProductId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Cố gắng sửa' });

    expect(res.body.code).toBe('9992'); // PRODUCT_NOT_EXISTED
    expect(res.body.message).toBe('Product is not existed.');
  });
});
