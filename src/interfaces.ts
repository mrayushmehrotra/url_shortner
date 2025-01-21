export interface JWTUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
    }
  }
}
