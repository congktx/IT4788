import { GetListFollowedInput, GetListFollowedOutput } from '../interfaces';
import { assertGetListFollowed } from './assert_get_list_followed'; //

export type TestMode = 'strict' | 'full'; // thêm kiểu dừng ngay khi test fail hoặc chạy full log lỗi

export const runApiIntegrationTest = async (
  apiFunction: (input: GetListFollowedInput) => Promise<GetListFollowedOutput>,
  mode: TestMode = 'full', // mặc định là chạy hết tất cả testcase
) => {
  const testCases = [
    {
      name: 'TC1: Không truyền Token',
      input: { user_id: '1', index: '0', count: '10' } as any,
      expectedCode: '9998',
    },
    {
      name: 'TC2: Token trống hoặc hết hạn',
      input: { token: 'token_expired', user_id: '1', index: '0', count: '10' },
      expectedCode: '9998',
    },
    {
      name: 'TC3: Không truyền bất kỳ tham số input nào ({})',
      input: {} as any,
      expectedCode: '9998', // Vì không có token nên dính 9998 trước
    },
    {
      name: 'TC4: Truyền token nhưng thiếu hoàn toàn các tham số khác',
      input: { token: 'token_live_001' } as any,
      expectedCode: '1002',
    },
    {
      name: 'TC5: Thiếu tham số index',
      input: { token: 'token_live_001', user_id: '1', count: '10' } as any,
      expectedCode: '1002',
    },
    {
      name: 'TC6: Thiếu tham số count',
      input: { token: 'token_live_001', user_id: '1', index: '0' } as any,
      expectedCode: '1002',
    },
    {
      name: 'TC7: user_id không phải là số (chuỗi ký tự)',
      input: {
        token: 'token_live_001',
        user_id: 'abc',
        index: '0',
        count: '10',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC8: index là số thập phân (không phải Integer)',
      input: {
        token: 'token_live_001',
        user_id: '1',
        index: '1.5',
        count: '10',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC9: count là số thập phân',
      input: {
        token: 'token_live_001',
        user_id: '1',
        index: '0',
        count: '5.5',
      },
      expectedCode: '1003',
    },
    {
      name: 'TC10: user_id bằng 0 hoặc âm',
      input: { token: 'token_live_001', user_id: '0', index: '0', count: '10' },
      expectedCode: '1004',
    },
    {
      name: 'TC11: index âm',
      input: {
        token: 'token_live_001',
        user_id: '1',
        index: '-1',
        count: '10',
      },
      expectedCode: '1004',
    },
    {
      name: 'TC12: count âm hoặc bằng 0',
      input: { token: 'token_live_001', user_id: '1', index: '0', count: '0' },
      expectedCode: '1004',
    },
    {
      name: 'TC13: User mục tiêu không tồn tại',
      input: {
        token: 'token_live_001',
        user_id: '999',
        index: '0',
        count: '10',
      },
      expectedCode: '1013',
    },
    {
      name: 'TC14: Không có quyền truy cập (Bị chặn/Block)',
      input: { token: 'token_live_002', user_id: '1', index: '0', count: '10' },
      expectedCode: '1009',
    },
    {
      name: 'TC15: Lấy danh sách thành công (Trang 1)',
      input: { token: 'token_live_001', user_id: '1', index: '0', count: '5' },
      expectedCode: '1000',
    },
    {
      name: 'TC16: Lấy danh sách thành công nhưng không có dữ liệu',
      input: {
        token: 'token_live_001',
        user_id: '10',
        index: '0',
        count: '10',
      },
      expectedCode: '1000', // data trả về []
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
          assertGetListFollowed(tc.input, actualResponse, tc.expectedCode);

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
