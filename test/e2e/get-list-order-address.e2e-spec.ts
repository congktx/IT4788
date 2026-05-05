/**
 * test/e2e/get-list-order-address.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API GET /order/get_list_order_address
 * API này không nhận tham số đầu vào (trừ Token)
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

beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll(); // Khởi tạo 5 User, Wards, Provinces
});

function callApi(token: string | null) {
  const req = request(app.getHttpServer()).get('/order/get_list_order_address');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('GET /order/get_list_order_address', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Trả về mảng rỗng khi User chưa tạo địa chỉ nào', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(Array.isArray(data), failMsg(res)).toBe(true);
      expect(data.length, failMsg(res)).toBe(0);
    });

    it('TC02 — Trả về đúng số lượng sau khi tạo', async () => {
      // Seed 2 địa chỉ cho User 1
      await seed.seedAddress(1, { address_name: 'Địa chỉ 1' });
      await seed.seedAddress(1, { address_name: 'Địa chỉ 2' });

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      expect(res.status, failMsg(res)).toBe(200);
      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(2);
    });

    it('TC03 — Kiểm tra logic Sắp xếp (is_default = true luôn lên đầu)', async () => {
      // Tạo địa chỉ A trước (default = false)
      await seed.seedAddress(1, {
        address_name: 'Địa chỉ A',
        is_default: false,
      });

      // Tạo địa chỉ B sau (default = true)
      await seed.seedAddress(1, {
        address_name: 'Địa chỉ B',
        is_default: true,
      });

      // Tạo địa chỉ C cuối cùng (default = false)
      await seed.seedAddress(1, {
        address_name: 'Địa chỉ C',
        is_default: false,
      });

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token);

      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(3);

      // Dù tạo sau, nhưng B phải nằm ở vị trí số 0 (đầu tiên)
      expect(data[0].address_name, failMsg(res)).toBe('Địa chỉ B');
      // Tùy DB MySQL trả về boolean hay tinyint (true/1)
      const isFirstItemDefault =
        data[0].is_default === true || data[0].is_default === 1;
      expect(isFirstItemDefault, failMsg(res)).toBe(true);
    });

    it('TC04 — Tính cô lập dữ liệu (Chỉ lấy địa chỉ của mình)', async () => {
      // Seed 2 địa chỉ cho User 1, 1 địa chỉ cho User 2
      await seed.seedAddress(1);
      await seed.seedAddress(1);
      await seed.seedAddress(2, { address_name: 'Nhà User 2' });

      const tokenUser2 = generateAuthToken(2, 'user_2');
      const res = await callApi(tokenUser2);

      const data = res.body.data || res.body;
      expect(data.length, failMsg(res)).toBe(1);
      expect(data[0].address_name, failMsg(res)).toBe('Nhà User 2');
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC05 — Không gửi Token', async () => {
      const res = await callApi(null);
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC06 — Token sai / Token hết hạn', async () => {
      // Test Token sai định dạng
      const res1 = await callApi('this-is-invalid-token');
      expect(res1.status, failMsg(res1)).toBe(401);

      // Test Token hết hạn
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res2 = await callApi(expiredToken);
      expect(res2.status, failMsg(res2)).toBe(401);
    });
  });
});
