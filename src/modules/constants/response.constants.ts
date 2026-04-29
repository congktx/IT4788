export const APP_RESPONSE = {
  OK: {
    code: '1000',
    message: 'OK',
  },
  SPAM: {
    code: '9991',
    message: 'Spam',
  },
  PRODUCT_NOT_EXISTED: {
    code: '9992',
    message: 'Product is not existed',
  },
  CODE_VERIFY_INCORRECT: {
    code: '9993',
    message: 'Code verify is incorrect',
  },
  NO_DATA_OR_END_OF_LIST: {
    code: '9994',
    message: 'No Data or end of list data',
  },
  USER_NOT_VALIDATED: {
    code: '9995',
    message: 'User is not validated',
  },
  USER_EXISTED: {
    code: '9996',
    message: 'User existed.',
  },
  METHOD_INVALID: {
    code: '9997',
    message: 'Method is invalid',
  },
  TOKEN_INVALID: {
    code: '9998',
    message: 'Token is invalid.',
  },
  EXCEPTION_ERROR: {
    code: '9999',
    message: 'Exception error.',
  },
  CAN_NOT_CONNECT_DB: {
    code: '1001',
    message: 'Can not connect to DB.',
  },
  PARAMETER_NOT_ENOUGH: {
    code: '1002',
    message: 'Parameter is not enought.',
  },
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  UNKNOWN_ERROR: {
    code: '1005',
    message: 'Unknown error.',
  },
  FILE_SIZE_TOO_BIG: {
    code: '1006',
    message: 'File size is too big.',
  },
  UPLOAD_FILE_FAILED: {
    code: '1007',
    message: 'Upload File Failed!.',
  },
  MAXIMUM_NUMBER_OF_IMAGES: {
    code: '1008',
    message: 'Maximum number of images.',
  },
  NOT_ACCESS: {
    code: '1009',
    message: 'Not access.',
  },
  ACTION_DONE_PREVIOUSLY: {
    code: '1010',
    message: 'action has been done previously by this user.',
  },
  PRODUCT_SOLD: {
    code: '1011',
    message: 'The product has been sold.',
  },
  ADDRESS_NOT_SUPPORT_SHIPPING: {
    code: '1012',
    message: 'Address does not support Shipping.',
  },
  USER_NOT_EXIST: {
    code: '1013',
    message: 'User does not exist',
  },
  PROMOTIONAL_CODE_EXPIRED: {
    code: '1014',
    message: 'Promotional code expired.',
  },
  CAN_NOT_PROCESS_BANK_CARD: {
    code: '1015',
    message: 'Can not process bank card.',
  },
  POLICY_VIOLATION: {
    code: '1016',
    message: 'Policy Violation, not support weight over 20KG & price over 30M',
  },
  CHANGE_USERNAME_MIN_30_DAYS: {
    code: '1017',
    message: 'Change Username: requires minimum 30 days',
  },
  CHANGE_USERNAME_SAME_OTHER_NAME: {
    code: '1018',
    message: 'Change Username: same other name',
  },
} as const;

export type AppResponseKey = keyof typeof APP_RESPONSE;

export const buildResponse = <T = any>(
  response: { code: string; message: string },
  data: T | null = null,
) => ({
  code: response.code,
  message: response.message,
  data,
});
