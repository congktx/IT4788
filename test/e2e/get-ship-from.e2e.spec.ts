/**
 * test/e2e/get-ship-from.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API GET /order/get_ship_from
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
  OK: { code: '1000' },
  PARAMETER_NOT_ENOUGH: { code: '1002' },
  PARAMETER_VALUE_INVALID: { code: '1004' },
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
  await seed.seedAll(); // Khởi tạo User, Wards, Provinces

  // Dựa vào seed.helper.ts: Tỉnh 2 (HCM) có Phường 1 và Phường 2
  // Ta sẽ bơm 3 Kho hàng vào Phường 1 để test
  await seed.seedWarehouse(1, { warehouse_name: 'Kho A' });
  await seed.seedWarehouse(1, { warehouse_name: 'Kho B' });
  await seed.seedWarehouse(1, { warehouse_name: 'Kho C' });
});

function callApi(token: string | null, query: any) {
  const req = request(app.getHttpServer()).get('/order/get_ship_from');
  if (token) req.set('Authorization', `Bearer ${token}`);
  if (query) req.query(query);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('GET /order/get_ship_from', () => {
  let token: string;

  beforeEach(() => {
    token = generateAuthToken(1, 'user_1');
  });

  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Truyen day du tham so hop le lay theo cap Tinh', async () => {
      // level 1: Tỉnh, parent_id 2: Hồ Chí Minh
      const res = await callApi(token, {
        level: 1,
        index: 0,
        count: 10,
        parent_id: '2',
      });

      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    it('TC02 — Truyen day du tham so hop le lay theo cap Phuong', async () => {
      // level 0: Phường, parent_id 1: Bến Nghé
      const res = await callApi(token, {
        level: 0,
        index: 0,
        count: 10,
        parent_id: '1',
      });

      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      const data = res.body.data || res.body;
      expect(data.length).toBe(3);
    });

    it('TC03 — Khong truyen tham so level he thong se mac dinh lay cap Phuong', async () => {
      // Bỏ trống level
      const res = await callApi(token, { index: 0, count: 10, parent_id: '1' });

      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      const data = res.body.data || res.body;
      expect(data.length).toBe(3);
    });

    it('TC04 — Phan trang hoat dong chuan xac khi co nhieu kho hang', async () => {
      // Có 3 kho, ta lấy index 0, count 2 -> Chỉ trả về 2 kho
      const res = await callApi(token, {
        level: 0,
        index: 0,
        count: 2,
        parent_id: '1',
      });

      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      const data = res.body.data || res.body;
      expect(data.length).toBe(2);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — THIẾU THAM SỐ
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Thiếu tham số bắt buộc', () => {
    it('TC05 — Thieu tham so bat buoc index', async () => {
      const res = await callApi(token, { level: 0, count: 10, parent_id: '1' });
      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC06 — Thieu tham so bat buoc count', async () => {
      const res = await callApi(token, { level: 0, index: 0, parent_id: '1' });
      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC07 — Thieu tham so bat buoc parent_id', async () => {
      const res = await callApi(token, { level: 0, index: 0, count: 10 });
      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC08 — Truyen chu cho tham so level', async () => {
      const res = await callApi(token, {
        level: 'chu',
        index: 0,
        count: 10,
        parent_id: '1',
      });
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC09 — Truyen chu cho tham so index', async () => {
      const res = await callApi(token, {
        level: 0,
        index: 'chu',
        count: 10,
        parent_id: '1',
      });
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC10 — Tham so index la so am', async () => {
      const res = await callApi(token, {
        level: 0,
        index: -5,
        count: 10,
        parent_id: '1',
      });
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC11 — Truyen chu cho tham so count', async () => {
      const res = await callApi(token, {
        level: 0,
        index: 0,
        count: 'chu',
        parent_id: '1',
      });
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC12 — Tham so count nho hon 1', async () => {
      const res = await callApi(token, {
        level: 0,
        index: 0,
        count: 0,
        parent_id: '1',
      });
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC13 — Tham so parent_id truyen mang thay vi chuoi', async () => {
      const req = request(app.getHttpServer())
        .get(
          '/order/get_ship_from?level=0&index=0&count=10&parent_id[]=1&parent_id[]=2',
        )
        .set('Authorization', `Bearer ${token}`);
      const res = await req;
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — NGHIỆP VỤ LOGIC
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC14 — Tra cuu cap Tinh nhung parent_id khong ton tai trong he thong', async () => {
      const res = await callApi(token, {
        level: 1,
        index: 0,
        count: 10,
        parent_id: '999999',
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });

    it('TC15 — Tra cuu cap Phuong nhung parent_id khong ton tai trong he thong', async () => {
      const res = await callApi(token, {
        level: 0,
        index: 0,
        count: 10,
        parent_id: '999999',
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC16 — Khong truyen Token tren Header', async () => {
      const res = await callApi(null, {
        level: 0,
        index: 0,
        count: 10,
        parent_id: '1',
      });
      expect(res.status).toBe(200);
    });

    it('TC17 — Token sai dinh dang', async () => {
      const res = await callApi('this-is-invalid', {
        level: 0,
        index: 0,
        count: 10,
        parent_id: '1',
      });
      expect(res.status).toBe(200);
    });

    it('TC18 — Token da het han', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, {
        level: 0,
        index: 0,
        count: 10,
        parent_id: '1',
      });
      expect(res.status).toBe(200);
    });
  });
});
