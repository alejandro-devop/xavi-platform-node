interface SuccessResponse<T = any> {
  status: true;
  data: T;
  message?: string;
  meta?: {
    env: string;
  };
}

interface ErrorResponse {
  status: false;
  errors: string[];
  env: string;
}

export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    status: true,
    data,
    ...(message && { message }),
    meta: {
      env: process.env.NODE_ENV || 'development',
    },
  };
}

export function errorResponse(errors: string | string[]): ErrorResponse {
  return {
    status: false,
    errors: Array.isArray(errors) ? errors : [errors],
    env: process.env.NODE_ENV || 'development',
  };
}
