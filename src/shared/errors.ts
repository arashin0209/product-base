// Shared error types and handlers based on api-design.md

export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

export const handleAPIError = (error: unknown): Response => {
  if (error instanceof APIError) {
    return Response.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode })
  }
  
  if (error instanceof Error) {
    return Response.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }, { status: 500 })
  }
  
  return Response.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました'
    }
  }, { status: 500 })
}

export const createSuccessResponse = <T>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  message
})