// ../common/helpers/response.ts

export function successResponse(message: string, data: any = null, statusCode = 200) {
  return {
    status_code: statusCode,
    status: true,
    message,
    data,
  };
}

export function errorResponse(message: string, data: any = null, statusCode = 400) {
  return {
    status_code: statusCode,
    status: false,
    message,
    data,
  };
}
