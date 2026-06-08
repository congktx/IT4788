import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('News - Get List News (e2e)', () => {
  let app: INestApplication;
  let baseURL: string | any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Lấy URL remote từ .env.test (nếu có)
    baseURL = process.env.TEST_API_URL || app.getHttpServer();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('TC-01: (Thành công) - Lấy danh sách news từ Server', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({ index: 0, count: 10 });

    // In thẳng kết quả ra terminal theo yêu cầu của user
    console.log('\n=== [IN RA TERMINAL] KẾT QUẢ API GET LIST NEWS ===');
    console.dir(res.body, { depth: null, colors: true });
    console.log('==================================================\n');

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
  });

  it('TC-02: (Thành công) - Phân trang đúng (index = 1, count = 10)', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({ index: 1, count: 10 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data?.list_news)).toBe(true);
  });

  it('TC-03: (Thành công) - Phân trang đúng (index = 0, count = 2)', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({ index: 0, count: 2 });

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(Array.isArray(res.body.data.list_news)).toBe(true);
    expect(res.body.data.list_news.length).toBeLessThanOrEqual(2);
  });

  it('TC-04: (Thất bại) - index không đúng định dạng (truyền chữ)', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({ index: 'abc', count: 10 });

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-05: (Thất bại) - count không đúng định dạng (truyền chữ)', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({ index: 0, count: 'abc' });

    expect(res.body.code).toBe('1004'); 
    expect(res.body.message).toBe('Parameter value is invalid.');
  });

  it('TC-06: (Thành công) - Thiếu index hoặc count (Request rỗng), trả về toàn bộ danh sách', async () => {
    const res = await request(baseURL)
      .post('/News/list_news')
      .send({});

    console.log('\n=== [IN RA TERMINAL] KẾT QUẢ API GET LIST NEWS (Không truyền tham số) ===');
    console.dir(res.body, { depth: null, colors: true });
    console.log('========================================================================\n');

    expect(res.body.code).toBe('1000'); 
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.list_news).toBeInstanceOf(Array);
  });
});
