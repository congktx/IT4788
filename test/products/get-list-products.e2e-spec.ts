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

describe('Products - Get List Products (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

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

    dataSource = app.get<DataSource>(DataSource);

    // Login để lấy token
    const { phone_number, password } = context;
    let loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone_number, password });

    // Nếu user không tồn tại, tự động tạo lại
    if (loginRes.body.code === '9995') {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ phone_number, password, uuid: 'auto-recreate-user' });

      loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone_number, password });
    }

    if (loginRes.body.code !== '1000') {
      console.error('Login failed in GetListProducts E2E setup:', loginRes.body);
    }

    accessToken = loginRes.body.data?.token;
    const userId = Number(loginRes.body.data?.id);

    // CHUẨN BỊ DỮ LIỆU HỢP LỆ
    const categoryRepo = dataSource.getRepository(Category);
    const addressRepo = dataSource.getRepository(Address);
    const provinceRepo = dataSource.getRepository(Province);
    const wardRepo = dataSource.getRepository(Ward);

    // Danh mục
    let category = await categoryRepo.findOne({ where: {} });
    if (!category) {
      category = await categoryRepo.save({ name: 'Dien tu', description: 'Category for testing' });
    }

    // Địa chỉ giao hàng
    let address = await addressRepo.findOne({ where: { user_id: userId } });
    if (!address) {
      let province = await provinceRepo.findOne({ where: {} });
      if (!province) {
        province = await provinceRepo.save({ name: 'Ha Noi' });
      }
      let ward = await wardRepo.findOne({ where: { provinces_id: province.id } });
      if (!ward) {
        ward = await wardRepo.save({ name: 'Dich Vong Hau', provinces_id: province.id });
      }
      address = await addressRepo.save({
        user_id: userId,
        ward_id: ward.id,
        address_name: 'Home Test',
        address_detail: '123 Test St',
        lat: 21.0285,
        lng: 105.8542,
        receiver_name: 'Test Receiver',
        phone: phone_number,
        full_address: '123 Test St, Dich Vong Hau, Ha Noi'
      });
    }

    // Tạo 3 sản phẩm để test phân trang
    for (let i = 1; i <= 3; i++) {
      const addRes = await request(app.getHttpServer())
        .post('/api/add_product')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `SP GetList Test ${i}`,
          price: 100000 * i,
          price_discount: 90000 * i,
          description: `Mô tả sản phẩm test ${i}`,
          category_id: category.id,
          ship_from_id: address.id,
          variants: [{ size: 'M', color: 'Black', stock: 10, weight: 0.5 }]
        });

      if (addRes.body.code === '1000' && addRes.body.data?.id) {
        createdProductIds.push(addRes.body.data.id);
      }
    }

    console.log(`[TEST SETUP] Created ${createdProductIds.length} products for get_list_products test`);
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });


  // NHÓM 1: TRƯỜNG HỢP THÀNH CÔNG


  it('TC-01: (Thành công) - Lấy danh sách sản phẩm với index=0, count=10', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 10 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('TC-02: (Thành công) - Phân trang: lấy count=1 ở index=0', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 1 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it('TC-03: (Thành công) - Phân trang: 2 trang dữ liệu không trùng nhau', async () => {
    // Lấy trang 1 và trang 2, đảm bảo không có sản phẩm nào bị lặp
    const resPage1 = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 2 });

    const resPage2 = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 2, count: 2 });

    expect(resPage1.body.code).toBe('1000');
    expect(resPage2.body.code).toBe('1000');

    // So sánh: 2 trang không có sản phẩm nào bị trùng ID
    if (resPage2.body.data && resPage2.body.data.length > 0) {
      const ids1 = resPage1.body.data.map((p: any) => p.id);
      const ids2 = resPage2.body.data.map((p: any) => p.id);
      const overlap = ids1.filter((id: number) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('TC-04: (Thành công) - Kiểm tra cấu trúc dữ liệu trả về', async () => {
    const res = await request(app.getHttpServer())
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
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 10 });

    expect(res.body.code).toBe('1000');

    const data = res.body.data;
    if (data.length >= 2) {
      // Kiểm tra ID giảm dần → sản phẩm mới nhất lên đầu
      for (let i = 0; i < data.length - 1; i++) {
        expect(Number(data[i].id)).toBeGreaterThan(Number(data[i + 1].id));
      }
    }
  });

  // ═══════════════════════════════════════════════
  // NHÓM 2: THIẾU THAM SỐ (1002)
  // ═══════════════════════════════════════════════

  it('TC-06: (Thất bại) - Thiếu cả index và count', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({});

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-07: (Thất bại) - Thiếu index', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ count: 10 });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-08: (Thất bại) - Thiếu count', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0 });

    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  // ═══════════════════════════════════════════════
  // NHÓM 3: KHÔNG CÓ DỮ LIỆU (9994)
  // ═══════════════════════════════════════════════

  it('TC-09: (Thất bại) - index quá lớn, vượt ngoài dữ liệu', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 999999, count: 10 });

    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  it('TC-10: (Thất bại) - count=0, không lấy sản phẩm nào', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 0 });

    // count=0 → lấy 0 sản phẩm → mảng rỗng → trả về 9994
    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  // ═══════════════════════════════════════════════
  // NHÓM 4: API CÔNG KHAI (KHÔNG CẦN ĐĂNG NHẬP)
  // ═══════════════════════════════════════════════

  it('TC-11: (Thành công) - Gọi API mà không cần đăng nhập (API công khai)', async () => {
    // get_list_products KHÔNG có bảo vệ AuthGuard → ai cũng gọi được
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: 5 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ═══════════════════════════════════════════════
  // NHÓM 5: GIÁ TRỊ BIÊN
  // ═══════════════════════════════════════════════

  it('TC-12: (Thành công) - count lớn hơn tổng số sản phẩm', async () => {
    const res = await request(app.getHttpServer())
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
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: '0', count: '5' });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  it('TC-14: (Kiểm tra) - index là chuỗi chữ ("abc") → NaN, kết quả phụ thuộc CSDL', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 'abc', count: 5 });

    // Number('abc') = NaN → bỏ qua NaN phần tử → kết quả phụ thuộc CSDL
    // Nếu CSDL báo lỗi khi nhận NaN → trả về 9999
    // Nếu CSDL tự chuyển NaN thành 0 → có thể trả về 1000
    // Chỉ đảm bảo API không bị sập (có trả về mã code)
    expect(res.body.code).toBeDefined();
  });

  it('TC-15: (Kiểm tra) - index âm (-1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: -1, count: 5 });

    // index âm → bỏ qua -1 phần tử → kết quả phụ thuộc CSDL
    // Chỉ đảm bảo API không bị sập
    expect(res.body.code).toBeDefined();
  });

  it('TC-16: (Kiểm tra) - count âm (-5)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: 0, count: -5 });

    // count âm → lấy -5 phần tử → kết quả phụ thuộc CSDL
    // Có thể trả về 9994 (không có dữ liệu) hoặc 9999 (lỗi)
    expect(res.body.code).toBeDefined();
  });

  // ═══════════════════════════════════════════════
  // NHÓM 6: BODY KHÔNG HỢP LỆ
  // ═══════════════════════════════════════════════

  it('TC-17: (Thất bại) - Không gửi body (request rỗng)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products');

    // Không gửi body → index và count đều undefined → thiếu tham số → 1002
    expect(res.body.code).toBe('1002');
    expect(res.body.message).toBe('Parameter is not enought.');
  });

  it('TC-18: (Thất bại) - index=null, count=null', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/get_list_products')
      .send({ index: null, count: null });

    // null !== undefined → qua được bước kiểm tra thiếu tham số
    // Nhưng Number(null) = 0 → bỏ qua 0, lấy 0 sản phẩm → mảng rỗng → 9994
    expect(res.body.code).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });
});
