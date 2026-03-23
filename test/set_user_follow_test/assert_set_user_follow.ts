import { SetUserFollowInput, SetUserFollowOutput } from '../interfaces';

export const assertSetUserFollow = (
  input: SetUserFollowInput,
  actual: SetUserFollowOutput,
  expectedCode: string,
) => {
  // Check code
  expect(actual.code).toBe(expectedCode);

  // Success case
  if (expectedCode === '1000') {
    expect(actual.data).toBeDefined();

    expect(actual.data?.followee_id).toBe(input.followee_id);

    expect(typeof actual.data?.is_following).toBe('boolean');

    expect(typeof actual.data?.follow_count).toBe('number');

    expect(typeof actual.data?.following_count).toBe('number');
  }
  // ❌ Error case
  else {
    expect(actual.data).toBeUndefined();
  }
};
