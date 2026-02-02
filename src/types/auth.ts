// 인증 관련 타입 정의

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  verificationCode: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  error?: string;
}

export interface PhoneVerificationRequest {
  phone: string;
}

export interface PhoneVerificationCheckRequest {
  phone: string;
  code: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface FindEmailRequest {
  name: string;
  phone: string;
  verificationCode: string;
}
