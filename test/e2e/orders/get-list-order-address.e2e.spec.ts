import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg, api } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser; // Dùng U3 cho trường hợp chưa tạo địa chỉ nào

beforeAll(async () => {
  [U1, U2, U3] = getTestUsers();

  const baseAddress = {
    is_default: false,
    address_id: [7, 1],
    lat: 10.7769,
    lng: 106.7009,
    receiver_name: 'Nguyen Van A',
    phone: '0123456789',
    full_address: '123 Đường ABC, Quận 1',
    address_detail: 'Tầng 5',
  };

  // Tạo data mồi bằng API trực tiếp
  await orderAction.addOrderAddress(U1.token, {
    ...baseAddress,
    address: 'Địa chỉ A',
    is_default: false,
  });
  await orderAction.addOrderAddress(U1.token, {
    ...baseAddress,
    address: 'Địa chỉ B',
    is_default: true,
  });
  await orderAction.addOrderAddress(U1.token, {
    ...baseAddress,
    address: 'Địa chỉ C',
    is_default: false,
  });

  await orderAction.addOrderAddress(U2.token, {
    ...baseAddress,
    address: 'Nhà User 2',
  });
});

describe('GET /order/get_list_order_address', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Trả về mảng rỗng khi User chưa tạo địa chỉ nào (U3)', async () => {
      const res = await orderAction.getListOrderAddress(U3.token);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(Array.isArray(data), failMsg(res)).toBe(true);
      expect(data.length, failMsg(res)).toBe(0);
    });

    it('TC02 — Trả về đúng số lượng sau khi tạo (U1)', async () => {
      const res = await orderAction.getListOrderAddress(U1.token);

      expect(res.status, failMsg(res)).toBe(200);
      const data = res.body.data || res.body;
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    it('TC03 — Kiểm tra logic Sắp xếp (is_default = true luôn lên đầu)', async () => {
      const res = await orderAction.getListOrderAddress(U1.token);

      const data = res.body.data || res.body;
      expect(data.length).toBeGreaterThan(0);

      // Địa chỉ is_default = true phải nằm đầu tiên
      const isFirstItemDefault =
        data[0].is_default === true || data[0].is_default === 1;
      expect(isFirstItemDefault, failMsg(res)).toBe(true);
    });

    it('TC04 — Tính cô lập dữ liệu (Chỉ lấy địa chỉ của mình - U2)', async () => {
      const res = await orderAction.getListOrderAddress(U2.token);

      const data = res.body.data || res.body;
      expect(data.length).toBeGreaterThanOrEqual(1);

      const hasUser2Addr = data.some(
        (item: any) =>
          item.address_name === 'Nhà User 2' || item.address === 'Nhà User 2',
      );
      expect(hasUser2Addr, failMsg(res)).toBe(true);
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC05 — Không gửi Token', async () => {
      const res = await orderAction.getListOrderAddressRaw(null);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC06 — Token sai định dạng', async () => {
      const res = await orderAction.getListOrderAddressRaw(
        'this-is-invalid-token',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC07 — Token hết hạn', async () => {
      const res = await orderAction.getListOrderAddressRaw(EXPIRED_TOKEN);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
