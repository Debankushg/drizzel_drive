/** Shape of every successful API response. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
}

/** Shape of every error API response. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  error?: string;
}
