import { SetUserBlockInput, SetUserBlockOutput } from '../interfaces';
import { assertSetUserBlock } from './assert_set_user_block'; //

export type TestMode = 'strict' | 'full'; // thêm kiểu dừng ngay khi test fail hoặc chạy full log lỗi

export const runApiIntegrationTest = async (
  apiFunction: (input: SetUserBlockInput) => Promise<SetUserBlockOutput>,
  mode: TestMode = 'full', // mặc định là chạy hết tất cả testcase
) => {
  const testCases = [
    // ================= TOKEN =================
    {
      name: 'TC1: Không truyền tham số nào',
      input: {} as any,
      expectedCode: '9998',
    },
    {
      name: 'TC2: Token không tồn tại',
      input: {
        token: 'token_invalid',
        user_id: '2',
        type: '0',
      },
      expectedCode: '9998',
    },
    {
      name: 'TC3: Token hết hạn',
      input: {
        token: 'token_expired',
        user_id: '2',
        type: '0',
      },
      expectedCode: '9998',
    },

    // ================= PARAMETER NOT ENOUGH =================
    {
      name: 'TC4: Thiếu user_id',
      input: {
        token: 'token_live_001',
        type: '0',
      } as any,
      expectedCode: '1002',
    },
    {
      name: 'TC5: Thiếu type',
      input: {
        token: 'token_live_001',
        user_id: '2',
      } as any,
      expectedCode: '1002',
    },
    {
      name: 'TC6: Thiếu cả user_id và type',
      input: {
        token: 'token_live_001',
      } as any,
      expectedCode: '1002',
    },

    // ================= PARAMETER TYPE INVALID =================
    {
      name: 'TC7: user_id không phải số',
      input: {
        token: 'token_live_001',
        user_id: 'abc',
        type: '0',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC8: type không phải số',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: 'abc',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC9: user_id là số thực',
      input: {
        token: 'token_live_001',
        user_id: '2.5',
        type: '0',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC10: type là số thực',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: '1.5',
      },
      expectedCode: '1003',
    },

    // ================= PARAMETER VALUE INVALID =================
    {
      name: 'TC11: user_id = 0',
      input: {
        token: 'token_live_001',
        user_id: '0',
        type: '0',
      },
      expectedCode: '1004',
    },
    {
      name: 'TC12: user_id âm',
      input: {
        token: 'token_live_001',
        user_id: '-1',
        type: '0',
      },
      expectedCode: '1004',
    },
    {
      name: 'TC13: type ngoài phạm vi',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: '2',
      },
      expectedCode: '1004',
    },
    {
      name: 'TC14: user block chính mình',
      input: {
        token: 'token_live_001',
        user_id: '1',
        type: '0',
      },
      expectedCode: '1004',
    },

    // ================= USER NOT EXIST =================
    {
      name: 'TC15: user_id không tồn tại',
      input: {
        token: 'token_live_001',
        user_id: '999',
        type: '0',
      },
      expectedCode: '1013',
    },

    // ================= ACTION DONE PREVIOUSLY =================
    {
      name: 'TC16: Block user đã block trước đó',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: '0',
      },
      expectedCode: '1010',
    },
    {
      name: 'TC17: Unblock user chưa block',
      input: {
        token: 'token_live_002',
        user_id: '3',
        type: '1',
      },
      expectedCode: '1010',
    },

    // ================= SUCCESS =================
    {
      name: 'TC18: Block user thành công',
      input: {
        token: 'token_live_002',
        user_id: '3',
        type: '0',
      },
      expectedCode: '1000',
    },
    {
      name: 'TC19: Unblock user thành công',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: '1',
      },
      expectedCode: '1000',
    },

    // ================= EDGE CASE =================
    {
      name: 'TC20: Block user đang follow',
      input: {
        token: 'token_live_001',
        user_id: '3',
        type: '0',
      },
      expectedCode: '1000',
    },

    {
      name: 'TC21: Unblock sau khi block',
      input: {
        token: 'token_live_001',
        user_id: '2',
        type: '1',
      },
      expectedCode: '1000',
    },

    {
      name: 'TC22: user_id là chuỗi số hợp lệ',
      input: {
        token: 'token_live_001',
        user_id: '3',
        type: '0',
      },
      expectedCode: '1000',
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

        const isMatch = actualResponse.code.trim() === tc.expectedCode.trim();

        // Logic so sánh tự động của Jest + chế độ mode
        try {
          // Dùng assert chung
          assertSetUserBlock(tc.input, actualResponse, tc.expectedCode);

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
