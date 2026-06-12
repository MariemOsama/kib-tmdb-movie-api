export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserAccount {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}
