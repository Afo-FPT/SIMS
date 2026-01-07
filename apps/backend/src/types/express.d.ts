import "express";

export interface JwtPayload {
  userId: string;
  role: "admin" | "staff" ;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
