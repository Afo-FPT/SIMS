
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'customer';
  isActive: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: BackendUser;
}

export interface RegisterResponse {
  message: string;
  user: BackendUser;
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  role: string | null;
  isVerified: boolean;
  token: string | null;
}

function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * Call backend login API
 */
export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data as LoginResponse;
}

/**
 * Call backend register API
 * Role is optional on the backend and defaults to "customer"
 */
export async function apiRegister(name: string, email: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(getApiUrl('/auth/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Register failed');
  }

  return data as RegisterResponse;
}

/**
 * Persist auth data to localStorage so existing layouts continue to work
 */
export function persistAuth(login: LoginResponse) {
  if (typeof window === 'undefined') return;

  const { user, token } = login;
  const persona = user.role.toUpperCase();

  localStorage.setItem('sws_persona', persona);
  localStorage.setItem('sws_email', user.email);
  localStorage.setItem('sws_name', user.name);
  localStorage.setItem('sws_verified', 'true');
  localStorage.setItem('sws_token', token);
}

/**
 * Get current auth state from localStorage
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      email: null,
      role: null,
      isVerified: false,
      token: null,
    };
  }

  const role = localStorage.getItem('sws_persona');
  const email = localStorage.getItem('sws_email');
  const verified = localStorage.getItem('sws_verified') === 'true';
  const token = localStorage.getItem('sws_token');

  return {
    isAuthenticated: !!role && verified && !!token,
    email,
    role,
    isVerified: verified,
    token,
  };
}

/**
 * Clear auth state (logout)
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('sws_persona');
  localStorage.removeItem('sws_email');
  localStorage.removeItem('sws_name');
  localStorage.removeItem('sws_title');
  localStorage.removeItem('sws_avatar');
  localStorage.removeItem('sws_verified');
  localStorage.removeItem('sws_token');
  sessionStorage.removeItem('login_email');
  sessionStorage.removeItem('login_role');
}

/**
 * Check if user is authenticated and verified
 */
export function isAuthenticated(): boolean {
  const authState = getAuthState();
  return authState.isAuthenticated && authState.isVerified;
}

/**
 * Change password (authenticated user). Requires current password and new password.
 */
export async function apiChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const token = getAuthState().token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(getApiUrl('/auth/change-password'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Change password failed');
  return data;
}
