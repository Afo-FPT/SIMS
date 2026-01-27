
/**
 * Mock Authentication Service
 * In production, this would connect to a real backend API
 */

export interface LoginCredentials {
  email: string;
  password: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  role: string | null;
  isVerified: boolean;
}

/**
 * Mock login - accepts any credentials for demo
 */
export async function mockLogin(credentials: LoginCredentials): Promise<{ success: boolean; message?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation - accept any email/password
  if (credentials.email && credentials.password && credentials.role) {
    return { success: true };
  }
  
  return { success: false, message: 'Invalid credentials' };
}

/**
 * Mock OTP generation
 */
export function generateMockOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mock OTP verification
 */
export async function mockVerifyOtp(otp: string, expectedOtp: string): Promise<{ success: boolean; message?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Accept the expected OTP or a test code
  if (otp === expectedOtp || otp === '123456') {
    return { success: true };
  }
  
  return { success: false, message: 'Invalid verification code' };
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
    };
  }

  const role = localStorage.getItem('sws_persona');
  const email = localStorage.getItem('sws_email');
  const verified = localStorage.getItem('sws_verified') === 'true';

  return {
    isAuthenticated: !!role && verified,
    email,
    role,
    isVerified: verified,
  };
}

/**
 * Clear auth state (logout)
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('sws_persona');
  localStorage.removeItem('sws_email');
  localStorage.removeItem('sws_verified');
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
