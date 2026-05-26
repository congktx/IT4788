import '../setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '../../src/common/validation.pipe';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('News - Get News (e2e)', () => {
  let app: INestApplication;
  let baseURL: string | any;
  let sampleNewsId: number | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    baseURL = process.env.TEST_API_URL || app.getHttpServer();

    try {
      // Lấy thử list_news để tìm 1 news id hợp lệ trên server
      const res = await request(baseURL)
        .post('/News/list_news')
        .send({ index: 0, count: 1 })
        .set('Connection', 'close');
      
      if (res.body?.data?.list_news && res.body.data.list_news.length > 0) {
          sampleNewsId = res.body.data.list_news[0].id;
      }
    } catch (e) {
      console.log('Error fetching list_news:', e);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('TC-01: (Thành công) - Lấy thông tin news từ Server', async () => {
    if (sampleNewsId === null) {
      console.log('\n=== [IN RA TERMINAL] ===');
      console.log('Không có news nào trên server để test API get_news.');
      console.log('==========================\n');
      return;
    }

    const res = await request(baseURL)
      .get(`/News/${sampleNewsId}`)
      .set('Connection', 'close');

    // In thẳng kết quả ra terminal theo yêu cầu của user
    console.log(`\n=== [IN RA TERMINAL] KẾT QUẢ API GET NEWS (id=${sampleNewsId}) ===`);
    console.dir(res.body, { depth: null, colors: true });
    console.log('====================================================\n');

    expect(res.body.code).toBe('1000');
    expect(res.body.message).toBe('OK.');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(sampleNewsId);
  });

  it('TC-02: (Thất bại) - Truyền id không phải là số', async () => {
    const res = await request(baseURL)
      .get('/News/abc')
      .set('Connection', 'close');

    expect(res.body.code).toBe('1003');
    expect(res.body.message).toBe('Parameter type is invalid.');
  });

  it('TC-03: (Thất bại) - Truyền id không tồn tại', async () => {
    const res = await request(baseURL)
      .get('/News/9999999')
      .set('Connection', 'close');

    expect(res.body.code).toBe('1004');
    expect(res.body.message).toBe('Parameter value is invalid.');
  });
});
