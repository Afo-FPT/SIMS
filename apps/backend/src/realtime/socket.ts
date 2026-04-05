import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

type JwtPayload = { userId: string; role: "admin" | "manager" | "staff" | "customer" };

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.headers.authorization || "").toString().replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      (socket.data as any).user = decoded;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const u = (socket.data as any).user as JwtPayload | undefined;
    if (!u?.userId) {
      socket.disconnect(true);
      return;
    }
    socket.join(`user:${u.userId}`);
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

