'use client';

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
