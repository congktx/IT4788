/**
 * test/e2e/delete-order-address.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API DELETE /order/delete/:id
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../helpers/create-test-app';
import { SeedHelper } from '../../helpers/seed.helper';
import { generateAuthToken } from '../../helpers/auth.helper';
import { Address } from '../../../src/modules/orders/entities/address.entity';

const RESPONSE = {
  OK: { code: '1000', message: 'OK' },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
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
});

function callApi(token: string | null, id: number | string) {
  const req = request(app.getHttpServer()).delete(`/order/delete/${id}`);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('DELETE /order/delete/:id', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Xóa thành công địa chỉ của chính mình', async () => {
      const address = await seed.seedAddress(1);
      const token = generateAuthToken(1, 'user_1');

      // 1. Gọi API Xóa
      const res = await callApi(token, address.id);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      // 2. Chọt trực tiếp vào DB để Verify là nó đã thực sự bốc hơi
      const dbCheck = await dataSource.getRepository(Address).findOne({
        where: { id: address.id },
      });
      expect(dbCheck).toBeNull();
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — NGHIỆP VỤ LOGIC
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC02 — Xóa địa chỉ KHÔNG TỒN TẠI (ID ảo)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, 999999);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC03 — Xóa địa chỉ CỦA NGƯỜI KHÁC', async () => {
      // User 2 tạo địa chỉ
      const addrUser2 = await seed.seedAddress(2);

      // User 1 lấy Token đi xóa địa chỉ của User 2
      const tokenUser1 = generateAuthToken(1, 'user_1');
      const res = await callApi(tokenUser1, addrUser2.id);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC04 — URL Param :id là chữ thay vì số', async () => {
      const token = generateAuthToken(1, 'user_1');
      // Truyền chữ vào :id, kỳ vọng Dev phải bắt lỗi và trả về 1004 thay vì văng lỗi 500 sập hệ thống
      const res = await callApi(token, 'chu_ne');

      // Nếu test case này FAIL tức là Dev code ẩu, y hệt API update
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC05 — Không gửi Token', async () => {
      const res = await callApi(null, 1);
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC06 — Token sai định dạng', async () => {
      const res = await callApi('invalid-token', 1);
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC07 — Token hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, 1);
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
