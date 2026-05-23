import { followAction } from '../../helpers/actions/follow.action';
import { blockAction } from '../../helpers/actions/block.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;
let U4: TestUser;

beforeAll(() => {
  [U1, U2, U3, U4] = getTestUsers();
});

// Đảm bảo dữ liệu sạch sau khi toàn bộ suite chạy xong
afterAll(async () => {
  await Promise.all([
    followAction.unfollow(U1.token, U2.userId).catch(() => {}),
    followAction.unfollow(U1.token, U3.userId).catch(() => {}),
    followAction.unfollow(U1.token, U4.userId).catch(() => {}),
    followAction.unfollow(U2.token, U1.userId).catch(() => {}),
    followAction.unfollow(U3.token, U1.userId).catch(() => {}),
    followAction.unfollow(U4.token, U1.userId).catch(() => {}),
    blockAction.unblock(U1.token, U2.userId).catch(() => {}),
    blockAction.unblock(U2.token, U1.userId).catch(() => {}),
  ]);
});

// Kiểm tra kiểu dữ liệu của 1 item trong data
function expectItemShape(item: any) {
  expect(typeof item.id).toBe('string');
  expect(typeof item.username).toBe('string');
  expect(item.followed === 0 || item.followed === 1).toBe(true);
}

// Thành công
describe('Thành công', () => {
  afterEach(async () => {
    await Promise.all([
      followAction.unfollow(U1.token, U2.userId).catch(() => {}),
      followAction.unfollow(U1.token, U3.userId).catch(() => {}),
      followAction.unfollow(U2.token, U1.userId).catch(() => {}),
      followAction.unfollow(U3.token, U1.userId).catch(() => {}),
      followAction.unfollow(U4.token, U1.userId).catch(() => {}),
    ]);
  });

  it('TC01 — Lấy danh sách người follow U2 — trả về đúng data', async () => {
    await followAction.follow(U1.token, U2.userId);

    const res = await followAction.getListFollowed(U3.token, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
    expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(1);

    const item = res.body.data.find((u: any) => u.id === U1.userId);
    expect(item, failMsg(res)).toBeDefined();
    expectItemShape(item);
  });

  it('TC02 — Danh sách rỗng khi user chưa có ai follow', async () => {
    const res = await followAction.getListFollowed(U1.token, {
      user_id: U3.userId,
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });

  it('TC03 — followed=1 khi currentUser cũng đang follow người trong danh sách', async () => {
    await followAction.follow(U2.token, U1.userId);
    await followAction.follow(U3.token, U1.userId);
    await followAction.follow(U1.token, U3.userId);

    // currentUser=U1 xem follower của U1 → [U2, U3]
    // U1 đang follow U3 → U3.followed=1, U2.followed=0
    const res = await followAction.getListFollowed(U1.token, {
      user_id: U1.userId,
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

    const u3Item = res.body.data.find((u: any) => u.id === U3.userId);
    expect(u3Item, failMsg(res)).toBeDefined();
    expect(u3Item.followed, failMsg(res)).toBe(1);

    const u2Item = res.body.data.find((u: any) => u.id === U2.userId);
    expect(u2Item, failMsg(res)).toBeDefined();
    expect(u2Item.followed, failMsg(res)).toBe(0);
  });

  it('TC04 — followed=0 khi currentUser không follow người trong danh sách', async () => {
    await followAction.follow(U1.token, U2.userId);

    // currentUser=U3 không follow U1, xem follower của U2 → [U1]
    const res = await followAction.getListFollowed(U3.token, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

    const u1Item = res.body.data.find((u: any) => u.id === U1.userId);
    expect(u1Item, failMsg(res)).toBeDefined();
    expect(u1Item.followed, failMsg(res)).toBe(0);
  });

  it('TC05 — Phân trang: index=0, count=1 chỉ trả 1 item', async () => {
    await followAction.follow(U2.token, U1.userId);
    await followAction.follow(U3.token, U1.userId);
    await followAction.follow(U4.token, U1.userId);

    const res = await followAction.getListFollowed(U1.token, {
      user_id: U1.userId,
      index: 0,
      count: 1,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.length, failMsg(res)).toBe(1);
  });

  it('TC06 — Phân trang: index=1 bỏ qua item đầu tiên', async () => {
    await followAction.follow(U2.token, U1.userId);
    await followAction.follow(U3.token, U1.userId);
    await followAction.follow(U4.token, U1.userId);

    const res = await followAction.getListFollowed(U1.token, {
      user_id: U1.userId,
      index: 1,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data.length, failMsg(res)).toBe(2);
  });

  it('TC07 — Xem follower của chính mình', async () => {
    const res = await followAction.getListFollowed(U1.token, {
      user_id: U1.userId,
      index: 0,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
  });

  it('TC26 — index lớn hơn tổng số follower — trả mảng rỗng', async () => {
    await followAction.follow(U1.token, U2.userId);

    const res = await followAction.getListFollowed(U1.token, {
      user_id: U2.userId,
      index: 999,
      count: 10,
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC08 — Không có token, không có body — TOKEN_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(null, {});
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC09 — Có token, thiếu user_id, index, count — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {});
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC10 — Có token, có user_id, thiếu index và count — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC11 — Có token, thiếu user_id — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC12 — Có token, thiếu index — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC13 — Có token, thiếu count — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 0,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC14 — Không có token, có đủ body — TOKEN_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(null, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Sai kiểu hoặc giá trị tham số
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC15 — user_id là chuỗi không phải số ("abc") — PARAMETER_TYPE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: 'abc',
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC16 — index là chuỗi không phải số ("abc") — PARAMETER_TYPE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 'abc',
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC17 — count là chuỗi không phải số ("abc") — PARAMETER_TYPE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 0,
      count: 'abc',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC18 — user_id âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: -1,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC19 — index âm (-1) — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: -1,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC20 — count = 0 — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 0,
      count: 0,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC21 — Token sai định dạng — TOKEN_INVALID', async () => {
    const res = await followAction.getListFollowedRaw('invalid.token.here', {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC22 — Token hết hạn — TOKEN_INVALID', async () => {
    const res = await followAction.getListFollowedRaw(EXPIRED_TOKEN, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Lỗi nghiệp vụ
describe('Lỗi nghiệp vụ', () => {
  afterEach(async () => {
    await Promise.all([
      blockAction.unblock(U1.token, U2.userId).catch(() => {}),
      blockAction.unblock(U2.token, U1.userId).catch(() => {}),
    ]);
  });

  it('TC23 — user_id không tồn tại — USER_NOT_EXIST', async () => {
    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: 999999,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.USER_NOT_EXIST.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC24 — currentUser đã block user_id — NOT_ACCESS', async () => {
    await blockAction.block(U1.token, U2.userId);

    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC25 — user_id đã block currentUser — NOT_ACCESS', async () => {
    await blockAction.block(U2.token, U1.userId);

    const res = await followAction.getListFollowedRaw(U1.token, {
      user_id: U2.userId,
      index: 0,
      count: 10,
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
