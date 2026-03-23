import { SetUserFollowInput, SetUserFollowOutput } from '../interfaces';
import { assertSetUserFollow } from './assert_set_user_follow'; //

export type TestMode = 'strict' | 'full'; // thêm kiểu dừng ngay khi test fail hoặc chạy full log lỗi

export const runApiIntegrationTest = async (
  apiFunction: (input: SetUserFollowInput) => Promise<SetUserFollowOutput>,
  mode: TestMode = 'full', // mặc định là chạy hết tất cả testcase
) => {
  const testCases = [
    {
      name: 'TC1: Không truyền tham số nào',
      input: {} as any,
      expectedCode: '1004 Parameter value is invalid',
    },
    {
      name: 'TC2: Thiếu followee_id',
      input: {
        token: 'token_live_001',
        action: 'follow',
      } as any,
      expectedCode: '1004 Parameter value is invalid',
    },
    {
      name: 'TC3: Token không hợp lệ/hết hạn',
      input: {
        token: 'token_expired', // Có trong mockTokens nhưng giá trị là EXPIRED
        followee_id: 'u_002',
        action: 'follow' as const,
      },
      expectedCode: '9998 Token is invalid',
    },
    {
      name: 'TC4: Follow thành công (u_001 follow u_003)',
      input: {
        token: 'token_live_001', // ID là u_001
        followee_id: 'u_003', // u_003 có tồn tại và u_001 chưa follow
        action: 'follow' as const,
      },
      expectedCode: '1000',
    },
    {
      name: 'TC5: User mục tiêu không tồn tại',
      input: {
        token: 'token_live_001',
        followee_id: 'u_999', // Không có trong mockUsers
        action: 'follow' as const,
      },
      expectedCode: '1013 User does not exist',
    },
    {
      name: 'TC6: Tự follow chính mình',
      input: {
        token: 'token_live_001', // ID là u_001
        followee_id: 'u_001', // Trùng ID người gửi
        action: 'follow' as const,
      },
      expectedCode: '1004 Parameter value is invalid',
    },
    {
      name: 'TC7: Trùng hành động - Đã follow rồi lại follow tiếp',
      input: {
        token: 'token_live_001', // ID là u_001
        followee_id: 'u_002', // u_001 ĐÃ follow u_002 trong mockFollowRelation
        action: 'follow' as const,
      },
      expectedCode: '1010 Action has been done previously by this user',
    },
    {
      name: 'TC8: Trùng hành động - Chưa follow nhưng lại hủy follow',
      input: {
        token: 'token_live_002', // ID là u_002
        followee_id: 'u_001', // u_002 CHƯA follow u_001 trong mockFollowRelation
        action: 'unfollow' as const,
      },
      expectedCode: '1010 Action has been done previously by this user',
    },
  ];

  for (const tc of testCases) {
    describe(tc.name, () => {
      it(`Nên trả về code ${tc.expectedCode}`, async () => {
        const actualResponse = await apiFunction(tc.input);

        // IN RA BẢNG SO SÁNH
        console.log(`\n=================================================`);
        console.log(`TEST CASE: ${tc.name}`);
        console.log(`INPUT:`, JSON.stringify(tc.input));
        console.log(`-------------------------------------------------`);
        console.log(`MONG ĐỢI (EXPECTED): code "${tc.expectedCode}"`);
        console.log(`THỰC TẾ (ACTUAL):   code "${actualResponse.code}"`);
        console.log(`-------------------------------------------------`);
        console.log(
          `FULL OUTPUT TỪ DEV:`,
          JSON.stringify(actualResponse, null, 2),
        );

        // Logic so sánh tự động của Jest + chế độ mode
        try {
          // Dùng assert chung
          assertSetUserFollow(tc.input, actualResponse, tc.expectedCode);

          console.log(`KẾT QUẢ: KHỚP (PASS)`);
        } catch (error) {
          console.log(`KẾT QUẢ: SAI LỆCH (FAIL)`);

          if (mode === 'strict') {
            // Nếu strict → throw ngay, dừng toàn bộ test
            throw error;
          }
          // Nếu full → chỉ log fail, tiếp tục testcase khác
        }
      });
    });
  }
};
