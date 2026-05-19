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

describe('Products - Get Product (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  // ID sản phẩm thật, được tạo trong beforeAll để dùng cho các test case thành công
  let validProductId: number;
  let baseURL: string | any;

  beforeAll(async () => {
    // Đọc thông tin đăng nhập từ file context (đã được tạo bởi test 1-signup)
    const contextPath = path.join(__dirname, '..', 'auth', 'test-context.json');
    if (!fs.existsSync(contextPath)) {
      throw new Error('File test-context.json không tồn tại! Hãy chạy 1-signup trước.');
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

    // Đăng nhập để lấy token (cần token để tạo sản phẩm mẫu)
    const { phone_number, password } = context;
    let loginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number, password });

    // Nếu tài khoản chưa tồn tại (do DB bị reset), tự động đăng ký lại
    if (loginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number, password, uuid: 'auto-recreate-user' });
      loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number, password });
    }

    accessToken = loginRes.body.data?.token;
    const userId = Number(loginRes.body.data?.id);

    // === CHUẨN BỊ DỮ LIỆU NỀN ===
    const categoryRepo = dataSource.getRepository(Category);
    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    // Tạo danh mục nếu chưa có
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) {
      category = await categoryRepo.save({ name: 'Dien tu', description: 'Danh muc test' });
    }

    // Tạo địa chỉ giao hàng nếu chưa có
    let address = await addressRepo.findOne({ where: { user_id: userId } });
    if (!address) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) province = await provinceRepo.save({ name: 'Ha Noi' });
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });
      address = await addressRepo.save({
        user_id: userId, ward_id: ward.id, address_name: 'Home',
        address_detail: '123 Test', lat: 21.0285, lng: 105.8542,
        receiver_name: 'Nguoi nhan', phone: phone_number,
        full_address: '123 Test, Dich Vong Hau, Ha Noi'
      });
    }

    // Tạo 1 sản phẩm mẫu để dùng cho các test case "thành công"
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Apple Watch Ultra',
        price: 20000000,
        description: 'Apple Watch Ultra viền Titanium',
        category_id: category.id,
        ship_from_id: address.id,
        variants: [{ size: '49mm', color: 'Titanium', stock: 5, weight: 0.1 }]
      });

    if (addRes.body.code === '1000' && addRes.body.data?.id) {
      validProductId = addRes.body.data.id;
    }

    console.log(`[SETUP] Đã tạo sản phẩm mẫu với ID = ${validProductId}`);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await app.close();
  });

  // NHÓM 1: TRƯỜNG HỢP THÀNH CÔNG
  it('TC-01: (Thành công) - Lấy sản phẩm bằng ID hợp lệ', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: validProductId });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(validProductId);
  });

  it('TC-02: (Thành công) - Kiểm tra cấu trúc dữ liệu trả về có đầy đủ các trường', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: validProductId });

    expect(res.body.code).toBe('1000');
    const product = res.body.data;
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('title');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('description');
    expect(product).toHaveProperty('seller_id');
    expect(product).toHaveProperty('category_id');
    expect(product).toHaveProperty('ship_from_id');
  });


  it('TC-03: (Thành công) - Dữ liệu trả về khớp với sản phẩm đã tạo', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: validProductId });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.title).toBe('Apple Watch Ultra');
    // price lưu dạng decimal trong DB nên có thể trả về dạng string
    expect(Number(res.body.data.price)).toBe(20000000);
  });


  // NHÓM 2: THIẾU THAM SỐ (mã 1002)
  it('TC-04: (Thất bại) - Không gửi trường id trong body', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });


  it('TC-05: (Thất bại) - Gửi id là chuỗi rỗng ""', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: '' });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-06: (Thất bại) - Gửi id = null', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: null });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });


  it('TC-07: (Thất bại) - Gửi id = 0 (falsy)', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: 0 });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });


  it('TC-08: (Thất bại) - Không gửi body gì cả', async () => {
    const res = await request(baseURL)
      .post('/api/get_products');

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  // NHÓM 3: SẢN PHẨM KHÔNG TỒN TẠI (mã 9992)

  it('TC-09: (Thất bại) - ID không tồn tại trong CSDL (id=999999)', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: 999999 });

    expect(res.body.code).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });


  it('TC-10: (Thất bại) - Gửi id âm (-1)', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: -1 });

    expect(res.body.code).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });


  // NHÓM 4: API CÔNG KHAI (KHÔNG CẦN ĐĂNG NHẬP)

  it('TC-11: (Thành công) - Gọi API không cần đăng nhập vẫn lấy được sản phẩm', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: validProductId });

    // Không gửi token nhưng vẫn phải thành công vì API là công khai
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
  });


  // NHÓM 5: GIÁ TRỊ BIÊN VÀ KIỂU DỮ LIỆU BẤT THƯỜNG

  it('TC-12: (Kiểm tra) - Gửi id là chuỗi chữ ("abc"), kết quả phụ thuộc CSDL', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: 'abc' });

    // API không bị sập, phải trả về mã code (9992 hoặc 9999)
    expect(res.body.code).toBeDefined();
    expect(['9992', '9999']).toContain(res.body.code);
  });


  it('TC-13: (Kiểm tra) - Gửi id là chuỗi số, CSDL tự ép kiểu', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: String(validProductId) });

    // CSDL tự chuyển chuỗi số thành số → tìm thấy sản phẩm → 1000
    expect(res.body.code).toBe('1000');
    expect(res.body.data.id).toBe(validProductId);
  });


  it('TC-14: (Thất bại) - Gửi id là số thực (1.5)', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: 1.5 });

    // Không có sản phẩm nào có id=1.5 → 9992
    expect(res.body.code).toBe('9992');
    expect(res.body.message).toBe('Product is not existed.');
  });


  it('TC-15: (Thành công) - Gửi thêm trường thừa không ảnh hưởng kết quả', async () => {
    const res = await request(baseURL)
      .post('/api/get_products')
      .send({ id: validProductId, name: 'fake', extra: 123 });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.id).toBe(validProductId);
  });
});
