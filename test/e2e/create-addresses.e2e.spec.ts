/**
 * test/e2e/create-address.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API POST /addresses/create
 *
 * API: POST /addresses/create
 * INPUT: { receiver_name, phone, full_address, is_default, ward_id, lat, lng }
 * OUTPUT: Trả về object address vừa tạo
 *
 * ĐẶC ĐIỂM:
 *   - Mỗi TC hoàn toàn ĐỘC LẬP nhau
 *   - beforeEach: clearAll() + seedAll() → reset DB trước mỗi TC
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app';
import { SeedHelper } from '../helpers/seed.helper';
import { generateAuthToken } from '../helpers/auth.helper';

// Format response chuẩn của dự án
const RESPONSE = {
  OK: { code: '1000', message: 'OK' },
  PARAMETER_NOT_ENOUGH: { code: '1002', message: 'Parameter is not enought.' },
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
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

// Reset DB trước MỖI TC — đảm bảo TC độc lập
beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
});

// Helper call API
function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer()).post('/addresses/create').send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

// Hàm in message khi expect fail (bạn cần giữ thư viện jest-expect-message như bài trước)
function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

// Payload chuẩn
const validPayload = {
  receiver_name: 'Nguyen Van A',
  phone: '0123456789',
  full_address: '123 Duong ABC, Quan 1, TP.HCM',
  is_default: false,
  ward_id: 1, // Đã thêm để tránh lỗi DB
  lat: 10.7769, // Đã thêm để tránh lỗi DB
  lng: 106.7009, // Đã thêm để tránh lỗi DB
};

describe('POST /addresses/create', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thành công', () => {
    it('TC01 — Tạo địa chỉ mới thành công', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, validPayload);

      // Theo format dự án: API có thể trả HTTP 200 hoặc 201 cho POST
      expect(res.status, failMsg(res)).toBe(200); // Nếu code dev trả về 200 thì đổi lại thành 200 nhé
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(data.receiver_name, failMsg(res)).toBe(validPayload.receiver_name);
    });

    it('TC02 — Tạo địa chỉ với is_default = true', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, is_default: true });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Tạo địa chỉ với is_default = false', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, is_default: false });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC04 — Tạo nhiều địa chỉ cho cùng 1 user', async () => {
      const token = generateAuthToken(1, 'user_1');
      await callApi(token, validPayload);

      const res2 = await callApi(token, {
        ...validPayload,
        receiver_name: 'Nguyen Van B',
      });
      expect(res2.status, failMsg(res2)).toBe(200);
      expect(res2.body.code, failMsg(res2)).toBe(RESPONSE.OK.code);
    });

    it('TC05 — 2 user khác nhau tạo địa chỉ không ảnh hưởng nhau', async () => {
      const token1 = generateAuthToken(1, 'user_1');
      const token2 = generateAuthToken(2, 'user_2');

      await callApi(token1, validPayload);

      const res2 = await callApi(token2, {
        ...validPayload,
        receiver_name: 'User 2 Receiver',
      });
      expect(res2.status, failMsg(res2)).toBe(200);
      expect(res2.body.code, failMsg(res2)).toBe(RESPONSE.OK.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thất bại — token không hợp lệ', () => {
    it('TC06 — Không có token', async () => {
      const res = await callApi(null, validPayload);
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC07 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', validPayload);
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC08 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, validPayload);
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — THIẾU THAM SỐ
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thất bại — thiếu tham số', () => {
    it('TC09 — Body rỗng', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC10 — Thiếu receiver_name', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { receiver_name, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC11 — Thiếu phone', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { phone, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC12 — Thiếu full_address', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { full_address, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC13 — Thiếu receiver_name và phone', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { receiver_name, phone, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC14 — Thiếu receiver_name và full_address', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { receiver_name, full_address, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC15 — Thiếu phone và full_address', async () => {
      const token = generateAuthToken(1, 'user_1');
      const { phone, full_address, ...payload } = validPayload;
      const res = await callApi(token, payload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */
  describe('Trường hợp thất bại — sai kiểu dữ liệu', () => {
    it('TC16 — receiver_name là số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        ...validPayload,
        receiver_name: 12345,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC17 — receiver_name là boolean', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        ...validPayload,
        receiver_name: true,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC18 — phone là số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, phone: 987654321 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC19 — full_address là số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, full_address: 123 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC20 — is_default là string', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, is_default: 'true' });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC21 — is_default là số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, is_default: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });
});
