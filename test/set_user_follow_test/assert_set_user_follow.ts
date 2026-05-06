import { from } from 'rxjs';
import { SetUserFollowInput, SetUserFollowOutput } from '../interfaces';

export const assertSetUserFollow = (
  input: SetUserFollowInput,
  actual: SetUserFollowOutput,
  expectedCode: string,
) => {
  // 1. Trị khoảng trắng và ép kiểu chuỗi để so sánh Code chuẩn nhất
  const actualCode = String(actual.code).trim();
  const targetCode = String(expectedCode).trim();

  expect(actualCode).toBe(targetCode);

  // Success case
  if (targetCode === '1000') {
    expect(actual.data).toBeDefined();
    expect(actual.data?.followee_id).toBe(input.followee_id);
    expect(typeof actual.data?.is_following).toBe('boolean');
    expect(typeof actual.data?.follow_count).toBe('number');
    expect(typeof actual.data?.following_count).toBe('number');
  }
  // Error case
  else {
    expect(actual.data == null).toBe(true);
  }
};
