import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Products - Get List Products (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let baseURL: string | any;

  // Lưu ID của các sản phẩm đã tạo để kiểm tra
  const createdProductIds: number[] = [];

  beforeAll(async () => {
    // Đọc thông tin user từ context
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

    // Login để lấy token
    const { phone_number, password } = context;
    let loginRes = await request(baseURL)
      .post('/auth/login')
      .send({ phone_number, password });

    // Nếu user không tồn tại, tự động tạo lại
    if (loginRes.body.code === '9995') {
      await request(baseURL)
        .post('/auth/signup')
        .send({ phone_number, password, uuid: 'auto-recreate-user' });

      loginRes = await request(baseURL)
        .post('/auth/login')
        .send({ phone_number, password });
    }

    if (loginRes.body.code !== '1000') {
      console.error('Login failed in GetListProducts E2E setup:', loginRes.body);
    }

    accessToken = loginRes.body.data?.token;

    // CHUẨN BỊ DỮ LIỆU HỢP LỆ BẰNG API

    // Danh mục
    let categoryId = 1;
    const catRes = await request(baseURL).post('/api/get_categories').send({});
    if (catRes.body.code === '1000' && catRes.body.data && catRes.body.data.length > 0) {
      categoryId = catRes.body.data[0].id;
    }

    // Địa chỉ giao hàng
    let addressId = 1;
    const addrRes = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${accessToken}`);
    if (addrRes.body.code === '1000' && addrRes.body.data && addrRes.body.data.length > 0) {
      addressId = addrRes.body.data[0].id;
    } else {
      const addAddrRes = await request(baseURL).post('/order/add_order_address').set('Authorization', `Bearer ${accessToken}`).send({
        address: '123 Test St',
        address_id: [1, 1],
        lat: 21.0285,
        lng: 105.8542,
        receiver_name: 'Test Receiver',
        phone: phone_number,
        full_address: '123 Test St, Ha Noi',
        address_detail: '123 Test St',
        is_default: true
      });
      if (addAddrRes.body.code === '1000' && addAddrRes.body.data) {
        addressId = addAddrRes.body.data.id;
      }
    }

    // Tạo 3 sản phẩm thực tế để test phân trang
    const testProducts = [
      {
        title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        price: 29990000,
        description: 'iPhone 15 Pro Max nguyên seal, thiết kế titan mới, chip A17 Pro mạnh mẽ, camera zoom quang 5x...',
        variants: [{ size: '256GB', color: 'Natural Titanium', stock: 50, weight: 0.22 }]
      },
      {
        title: 'Samsung Galaxy S24 Ultra 5G 512GB',
        price: 28500000,
        description: 'Samsung Galaxy S24 Ultra siêu phẩm AI, camera 200MP zoom không gian, pin 5000mAh kèm bút S-Pen.',
        variants: [{ size: '512GB', color: 'Titanium Black', stock: 30, weight: 0.23 }]
      },
      {
        title: 'iPad Pro 11 inch M4 2024 Wifi 256GB',
        price: 26000000,
        description: 'iPad Pro thế hệ mới mỏng nhất từ trước đến nay, trang bị chip M4 đỉnh cao, màn hình OLED 120Hz siêu nét.',
        variants: [{ size: '11 inch', color: 'Space Black', stock: 15, weight: 0.44 }]
      }
    ];

    for (const prod of testProducts) {
      const addRes = await request(baseURL)
        .post('/api/add_product')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: prod.title,
          price: prod.price,
          description: prod.description,
          category_id: categoryId,
          ship_from_id: addressId,
          variants: prod.variants
        });

      if (addRes.body.code === '1000' && addRes.body.data?.id) {
        createdProductIds.push(addRes.body.data.id);
      }
    }

    console.log(`[TEST SETUP] Created ${createdProductIds.length} products for get_list_products test`);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // NHÓM 1: TRƯỜNG HỢP THÀNH CÔNG
  it('TC-01: (Thành công) - Lấy danh sách sản phẩm với index=0, count=10', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 10 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('TC-02: (Thành công) - Phân trang: lấy count=1 ở index=0', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 1 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('TC-03: (Thành công) - Phân trang: 2 trang dữ liệu không trùng nhau', async () => {
    // Lấy trang 1 và trang 2, đảm bảo không có sản phẩm nào bị lặp
    const resPage1 = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 2 });

    const resPage2 = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 2, count: 2 });

    expect(resPage1.body.code).toBe('1000');
    expect(resPage2.body.code).toBe('1000');

    if (resPage2.body.data && resPage2.body.data.length > 0) {
      const ids1 = resPage1.body.data.map((p: any) => p.id);
      const ids2 = resPage2.body.data.map((p: any) => p.id);
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('TC-04: (Thành công) - Kiểm tra cấu trúc dữ liệu trả về', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 1 });

    expect(res.body.code).toBe('1000');
    expect(res.body.data.length).toBe(1);

    const product = res.body.data[0];
    // Kiểm tra sản phẩm trả về có đủ các trường cơ bản
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('title');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('seller_id');
  });

  it('TC-05: (Thành công) - Sản phẩm trả về theo thứ tự id DESC (mới nhất trước)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 10 });

    expect(res.body.code).toBe('1000');

    const data = res.body.data;
    if (data.length >= 2) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(Number(data[i].id)).toBeGreaterThan(Number(data[i + 1].id));
      }
    }
  });

  it('TC-05b: (Thành công) - Sản phẩm mới thêm vào luôn xuất hiện ở đầu danh sách', async () => {
    const res1 = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 3 });

    expect(res1.body.code).toBe('1000');
    const oldTopProductIds = res1.body.data.map((p: any) => p.id);

    const catRes = await request(baseURL).post('/api/get_categories').send({});
    const categoryId = catRes.body.data?.[0]?.id || 1;

    const addrRes = await request(baseURL).get('/order/get_list_order_address').set('Authorization', `Bearer ${accessToken}`);
    const addressId = addrRes.body.data?.[0]?.id || 1;

    const addRes = await request(baseURL)
      .post('/api/add_product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'AirPods Pro 2 (USB-C) Chính hãng VN/A',
        price: 5500000,
        description: 'Tai nghe Bluetooth Apple AirPods Pro 2 cổng sạc Type-C, công nghệ chống ồn chủ động (ANC) xuất sắc, xuyên âm tự nhiên.',
        category_id: categoryId,
        ship_from_id: addressId,
        variants: [{ size: 'Tiêu chuẩn', color: 'White', stock: 100, weight: 0.05 }]
      });

    expect(addRes.body.code).toBe('1000');
    const newProductId = addRes.body.data.id;

    // Bước 3: Lấy lại 3 sản phẩm đầu tiên
    const res2 = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 3 });

    expect(res2.body.code).toBe('1000');
    const newTopProductIds = res2.body.data.map((p: any) => p.id);

    expect(newTopProductIds[0]).toBe(newProductId);
    if (oldTopProductIds.length >= 2) {
      expect(newTopProductIds[1]).toBe(oldTopProductIds[0]);
      expect(newTopProductIds[2]).toBe(oldTopProductIds[1]);
    }
  });

  // NHÓM 2: THIẾU THAM SỐ (1002)
  it('TC-06: (Thất bại) - Thiếu cả index và count', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-07: (Thất bại) - Thiếu index', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ count: 10 });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-08: (Thất bại) - Thiếu count', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0 });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });


  // NHÓM 3: KHÔNG CÓ DỮ LIỆU (9994)
  it('TC-09: (Thất bại) - index quá lớn, vượt ngoài dữ liệu', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 999999, count: 10 });

    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  it('TC-10: (Thất bại) - count=0, không lấy sản phẩm nào', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 0 });

    // count=0 → lấy 0 sản phẩm → mảng rỗng → trả về 9994
    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });


  // NHÓM 4: API CÔNG KHAI (KHÔNG CẦN ĐĂNG NHẬP)
  it('TC-11: (Thành công) - Gọi API mà không cần đăng nhập (API công khai)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 5 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
  });


  // NHÓM 5: GIÁ TRỊ BIÊN
  it('TC-12: (Thành công) - count lớn hơn tổng số sản phẩm', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: 99999 });

    // Vẫn thành công, chỉ trả về tất cả sản phẩm có
    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('TC-13: (Thành công) - index và count là chuỗi số ("0", "5") vẫn hoạt động', async () => {
    // Controller dùng Number() để chuyển đổi kiểu
    // Chuỗi "0" !== undefined nên vẫn qua được bước kiểm tra thiếu tham số
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: '0', count: '5' });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  it('TC-14: (Kiểm tra) - index là chuỗi chữ ("abc") → NaN, kết quả phụ thuộc CSDL', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 'abc', count: 5 });
    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-15: (Kiểm tra) - index âm (-1)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: -1, count: 5 });
    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-16: (Kiểm tra) - count âm (-5)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: 0, count: -5 });

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  // NHÓM 6: BODY KHÔNG HỢP LỆ
  it('TC-17: (Thất bại) - Không gửi body (request rỗng)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products');

    // Không gửi body → index và count đều undefined → thiếu tham số → 1002
    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enough.');
  });

  it('TC-18: (Thất bại) - index=null, count=null', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_products')
      .send({ index: null, count: null });

    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });
});
