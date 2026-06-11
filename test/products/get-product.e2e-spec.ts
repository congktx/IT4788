import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Get Product (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  // ID sản phẩm thật, được tạo trong beforeAll để dùng cho các test case thành công
  let validProductId: number;
  let baseURL: string | any;
  let userId: number;
  let tokenUserB: string;
  let productBId: number;

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
        .send({ phone_number, password, uuid: 'auto-recreate-user-get-prod' });
      loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number, password });
    }

    accessToken = loginRes.body.data?.token;
    userId = Number(loginRes.body.data?.id);

    // === CHUẨN BỊ DỮ LIỆU NỀN BẰNG API ===
    // 1. Lấy danh mục
    let categoryId = 1;
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    if (catRes.body.code === '1000' && catRes.body.data && catRes.body.data.length > 0) {
      categoryId = catRes.body.data[0].id;
    }

    // 2. Lấy hoặc tạo địa chỉ giao hàng cho User A
    let addressId = 1;
    const addrRes = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${accessToken}`);
    if (addrRes.body.code === '1000' && addrRes.body.data && addrRes.body.data.length > 0) {
      addressId = addrRes.body.data[0].id;
    } else {
      const addAddrRes = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${accessToken}`).send({
         address: '123 Test St A',
         address_id: [1, 1],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver A',
         phone: phone_number,
         full_address: '123 Test St A, Ha Noi',
         address_detail: '123 Test St A',
         is_default: true
      });
      if (addAddrRes.body.code === '1000' && addAddrRes.body.data) {
        addressId = addAddrRes.body.data.id;
      }
    }

    // 3. Tạo 1 sản phẩm mẫu để dùng cho các test case "thành công"
    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Apple Watch Ultra',
        price: 20000000,
        description: 'Apple Watch Ultra viền Titanium',
        category_id: categoryId,
        ship_from_id: addressId,
        variants: [{ size: '49mm', color: 'Titanium', stock: 5, weight: 0.1 }]
      });

    if (addRes.body.code === '1000' && addRes.body.data?.id) {
      validProductId = addRes.body.data.id;
    }

    console.log(`[SETUP] Đã tạo sản phẩm mẫu với ID = ${validProductId}`);

    // 4. Setup User B qua API để test Remote
    const phoneB = '0955555555';
    const passB = '123456';
    let loginBRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number: phoneB, password: passB });
      
    if (loginBRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number: phoneB, password: passB, uuid: 'mock-user-test-get-product' });
      loginBRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number: phoneB, password: passB });
    }
    tokenUserB = loginBRes.body.data.token;

    // 5. Lấy hoặc tạo địa chỉ giao hàng cho User B
    let addressIdB = 1;
    const addrResB = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${tokenUserB}`);
    if (addrResB.body.code === '1000' && addrResB.body.data && addrResB.body.data.length > 0) {
      addressIdB = addrResB.body.data[0].id;
    } else {
      const addAddrResB = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${tokenUserB}`).send({
         address: '123 Test St B',
         address_id: [1, 1],
         lat: 21.0285,
         lng: 105.8542,
         receiver_name: 'Test Receiver B',
         phone: phoneB,
         full_address: '123 Test St B, Ha Noi',
         address_detail: '123 Test St B',
         is_default: true
      });
      if (addAddrResB.body.code === '1000' && addAddrResB.body.data) {
        addressIdB = addAddrResB.body.data.id;
      }
    }

    // 6. User B tạo một sản phẩm mẫu
    const addProductBRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'MacBook Air M2',
        price: 25000000, description: 'Sản phẩm của User B',
        category_id: categoryId, ship_from_id: addressIdB,
        variants: [{ size: '13 inch', color: 'Midnight', stock: 5, weight: 1.2 }]
      });
    productBId = addProductBRes.body?.data?.id || 2;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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
    expect(res.body.message).toBe('OK.');
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
    expect(res.body.message).toBe('OK.');
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
    expect(res.body.message).toBe('OK.');
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
    expect(res.body.message).toBe('OK.');
    expect(res.body.data.id).toBe(validProductId);
  });

  // NHÓM 6: KIỂM TRA BLOCK USER
  it('TC-16: (Thất bại) - Không thể xem sản phẩm của người đã block mình', async () => {
    // 1. User B block User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userId, type: 0 }); // 0 = block

    // 2. User A cố gắng xem sản phẩm của User B
    const res = await request(baseURL)
      .post('/api/get_products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ id: productBId });

    // 3. Phải báo lỗi 1009 (Not Access) do đã bị block
    expect(String(res.body.code)).toBe('1009');
    expect(res.body.message).toBe('Not access.');

    // 4. Clean up: User B unblock User A
    await request(baseURL)
      .post('/set_user_block')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ user_id: userId, type: 1 });
  });
});
