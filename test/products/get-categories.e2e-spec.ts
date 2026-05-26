import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Products - Get Categories (e2e)', () => {
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

  it('TC-01: (Thành công) - Lấy danh sách danh mục (không truyền parent_id) và in ra console', async () => {
    const res = await request(baseURL)
      .post('/api/get_categories')
      .send({});

    if (res.body.code === '1000') {
      console.log('====== DANH SÁCH CATEGORIES TRÊN SERVER ======');
      console.log(JSON.stringify(res.body.data, null, 2));
      console.log('=============================================');
    } else {
      console.log('Không có category nào trên server hoặc có lỗi:', res.body);
    }

    expect(['1000', '9994']).toContain(res.body.code); // 1000 nếu có, 9994 nếu không có categories
    if (res.body.code === '1000') {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('TC-02: (Thành công) - Lấy danh sách danh mục gốc (parent_id = 0)', async () => {
    const res = await request(baseURL)
      .post('/api/get_categories')
      .send({ parent_id: 0 });

    expect(['1000', '9994']).toContain(res.body.code);
    if (res.body.code === '1000') {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('TC-03: (Thất bại) - Lỗi Validation khi truyền sai kiểu dữ liệu của parent_id', async () => {
    const res = await request(baseURL)
      .post('/api/get_categories')
      .send({ parent_id: 'abc' }); // Truyền chuỗi thay vì số nguyên

    expect(String(res.body.code)).toBe('1004'); // Parameter value is invalid
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-04: (Thành công nhưng Hết dữ liệu) - Truyền parent_id không tồn tại', async () => {
    const res = await request(baseURL)
      .post('/api/get_categories')
      .send({ parent_id: 99999999 }); // ID rất lớn không có trong DB

    expect(String(res.body.code)).toBe('9994'); // No Data
    expect(res.body.message).toBe('No Data or end of list data.');
  });
});
