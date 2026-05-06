// test/helpers/fail-fast-environment.ts
import { TestEnvironment } from 'jest-environment-node';

class FailFastEnvironment extends TestEnvironment {
  private hasFailed = false;
  private stopOnFail = process.env.STOP_ON_FAIL === 'true';

  async handleTestEvent(event: any) {
    if (event.name === 'test_fn_failure' && this.stopOnFail) {
      this.hasFailed = true;
    }

    if (event.name === 'test_start' && this.hasFailed && this.stopOnFail) {
      event.test.mode = 'skip';
    }
  }
}

export default FailFastEnvironment;
