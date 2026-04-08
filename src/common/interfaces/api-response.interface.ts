export interface ApiResponse<T = any> {
    code: string;
    message: string;
    data: T | null;
  }