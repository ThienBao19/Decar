export interface ApiError {
  error: string
  code?: string
  statusCode: number
}

export interface ApiSuccess<T> {
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface SignedMediaResponse {
  url: string
  expiresAt: string
}

export interface CheckoutSessionResponse {
  url: string
}

export interface AuthTokenResponse {
  accessToken: string
  expiresIn: number
}
