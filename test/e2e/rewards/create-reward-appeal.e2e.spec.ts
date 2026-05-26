// import { rewardsAction } from '../../helpers/actions/rewards.action';
// import { failMsg } from '../../helpers/api-client.helper';
// import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
// import { RESPONSE } from '../../constants/respones';
// import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

// let U1: TestUser;
// const VALID_REWARD_ID = 1;
// const NON_EXISTENT_REWARD_ID = 999999;

// beforeAll(() => {
//   [U1] = getTestUsers();
// });

// // Thành công
// describe('Thành công', () => {
//   it('TC01 — ID phần thưởng hợp lệ và có lý do — tạo khiếu nại thành công trả về trạng thái pending', async () => {
//     const payload = {
//       reward_id: VALID_REWARD_ID,
//       reason: 'Tôi chưa nhận được điểm thưởng cho hoạt động này.',
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
//     expect(res.body.data, failMsg(res)).toBeDefined();
//     expect(res.body.data.status, failMsg(res)).toBe('pending');
//     expect(res.body.data.reason, failMsg(res)).toBe(payload.reason);
//   });
// });

// // Thất bại — thiếu tham số hoặc sai định dạng
// describe('Thất bại — thiếu tham số hoặc sai định dạng', () => {
//   it('TC02 — Thiếu trường bắt buộc reward_id — trả lỗi PARAMETER_NOT_ENOUGH', async () => {
//     const payload = {
//       reason: 'Thiếu mất trường ID phần thưởng.',
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_NOT_ENOUGH.code,
//     );
//   });

//   it('TC03 — Thiếu trường bắt buộc reason — trả lỗi PARAMETER_NOT_ENOUGH', async () => {
//     const payload = {
//       reward_id: VALID_REWARD_ID,
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_NOT_ENOUGH.code,
//     );
//   });

//   it('TC04 — Kiểu dữ liệu reward_id không hợp lệ (chuỗi thay vì số) — trả lỗi PARAMETER_TYPE_INVALID', async () => {
//     const payload = {
//       reward_id: 'not-a-number-string',
//       reason: 'Lý do hợp lệ',
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_TYPE_INVALID.code,
//     );
//   });

//   it('TC05 — Lý do khiếu nại chỉ toàn khoảng trắng hoặc rỗng — trả lỗi PARAMETER_VALUE_INVALID', async () => {
//     const payload = {
//       reward_id: VALID_REWARD_ID,
//       reason: '    ',
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_VALUE_INVALID.code,
//     );
//   });
// });

// // Thất bại — lỗi logic nghiệp vụ
// describe('Thất bại — lỗi logic nghiệp vụ', () => {
//   it('TC06 — ID phần thưởng không tồn tại trong hệ thống — trả lỗi PARAMETER_VALUE_INVALID', async () => {
//     const payload = {
//       reward_id: NON_EXISTENT_REWARD_ID,
//       reason: 'ID này không hề có trong DB.',
//     };

//     const res = await rewardsAction.createAppeal(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_VALUE_INVALID.code,
//     );
//     expect(res.body.data, failMsg(res)).toBeNull();
//   });
// });

// // Thất bại — token không hợp lệ
// describe('Thất bại — token không hợp lệ', () => {
//   it('TC07 — Không có token Authorization — trả lỗi TOKEN_INVALID', async () => {
//     const payload = { reward_id: VALID_REWARD_ID, reason: 'Test không token' };
//     const res = await rewardsAction.createAppealRaw(null, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
//   });

//   it('TC08 — Phiên làm việc hết hạn do token hết hạn — trả lỗi TOKEN_INVALID', async () => {
//     const payload = {
//       reward_id: VALID_REWARD_ID,
//       reason: 'Test token hết hạn',
//     };
//     const res = await rewardsAction.createAppealRaw(EXPIRED_TOKEN, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
//   });
// });
