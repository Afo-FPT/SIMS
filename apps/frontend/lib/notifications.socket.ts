import { io, type Socket } from 'socket.io-client';
import { getAuthState } from './auth';

let socket: Socket | null = null;

export function getNotificationSocket(): Socket | null {
  const { token } = getAuthState();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
  socket = io(base, {
    transports: ['websocket'],
    auth: { token },
  });

  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

