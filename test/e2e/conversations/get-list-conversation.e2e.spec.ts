import { conversationAction } from '../../helpers/actions/conversation.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;

beforeAll(async () => {
  [U1, U2, U3] = getTestUsers();

  await conversationAction.sendMessage(U1.token, {
    to_id: String(U2.userId),
    message: 'Khởi tạo dữ liệu danh sách hội thoại',
    type_message: 'text',
  });
});

// Thành công
describe('Thành công', () => {
  it('TC14 — Lấy danh sách conversation (user1 có 1 conversation với user2)', async () => {
    const res = await conversationAction.getListConversation(U1.token, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
    expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
    expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(1);
    expect(res.body.num_new_message, failMsg(res)).toBeDefined();
  });

  it('TC15 — User không có conversation nào trả về mảng rỗng (user3)', async () => {
    const res = await conversationAction.getListConversation(U3.token, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });

  it('TC16 — Phân trang: index=2 không có dữ liệu → trả về mảng rỗng', async () => {
    const res = await conversationAction.getListConversation(U1.token, {
      index: '20',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.data, failMsg(res)).toEqual([]);
  });

  it('TC17 — Cấu trúc conversation trả về đúng format', async () => {
    const res = await conversationAction.getListConversation(U1.token, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    const conv = res.body.data[0];
    expect(conv, failMsg(res)).toMatchObject({
      id: expect.any(Number),
      partner: {
        id: expect.any(Number),
        username: expect.any(String),
      },
    });
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC18 — Không có token', async () => {
    const res = await conversationAction.getListConversationRaw(null, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });

  it('TC19 — Thiếu index', async () => {
    const res = await conversationAction.getListConversationRaw(U1.token, {
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC20 — Thiếu count', async () => {
    const res = await conversationAction.getListConversationRaw(U1.token, {
      index: '0',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC21 — Body rỗng (có token)', async () => {
    const res = await conversationAction.getListConversationRaw(U1.token, {});

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC22 — Token sai định dạng', async () => {
    const res = await conversationAction.getListConversationRaw('bad.token', {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });

  it('TC23 — Token đã hết hạn', async () => {
    const res = await conversationAction.getListConversationRaw(EXPIRED_TOKEN, {
      index: '0',
      count: '10',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });
});
