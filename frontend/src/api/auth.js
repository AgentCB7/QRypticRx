import { api } from './client';

export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  verifyEmail: (data) => api.post('/api/auth/verify-email', data),
  loginVerify: (data) => api.post('/api/auth/login/verify', data),
  resendOtp: (data) => api.post('/api/auth/resend-otp', data),
};
