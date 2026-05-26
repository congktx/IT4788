import { addressAction } from '../../helpers/actions/address.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;

beforeAll(async () => {
  [U1, U2, U3] = getTestUsers();

  // U1 có 3 địa chỉ
  await addressAction.createAddress(U1.token, {
    receiver_name: 'Name 1',
    phone: '0111222333',
    full_address: 'Addr 1',
    is_default: false,
    ward_id: 7,
    lat: 10,
    lng: 106,
  });
  await addressAction.createAddress(U1.token, {
    receiver_name: 'Name 2',
    phone: '0222333444',
    full_address: 'Addr 2',
    is_default: false,
    ward_id: 8,
    lat: 10,
    lng: 106,
  });
  await addressAction.createAddress(U1.token, {
    receiver_name: 'Name 3',
    phone: '0333444555',
    full_address: 'Addr 3',
    is_default: true,
    ward_id: 9,
    lat: 10,
    lng: 106,
  });

  // U2 có 1 địa chỉ
  await addressAction.createAddress(U2.token, {
    receiver_name: 'User 2 Only',
    phone: '0444555666',
    full_address: 'Addr 4',
    is_default: false,
    ward_id: 7,
    lat: 10,
    lng: 106,
  });
});

describe('GET /addresses/me', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Lấy danh sách địa chỉ của U1 — OK (Trả về mảng >= 3 item)', async () => {
      const res = await addressAction.getMyAddresses(U1.token);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(Array.isArray(data), failMsg(res)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    it('TC02 — Kiểm tra chặt chẽ kiểu dữ liệu các field trả về', async () => {
      const res = await addressAction.getMyAddresses(U1.token);

      const data = res.body.data || res.body;
      expect(data.length).toBeGreaterThan(0);
      const firstItem = data[0];

      expect(typeof firstItem.id, failMsg(res)).toBe('number');
      expect(typeof firstItem.receiver_name, failMsg(res)).toBe('string');
      expect(typeof firstItem.phone, failMsg(res)).toBe('string');
      expect(typeof firstItem.full_address, failMsg(res)).toBe('string');
      expect(
        ['boolean', 'number'].includes(typeof firstItem.is_default),
        failMsg(res),
      ).toBe(true);
    });

    it('TC03 — Tính cô lập dữ liệu (Chỉ lấy địa chỉ của U2)', async () => {
      const res = await addressAction.getMyAddresses(U2.token);

      const data = res.body.data || res.body;
      expect(data.length).toBeGreaterThanOrEqual(1);

      // Kiểm tra trong mảng trả về có chứa item của U2
      const hasUser2Addr = data.some(
        (addr: any) => addr.receiver_name === 'User 2 Only',
      );
      expect(hasUser2Addr, failMsg(res)).toBe(true);
    });
  });

  // Thất bại -> Thiếu tham số (Token)
  describe('Thiếu tham số', () => {
    it('TC04 — Không có token — TOKEN_INVALID', async () => {
      const res = await addressAction.getMyAddressesRaw(null);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Token không hợp lệ', () => {
    it('TC05 — Token sai định dạng — TOKEN_INVALID', async () => {
      const res = await addressAction.getMyAddressesRaw('invalid-token-here');

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC06 — Token đã hết hạn — TOKEN_INVALID', async () => {
      const res = await addressAction.getMyAddressesRaw(EXPIRED_TOKEN);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
