import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// Centralized error handling
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Sanitize technical backend messages for UI
      const body = sanitizeErrorPayload(error);
      const sanitized = new HttpErrorResponse({
        error: body,
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined
      });

      // Do NOT auto-logout on 401; let route guards/UI decide
      return throwError(() => sanitized);
    })
  );
};

function sanitizeErrorPayload(error: HttpErrorResponse): any {
  // Quietly suppress auth-related messages
  if (error.status === 401 || error.status === 403) {
    return { message: '' };
  }

  // Try to detect Java/enum errors and replace with minimal text
  try {
    if (typeof error.error === 'string') {
      const raw = error.error;
      // Attempt JSON parse
      try {
        const parsed = JSON.parse(raw);
        return sanitizeObject(parsed);
      } catch {
        // Non-JSON raw text -> keep quiet
        return { message: '' };
      }
    }

    if (typeof error.error === 'object' && error.error) {
      return sanitizeObject(error.error);
    }
  } catch {
    // fallthrough
  }

  // Default: no message to avoid noisy generic alerts
  return { message: '' };
}

function sanitizeObject(obj: any): any {
  const str = JSON.stringify(obj);
  if (str.includes('No enum constant') || str.includes('java') || str.includes('com.')) {
    return { message: '' };
  }
  // Keep original shape but ensure there is a message field for UI
  if (!obj.message && obj.error) {
    return { ...obj, message: typeof obj.error === 'string' ? obj.error : '' };
  }
  // Ensure message exists but don't spam
  if (!obj.message) return { ...obj, message: '' };
  return obj;
}