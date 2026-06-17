export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    const text =
      typeof message === "string"
        ? message
        : message?.message || message?.banReason || "请求失败";
    super(text);
    this.name = "ApiError";
    this.status = status;
    this.data = { statusCode: status, message, ...extra };
  }
}

export function badRequest(message) {
  throw new ApiError(400, message);
}

export function forbidden(message) {
  throw new ApiError(403, message);
}

export function unauthorized(message = "Unauthorized") {
  throw new ApiError(401, message);
}
