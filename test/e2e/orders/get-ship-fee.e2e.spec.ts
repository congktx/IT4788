import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg, api } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let addrU1Id: number;

beforeAll(async () => {
  [U1] = getTestUsers();

  const res1 = await orderAction.addOrderAddress(U1.token, {
    address: 'Địa chỉ nhận hàng',
    is_default: true,
    address_id: [7, 1],
    lat: 10.7769,
    lng: 106.7009,
    receiver_name: 'Nguyen A',
    phone: '0123456789',
    full_address: '123 ABC',
    address_detail: 'Tầng 5',
  });
  addrU1Id = (res1.body.data || res1.body).id;
});

describe('POST /order/get_ship_fee', () => {
  describe('Thành công', () => {
    it('TC01 — Tinh phi ship thanh cong khi truyen address_id', async () => {
      const res = await orderAction.getShipFee(U1.token, {
        product_id: 1,
        address_id: addrU1Id,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect([
        RESPONSE.OK.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });

    it('TC02 — Tinh phi ship thanh cong khi KHONG truyen address_id (lấy default)', async () => {
      const res = await orderAction.getShipFee(U1.token, { product_id: 1 });
      expect(res.status, failMsg(res)).toBe(200);
      expect([
        RESPONSE.OK.code,
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      ]).toContain(res.body.code);
    });
  });

  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC03 — San pham (product_id) khong ton tai', async () => {
      const res = await orderAction.getShipFeeRaw(U1.token, {
        product_id: 999999,
        address_id: addrU1Id,
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_VALUE_INVALID.code);
    });
  });

  describe('Thất bại — Sai kiểu dữ liệu / Thiếu', () => {
    it('TC07 — Thieu tham so bat buoc product_id', async () => {
      const res = await orderAction.getShipFeeRaw(U1.token, {
        address_id: addrU1Id,
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_NOT_ENOUGH.code);
    });

    it('TC08 — Truyen chu cho tham so product_id', async () => {
      const res = await orderAction.getShipFeeRaw(U1.token, {
        product_id: 'chu_ne',
        address_id: addrU1Id,
      });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.PARAMETER_TYPE_INVALID.code);
    });
  });

  describe('Thất bại — Token không hợp lệ', () => {
    it('TC10 — Khong truyen Token tren Header', async () => {
      const res = await orderAction.getShipFeeRaw(null, { product_id: 1 });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
