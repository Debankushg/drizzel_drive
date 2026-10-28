export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  /** Field-level validation errors, e.g. { email: ["Invalid email address"] } */
  errors?: Record<string, string[]>;
}
