import { walletAction } from '../../helpers/actions/wallet.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';

let U1: TestUser;

beforeAll(() => {
  [U1] = getTestUsers();
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token hợp lệ — lấy số dư ví hiện tại thành công', async () => {
    const res = await walletAction.getCurrentBalance(U1.token, {});

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data).toHaveProperty('available_balance');
    expect(res.body.data).toHaveProperty('pending_balance');
    expect(typeof res.body.data.available_balance).toBe('number');
    expect(typeof res.body.data.pending_balance).toBe('number');
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC02 — Không có token khi lấy số dư — TOKEN_INVALID', async () => {
    const res = await walletAction.getCurrentBalanceRaw(null, {});

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC03 — Token sai định dạng cấu trúc khi lấy số dư — TOKEN_INVALID', async () => {
    const res = await walletAction.getCurrentBalanceRaw(
      'wrong.bearer.token',
      {},
    );

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
