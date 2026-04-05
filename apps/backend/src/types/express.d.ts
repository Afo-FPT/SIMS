import "express";

export interface JwtPayload {
  userId: string;
  role: "admin" | "manager" | "staff" | "customer";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
