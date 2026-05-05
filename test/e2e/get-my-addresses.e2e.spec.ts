/**
 * test/e2e/get-my-addresses.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API GET /addresses/me
 *
 * API: GET /addresses/me
 * INPUT: (Chỉ cần Token trên header)
 * OUTPUT: Danh sách địa chỉ của chính User đó
 *
 * ĐẶC ĐIỂM:
 *   - Mỗi TC hoàn toàn ĐỘC LẬP nhau
 *   - beforeEach: clearAll() + seedAll() → reset DB trước mỗi TC
 *   - Sử dụng seed.seedAddress() để bơm data test trực tiếp vào DB
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app';
import { SeedHelper } from '../helpers/seed.helper';
import { generateAuthToken } from '../helpers/auth.helper';

const RESPONSE = {
  OK: { code: '1000', message: 'OK' },
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist' },
};

let app: INestApplication;
let testingModule: TestingModule;
let dataSource: DataSource;
let seed: SeedHelper;

beforeAll(async () => {
  ({ app, module: testingModule } = await createTestApp());
  dataSource = testingModule.get(DataSource);
  seed = new SeedHelper(dataSource);
});

afterAll(async () => {
  await seed.clearAll();
  await app.close();
});

// Reset DB trước MỖI TC
beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll(); // Tạo sẵn 5 Users mặc định và data nền
});

// Helper gọi API
function callApi(token: string | null) {
  const req = request(app.getHttpServer()).get('/addresses/me');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('GET /addresses/me', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thành công', () => {
    it('TC01 — Trả về danh sách rỗng khi User chưa tạo địa chỉ nào', async () => {
      const token = generateAuthToken(1, 'user_1'); // User 1 chưa có địa chỉ
      const res = await callApi(token);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body; // Hỗ trợ 2 kiểu bọc data
      expect(Array.isArray(data), failMsg(res)).toBe(true);
      expect(data.length, failMsg(res)).toBe(0);
    });

    it('TC02 — Trả về đúng 1 địa chỉ sau khi tạo', async () => {
      // Bơm 1 địa chỉ thẳng vào DB cho User 1
      await seed.seedAddress(1);

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(1);
    });

    it('TC03 — Trả về đúng số lượng sau khi tạo nhiều địa chỉ', async () => {
      // Bơm 3 địa chỉ cho User 1
      await seed.seedAddress(1, { receiver_name: 'Name 1' });
      await seed.seedAddress(1, { receiver_name: 'Name 2' });
      await seed.seedAddress(1, { receiver_name: 'Name 3' });

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(3);
    });

    it('TC04 — Kiểm tra chặt chẽ kiểu dữ liệu các field trả về', async () => {
      await seed.seedAddress(1);
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      const data = res.body.data || res.body;
      const firstItem = data[0];

      expect(typeof firstItem.id, failMsg(res)).toBe('number');
      expect(typeof firstItem.receiver_name, failMsg(res)).toBe('string');
      expect(typeof firstItem.phone, failMsg(res)).toBe('string');
      expect(typeof firstItem.full_address, failMsg(res)).toBe('string');
      // Tùy MySQL trả về tinyint (number) hay boolean, nhưng thường là boolean qua TypeORM
      expect(
        ['boolean', 'number'].includes(typeof firstItem.is_default),
        failMsg(res),
      ).toBe(true);
    });

    it('TC05 — Tính cô lập dữ liệu (Chỉ lấy địa chỉ của mình)', async () => {
      // Bơm 2 địa chỉ cho User 1, 1 địa chỉ cho User 2
      await seed.seedAddress(1);
      await seed.seedAddress(1);
      await seed.seedAddress(2, { receiver_name: 'User 2 Only' });

      // Lấy danh sách của User 2
      const tokenUser2 = generateAuthToken(2, 'user_2');
      const res = await callApi(tokenUser2);

      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(1);
      expect(data[0].receiver_name, failMsg(res)).toBe('User 2 Only');
    });

    it('TC06 — Dữ liệu trả về khớp hoàn toàn với dữ liệu đã tạo', async () => {
      const mockData = {
        receiver_name: 'John Doe',
        phone: '0111222333',
        full_address: 'Vincom Dong Khoi, District 1',
      };
      await seed.seedAddress(1, mockData);

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      const data = res.body.data || res.body;
      expect(data[0].receiver_name, failMsg(res)).toEqual(
        mockData.receiver_name,
      );
      expect(data[0].phone, failMsg(res)).toEqual(mockData.phone);
      expect(data[0].full_address, failMsg(res)).toEqual(mockData.full_address);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thất bại — token không hợp lệ', () => {
    it('TC07 — Không có token', async () => {
      const res = await callApi(null);
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC08 — Token sai định dạng', async () => {
      const res = await callApi('this-is-not-a-valid-jwt');
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC09 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 }, // Hết hạn 1 giây trước
      );

      const res = await callApi(expiredToken);
      expect(res.status, failMsg(res)).toBe(401);
    });
  });
});
