import { from } from 'rxjs';
import { SetUserBlockInput, SetUserBlockOutput } from '../interfaces';

export const assertSetUserBlock = (
  input: SetUserBlockInput,
  actual: SetUserBlockOutput,
  expectedCode: string,
) => {
  // Trị khoảng trắng và ép kiểu chuỗi để so sánh Code chuẩn nhất
  const actualCode = String(actual.code).trim();
  const targetCode = String(expectedCode).trim();

  expect(actualCode).toBe(targetCode);

  expect(actual.data == null).toBe(true);
};
