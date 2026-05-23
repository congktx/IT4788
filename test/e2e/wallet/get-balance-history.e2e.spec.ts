import { walletAction } from '../../helpers/actions/wallet.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;

beforeAll(() => {
  [U1] = getTestUsers();
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Có token hợp lệ, tham số phân trang đúng — lấy lịch sử giao dịch thành công', async () => {
    const res = await walletAction.getBalanceHistory(U1.token, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const tx = res.body.data[0];
      expect(tx).toHaveProperty('history_id');
      expect(tx).toHaveProperty('title');
      expect(tx).toHaveProperty('detail');
      expect(tx).toHaveProperty('balance');
      expect(tx).toHaveProperty('date');
      expect(tx).toHaveProperty('type');
    }
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC02 — Không có token khi lấy lịch sử — TOKEN_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(null, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC03 — Có token, thiếu hoàn toàn index trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC04 — Có token, thiếu hoàn toàn count trong body — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Thất bại -> Sai kiểu hoặc giá trị tham số
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC05 — index là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: 'abc',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC06 — count là chuỗi không phải số ("abc") — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '0',
      count: 'abc',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC07 — index mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '-1',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC08 — count mang giá trị âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '0',
      count: '-1',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC09 — count bằng không (0) — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '0',
      count: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC10 — index chỉ chứa khoảng trắng — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '   ',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(201);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });

  it('TC11 — count chỉ chứa khoảng trắng — PARAMETER_VALUE_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(U1.token, {
      index: '0',
      count: '   ',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC12 — Token hết hạn khi lấy lịch sử — TOKEN_INVALID', async () => {
    const res = await walletAction.getBalanceHistoryRaw(EXPIRED_TOKEN, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
