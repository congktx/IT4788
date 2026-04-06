import { from } from 'rxjs';
import { GetListFollowedInput, GetListFollowedOutput } from '../interfaces';

export const assertGetListFollowed = (
  input: GetListFollowedInput,
  actual: GetListFollowedOutput,
  expectedCode: string,
) => {
  const actualCode = String(actual.code).trim();
  const targetCode = String(expectedCode).trim();

  expect(actualCode).toBe(targetCode);

  if (targetCode === '1000') {
    expect(Array.isArray(actual.data)).toBe(true); // Phải là một mảng

    // Nếu mảng có dữ liệu, kiểm tra cấu trúc từng phần tử
    actual.data?.forEach((item) => {
      expect(typeof item.id).toBe('string');
      expect(typeof item.username).toBe('string');

      // image có thể là string hoặc null (nếu user chưa đặt avatar)
      if (item.image !== null) {
        expect(typeof item.image).toBe('string');
      }

      // followed phải là 0 hoặc 1
      expect([0, 1]).toContain(item.followed);
    });

    // Kiểm tra tính phân trang (không được vượt quá số lượng 'count' yêu cầu)
    if (actual.data && actual.data.length > 0) {
      expect(actual.data.length).toBeLessThanOrEqual(Number(input.count));
    }
  } else {
    expect(actual.data).toBeNull();
  }
};
