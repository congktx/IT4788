// test/helpers/fail-fast.setup.ts

const stopOnFail = process.env.STOP_ON_FAIL === 'true';
let hasFailed = false;

if (stopOnFail) {
  beforeEach(() => {
    if (hasFailed) {
      throw new Error('STOP_ON_FAIL: Dừng vì có test case trước đó fail');
    }
  });

  afterEach(() => {
    const state = expect.getState();
    if (
      state.suppressedErrors?.length > 0 ||
      (global as any).__currentTestFailed
    ) {
      hasFailed = true;
    }
  });
}
