import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Products - Get List Brands (e2e)', () => {
  let app: INestApplication;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ═══════════════════════════════════════════════
  // NHÓM 1: CÁC KỊCH BẢN THÀNH CÔNG (HAPPY PATHS)
  // ═══════════════════════════════════════════════

  it('TC-01: (Thành công) - Lấy toàn bộ danh sách thương hiệu (không truyền category_id)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ index: 0, count: 10 });

    if (res.body.code === '1000') {
      console.log('====== DANH SÁCH BRANDS TRÊN SERVER ======');
      console.log(JSON.stringify(res.body.data, null, 2));
      console.log('==========================================');
    } else {
      console.log('Không có brand nào trên server hoặc có lỗi:', res.body);
    }

    expect(['1000', '9994']).toContain(res.body.code); // 1000 nếu có data, 9994 nếu chưa có brand nào trong DB
    if (res.body.code === '1000') {
      expect(res.body.message).toBe('OK.');
      expect(Array.isArray(res.body.data)).toBe(true);
    } else {
      expect(res.body.message).toBe('No Data or end of list data.');
    }
  });

  it('TC-02: (Thành công) - Lấy danh sách thương hiệu theo một category_id hợp lệ', async () => {
    // category_id=1 thường là danh mục Điện Tử (từ các file test trước)
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ category_id: 1, index: 0, count: 10 });

    expect(['1000', '9994']).toContain(res.body.code);
    if (res.body.code === '1000') {
      expect(res.body.message).toBe('OK.');
      expect(Array.isArray(res.body.data)).toBe(true);
    } else {
      expect(res.body.message).toBe('No Data or end of list data.');
    }
  });

  it('TC-03: (Thành công) - Kiểm tra tính năng phân trang (index=0, count=2)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ index: 0, count: 2 });

    expect(['1000', '9994']).toContain(res.body.code);
    if (res.body.code === '1000') {
      expect(res.body.message).toBe('OK.');
      expect(Array.isArray(res.body.data)).toBe(true);
      // Mảng trả về không được vượt quá số count (2)
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    } else {
      expect(res.body.message).toBe('No Data or end of list data.');
    }
  });

  // ═══════════════════════════════════════════════
  // NHÓM 2: CÁC KỊCH BẢN KHÔNG CÓ DỮ LIỆU
  // ═══════════════════════════════════════════════

  it('TC-04: (Thành công nhưng rỗng) - Lọc theo category_id không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ category_id: 99999999, index: 0, count: 10 });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  it('TC-05: (Thành công nhưng rỗng) - index lớn hơn tổng số dữ liệu', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ index: 999999, count: 10 });

    expect(String(res.body.code)).toBe('9994');
    expect(res.body.message).toBe('No Data or end of list data.');
  });

  // ═══════════════════════════════════════════════
  // NHÓM 3: CÁC KỊCH BẢN LỖI ĐẦU VÀO (VALIDATION)
  // ═══════════════════════════════════════════════

  it('TC-06: (Thất bại) - Truyền sai kiểu dữ liệu của category_id (Chuỗi)', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ category_id: 'abc', index: 0, count: 10 });

    // Do DTO sử dụng @IsInt() nên 'abc' sẽ bị chặn lại
    expect(String(res.body.code)).toBe('1004'); // Parameter value is invalid
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-07: (Thất bại) - Truyền index âm', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ index: -1, count: 10 });

    // Do DTO sử dụng @Min(0) cho index
    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-08: (Thất bại) - Truyền count bằng 0 hoặc âm', async () => {
    const res = await request(baseURL)
      .post('/api/get_list_brands')
      .send({ index: 0, count: 0 });

    // Do DTO sử dụng @Min(1) cho count
    expect(String(res.body.code)).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
