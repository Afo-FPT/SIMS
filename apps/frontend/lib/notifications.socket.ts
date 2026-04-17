import { io, type Socket } from 'socket.io-client';
import { getAuthState } from './auth';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getNotificationSocket(): Socket | null {
  const { token } = getAuthState();
  if (!token) return null;

  // If auth token changed (e.g. re-login as another user), recreate socket
  // so the server can attach this client to the correct user room.
  if (socket && socketToken !== token) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }

  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
  socket = io(base, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
  });
  socketToken = token;

  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}

