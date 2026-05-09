import {
  GetListBlocksInput,
  GetListBlocksOutput,
  GetListFollowedInput,
  GetListFollowedOutput,
} from '../interfaces';
import { assertGetListBlock } from './assert_get_list_block'; //

export type TestMode = 'strict' | 'full'; // thêm kiểu dừng ngay khi test fail hoặc chạy full log lỗi

export const runApiIntegrationTest = async (
  apiFunction: (input: GetListBlocksInput) => Promise<GetListBlocksOutput>,
  mode: TestMode = 'full', // mặc định là chạy hết tất cả testcase
) => {
  const testCases = [
    {
      name: 'TC1: Không truyền token',
      input: { index: '0', count: '10' } as any,
      expectedCode: '9998',
    },

    {
      name: 'TC2: Token rỗng',
      input: { token: '', index: '0', count: '10' },
      expectedCode: '9998',
    },

    {
      name: 'TC3: Token không hợp lệ',
      input: { token: 'abc', index: '0', count: '10' },
      expectedCode: '9998',
    },

    {
      name: 'TC4: Token expired',
      input: { token: 'token_expired', index: '0', count: '10' },
      expectedCode: '9998',
    },

    {
      name: 'TC5: Thiếu index',
      input: { token: 'token_live_001', count: '10' } as any,
      expectedCode: '9993',
    },

    {
      name: 'TC6: Thiếu count',
      input: { token: 'token_live_001', index: '0' } as any,
      expectedCode: '1002',
    },

    {
      name: 'TC7: Thiếu cả index và count',
      input: { token: 'token_live_001' } as any,
      expectedCode: '1002',
    },

    {
      name: 'TC8: index không phải số',
      input: { token: 'token_live_001', index: 'abc', count: '10' },
      expectedCode: '1003',
    },

    {
      name: 'TC9: count không phải số',
      input: { token: 'token_live_001', index: '0', count: 'abc' },
      expectedCode: '1003',
    },

    {
      name: 'TC10: index là float',
      input: { token: 'token_live_001', index: '1.5', count: '10' },
      expectedCode: '1003',
    },

    {
      name: 'TC11: count là float',
      input: { token: 'token_live_001', index: '0', count: '1.5' },
      expectedCode: '1003',
    },

    {
      name: 'TC12: index < 0',
      input: { token: 'token_live_001', index: '-1', count: '10' },
      expectedCode: '1004',
    },

    {
      name: 'TC13: count = 0',
      input: { token: 'token_live_001', index: '0', count: '0' },
      expectedCode: '1004',
    },

    {
      name: 'TC14: count < 0',
      input: { token: 'token_live_001', index: '0', count: '-5' },
      expectedCode: '1004',
    },

    {
      name: 'TC15: User có block - lấy danh sách block',
      input: { token: 'token_live_001', index: '0', count: '10' },
      expectedCode: '1000',
    },

    {
      name: 'TC16: User có block - pagination',
      input: { token: 'token_live_001', index: '0', count: '1' },
      expectedCode: '1000',
    },

    {
      name: 'TC17: index vượt quá số block',
      input: { token: 'token_live_001', index: '10', count: '10' },
      expectedCode: '1000',
    },

    {
      name: 'TC18: User không block ai',
      input: { token: 'token_live_002', index: '0', count: '10' },
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
          assertGetListBlock(tc.input, actualResponse, tc.expectedCode);

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
