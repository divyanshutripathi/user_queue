export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const handleError = (err: Error) => {
  if (err instanceof AppError && err.isOperational) {
    return {
      status: err.statusCode,
      message: err.message,
    }
  }

  return {
    status: 500,
    message: "Internal server error",
  }
}
