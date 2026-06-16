import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg, api } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let addrU1Id: number;
let addrU2Id: number;

beforeAll(async () => {
  [U1, U2] = getTestUsers();

  const payload = {
    address: 'Xóa nhé',
    is_default: false,
    address_id: [7, 1],
    lat: 10.7769,
    lng: 106.7009,
    receiver_name: 'Nguyen A',
    phone: '0123456789',
    full_address: '123 ABC',
    address_detail: 'Tầng 5',
  };

  const res1 = await orderAction.addOrderAddress(U1.token, payload);
  addrU1Id = (res1.body.data || res1.body).id;

  const res2 = await orderAction.addOrderAddress(U2.token, payload);
  addrU2Id = (res2.body.data || res2.body).id;
});

describe('DELETE /order/delete/:id', () => {
  describe('Thành công', () => {
    it('TC01 — Xóa thành công địa chỉ của chính mình', async () => {
      const res = await orderAction.deleteOrderAddress(U1.token, addrU1Id);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC02 — Xóa địa chỉ KHÔNG TỒN TẠI (ID ảo)', async () => {
      const res = await orderAction.deleteOrderAddressRaw(U1.token, 999999);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC03 — Xóa địa chỉ CỦA NGƯỜI KHÁC', async () => {
      const res = await orderAction.deleteOrderAddressRaw(U1.token, addrU2Id);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC04 — URL Param :id là chữ thay vì số', async () => {
      const res = await orderAction.deleteOrderAddressRaw(U1.token, 'chu_ne');
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — Token không hợp lệ', () => {
    it('TC05 — Không gửi Token', async () => {
      const res = await orderAction.deleteOrderAddressRaw(null, 1);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC06 — Token sai định dạng', async () => {
      const res = await orderAction.deleteOrderAddressRaw('invalid-token', 1);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC07 — Token hết hạn', async () => {
      const res = await orderAction.deleteOrderAddressRaw(EXPIRED_TOKEN, 1);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
