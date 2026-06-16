import { blockAction } from '../../helpers/actions/block.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;
let U4: TestUser;
let U5: TestUser;

beforeAll(() => {
  [U1, U2, U3, U4, U5] = getTestUsers();
});

afterAll(async () => {
  await Promise.all([
    blockAction.unblock(U1.token, U2.userId).catch(() => {}),
    blockAction.unblock(U1.token, U3.userId).catch(() => {}),
    blockAction.unblock(U1.token, U4.userId).catch(() => {}),
    blockAction.unblock(U1.token, U5.userId).catch(() => {}),
  ]);
});

function expectItemShape(item: any) {
  expect(typeof item.id).toBe('string');
  expect(typeof item.name).toBe('string');
}

describe('POST /get_list_blocks', () => {
  describe('Trường hợp thành công', () => {
    // UNDO: Reset data sau khi mỗi test case chạy xong
    afterEach(async () => {
      await Promise.all([
        blockAction.unblock(U1.token, U2.userId).catch(() => {}),
        blockAction.unblock(U1.token, U3.userId).catch(() => {}),
        blockAction.unblock(U1.token, U5.userId).catch(() => {}),
      ]);
    });

    it('TC01 — Lấy danh sách user đã block', async () => {
      await blockAction.block(U1.token, U5.userId);

      const res = await blockAction.getListBlocks(U1.token, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(['OK', 'OK.'], failMsg(res)).toContain(res.body.message);

      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(1);

      const item = res.body.data.find((u: any) => u.id === U5.userId);
      expect(item, failMsg(res)).toBeDefined();
      expectItemShape(item);
    });

    it('TC02 — Danh sách rỗng khi user chưa block ai', async () => {
      const res = await blockAction.getListBlocks(U3.token, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC03 — Phân trang: index=0 count=1', async () => {
      await blockAction.block(U1.token, U2.userId);
      await blockAction.block(U1.token, U3.userId);

      const res = await blockAction.getListBlocks(U1.token, {
        index: 0,
        count: 1,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(1);
    });

    it('TC04 — Phân trang: index=1 bỏ qua item đầu tiên', async () => {
      await blockAction.block(U1.token, U2.userId);
      await blockAction.block(U1.token, U3.userId);

      const res = await blockAction.getListBlocks(U1.token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(1);
    });

    it('TC05 — index lớn hơn tổng số block → trả mảng rỗng', async () => {
      const res = await blockAction.getListBlocks(U1.token, {
        index: 10,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });
  });

  describe('Thất bại — thiếu tham số', () => {
    it('TC06 — Bỏ trống index và count', async () => {
      const res = await blockAction.getListBlocksRaw(U1.token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC07 — Bỏ trống token', async () => {
      const res = await blockAction.getListBlocksRaw(null, {
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });

  describe('Thất bại — sai kiểu dữ liệu', () => {
    it('TC08 — index là chuỗi ("abc")', async () => {
      const res = await blockAction.getListBlocksRaw(U1.token, {
        index: 'abc',
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC09 — count là chuỗi ("abc")', async () => {
      const res = await blockAction.getListBlocksRaw(U1.token, {
        index: 0,
        count: 'abc',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC10 — index âm (-1)', async () => {
      const res = await blockAction.getListBlocksRaw(U1.token, {
        index: -1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC11 — count = 0', async () => {
      const res = await blockAction.getListBlocksRaw(U1.token, {
        index: 0,
        count: 0,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — token không hợp lệ', () => {
    it('TC12 — Token sai định dạng', async () => {
      const res = await blockAction.getListBlocksRaw('invalid.token.here', {
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC13 — Token hết hạn', async () => {
      const res = await blockAction.getListBlocksRaw(EXPIRED_TOKEN, {
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
