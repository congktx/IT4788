/**
 * test/e2e/get-ship-fee.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API POST /order/get_ship_fee
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
});

function callApi(token: string | null, body: any) {
  const req = request(app.getHttpServer()).post('/order/get_ship_fee');
  if (token) req.set('Authorization', `Bearer ${token}`);
  if (body) req.send(body);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('POST /order/get_ship_fee', () => {
  let tokenBuyer: string;

  beforeEach(() => {
    // User 1 sẽ đóng vai Người mua (Buyer)
    tokenBuyer = generateAuthToken(1, 'user_1');
  });

  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Tinh phi ship thanh cong khi truyen address_id', async () => {
      // 1. User 2 (Seller) tạo địa chỉ xuất phát và Sản phẩm
      const sellerAddr = await seed.seedAddress(2, { lat: 10.0, lng: 106.0 });
      const product = await seed.seedProduct(2, sellerAddr.id);

      // 2. User 1 (Buyer) tạo địa chỉ nhận hàng
      const buyerAddr = await seed.seedAddress(1, { lat: 10.1, lng: 106.1 });

      const res = await callApi(tokenBuyer, {
        product_id: product.id,
        address_id: buyerAddr.id,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      // Kiểm tra có trả về trường ship_fee không
      const data = res.body.data || res.body;
      expect(data.ship_fee).toBeDefined();
    });

    it('TC02 — Tinh phi ship thanh cong khi KHONG truyen address_id', async () => {
      const sellerAddr = await seed.seedAddress(2, { lat: 10.0, lng: 106.0 });
      const product = await seed.seedProduct(2, sellerAddr.id);

      // Buyer tạo địa chỉ và Set Default = true
      await seed.seedAddress(1, { lat: 10.1, lng: 106.1, is_default: true });

      // Gọi API nhưng KHÔNG truyền address_id
      // KỲ VỌNG: Trả về 200 OK (Vì backend sẽ tự lấy địa chỉ Default)
      // THỰC TẾ: Có thể trả về 1004 do DTO thiếu @IsOptional()
      const res = await callApi(tokenBuyer, { product_id: product.id });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — NGHIỆP VỤ LOGIC
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC03 — San pham (product_id) khong ton tai', async () => {
      const buyerAddr = await seed.seedAddress(1);
      const res = await callApi(tokenBuyer, {
        product_id: 999999,
        address_id: buyerAddr.id,
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });

    it('TC04 — Dia chi giao hang (address_id) cua User khac', async () => {
      const sellerAddr = await seed.seedAddress(2);
      const product = await seed.seedProduct(2, sellerAddr.id);

      // Lấy ID địa chỉ của User 3
      const otherUserAddr = await seed.seedAddress(3);

      const res = await callApi(tokenBuyer, {
        product_id: product.id,
        address_id: otherUserAddr.id,
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });

    it('TC05 — Khong truyen address_id va User chua co dia chi mac dinh', async () => {
      const sellerAddr = await seed.seedAddress(2);
      const product = await seed.seedProduct(2, sellerAddr.id);

      // Lưu ý: Hàm beforeEach đã clearAll() nên hiện tại User 1 chưa có địa chỉ nào

      const res = await callApi(tokenBuyer, { product_id: product.id });
      expect([200, 400]).toContain(res.status); // 400 do validation, hoặc 200 trả lỗi 1004
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });

    it('TC06 — San pham chua duoc gan dia chi xuat phat (ship_from = null)', async () => {
      // Nhét bừa 1 ID địa chỉ không tồn tại (999) vào ship_from_id
      const product = await seed.seedProduct(2, 999999);
      const buyerAddr = await seed.seedAddress(1);

      const res = await callApi(tokenBuyer, {
        product_id: product.id,
        address_id: buyerAddr.id,
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU / THIẾU
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC07 — Thieu tham so bat buoc product_id', async () => {
      const buyerAddr = await seed.seedAddress(1);
      const res = await callApi(tokenBuyer, { address_id: buyerAddr.id });

      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC08 — Truyen chu cho tham so product_id', async () => {
      const buyerAddr = await seed.seedAddress(1);
      const res = await callApi(tokenBuyer, {
        product_id: 'chu_ne',
        address_id: buyerAddr.id,
      });

      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC09 — Truyen chu cho tham so address_id', async () => {
      const sellerAddr = await seed.seedAddress(2);
      const product = await seed.seedProduct(2, sellerAddr.id);

      const res = await callApi(tokenBuyer, {
        product_id: product.id,
        address_id: 'chu_ne',
      });

      expect([400, 200]).toContain(res.status);
      expect([
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC10 — Khong truyen Token tren Header', async () => {
      const res = await callApi(null, { product_id: 1, address_id: 1 });
      expect(res.status).toBe(401);
    });

    it('TC11 — Token sai dinh dang', async () => {
      const res = await callApi('invalid-token', {
        product_id: 1,
        address_id: 1,
      });
      expect(res.status).toBe(401);
    });

    it('TC12 — Token da het han', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, { product_id: 1, address_id: 1 });
      expect(res.status).toBe(401);
    });
  });
});
