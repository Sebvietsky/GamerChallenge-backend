export class HttpClientError extends Error {
  status: number;
  name;

  constructor(message: string, { status }: { status: number }) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}
export class BadRequestError extends HttpClientError {
  constructor(message: string) {
    super(message, { status: 400 });
  }
}

export class UnauthorizedError extends HttpClientError {
  constructor(message: string) {
    super(message, { status: 401 });
  }
}

export class ForbiddenError extends HttpClientError {
  constructor(message: string) {
    super(message, { status: 403 });
  }
}

export class NotFoundError extends HttpClientError {
  constructor(message: string) {
    super(message, { status: 404 });
  }
}

export class ConflictError extends HttpClientError {
  constructor(message: string) {
    super(message, { status: 409 });
  }
}
