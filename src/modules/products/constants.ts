export const RESPONSE_CODE = {
  OK: { code: 1000, message: 'OK' },
  PARAM_MISSING: { code: 1002, message: 'Parameter is not enough' },
  PARAM_TYPE_INVALID: { code: 1003, message: 'Parameter type is invalid' },
  PARAM_VALUE_INVALID: { code: 1004, message: 'Parameter value is invalid' },
  TOKEN_INVALID: { code: 9998, message: 'Token is invalid' },
  EXCEPTION_ERROR: { code: 9999, message: 'Exception error' },
  PRODUCT_NOT_EXISTED: { code: 9992, message: 'Product is not existed.' },
  ACTION_DONE_PREVIOUS_BY_USER: {
    code: 1010,
    message: 'Action has been done previously by this user',
  },
};
