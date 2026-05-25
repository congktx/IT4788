const originalExpect = global.expect;

type MatcherMap = Record<string | symbol, unknown>;

function withMessage(matchers: MatcherMap, message?: string): MatcherMap {
  if (!message) {
    return matchers;
  }

  return new Proxy(matchers, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]) => {
        try {
          return value.apply(target, args);
        } catch (error) {
          if (error instanceof Error) {
            error.message = `${error.message}\n${message}`;
          }
          throw error;
        }
      };
    },
  });
}

const expectWithMessage = ((actual: unknown, message?: string) => {
  return withMessage(originalExpect(actual) as MatcherMap, message);
}) as typeof expect;

Object.assign(expectWithMessage, originalExpect);
global.expect = expectWithMessage;
