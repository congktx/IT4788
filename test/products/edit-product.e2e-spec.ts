import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Edit Product (e2e)', () => {
  let app: INestApplication;
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
    const otherPhone = '0955555555';
    const otherPass = '123456';
    let otherLoginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: otherPhone, password: otherPass });

    if (otherLoginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: otherPhone, password: otherPass, uuid: 'mock-user-test-edit' });
      otherLoginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: otherPhone, password: otherPass });
    }
    otherUserToken = otherLoginRes.body.data.token;

    // 3. Chuẩn bị Category & Brand bằng API
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    if (catRes.body.code === '1000' && catRes.body.data && catRes.body.data.length > 0) {
      validCategoryId = catRes.body.data[0].id;
    } else {
      validCategoryId = 1;
    }

    const brandRes = await request(baseURL).post('/api/get_list_brands').send({ category_id: validCategoryId });
    if (brandRes.body.code === '1000' && brandRes.body.data && brandRes.body.data.length > 0) {
      validBrandId = brandRes.body.data[0].id;
    } else {
      validBrandId = 1;
    }

    // 4. Chuẩn bị Address cho User chính
    const addrResA = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${accessToken}`);
    if (addrResA.body.code === '1000' && addrResA.body.data && addrResA.body.data.length > 0) {
      validShipFromId = addrResA.body.data[0].id;
    } else {
      const addAddrA = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${accessToken}`).send({
        address: '123 Test St A',
        address_id: [1, 1],
        lat: 21.0285,
        lng: 105.8542,
        receiver_name: 'Test Receiver A',
        phone: context.phone_number,
        full_address: '123 Test St A, Ha Noi',
        address_detail: '123 Test St A',
        is_default: true
      });
      if (addAddrA.body.code === '1000' && addAddrA.body.data) {
        validShipFromId = addAddrA.body.data.id;
      } else {
        validShipFromId = 1;
      }
    }

    // 5. Chuẩn bị Address cho User phụ
    let otherShipFromId = 1;
    const addrResB = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${otherUserToken}`);
    if (addrResB.body.code === '1000' && addrResB.body.data && addrResB.body.data.length > 0) {
      otherShipFromId = addrResB.body.data[0].id;
    } else {
      const addAddrB = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${otherUserToken}`).send({
        address: '123 Test St B',
        address_id: [1, 1],
        lat: 21.0285,
        lng: 105.8542,
        receiver_name: 'Test Receiver B',
        phone: otherPhone,
        full_address: '123 Test St B, Ha Noi',
        address_detail: '123 Test St B',
        is_default: true
      });
      if (addAddrB.body.code === '1000' && addAddrB.body.data) {
        otherShipFromId = addAddrB.body.data.id;
      }
    }

    // 6. Tạo sản phẩm của User chính
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

    // 7. Tạo sản phẩm của User phụ
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
    if (app) {
      await app.close();
    }
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
    expect(res.body.data.variants[1].size).toBe('13 inch');
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
