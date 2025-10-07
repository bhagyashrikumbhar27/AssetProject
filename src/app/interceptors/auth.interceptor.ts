import { HttpInterceptorFn } from '@angular/common/http';

// Attach Authorization only for real JWTs; always include cookies
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  const isProbablyJwt = (t: string | null | undefined): boolean => {
    if (!t) return false;
    const trimmed = t.trim();
    // Basic heuristic: three dot-separated base64url segments and header starting with eyJ
    if (!trimmed || !trimmed.includes('.')) return false;
    const parts = trimmed.split('.');
    if (parts.length !== 3) return false;
    return trimmed.startsWith('eyJ');
  };

  if (isProbablyJwt(token)) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token!.trim()}` },
      withCredentials: true
    });
    return next(authReq);
  }

  // No valid JWT -> rely on session cookies only
  const reqWithCreds = req.clone({ withCredentials: true });
  return next(reqWithCreds);
};