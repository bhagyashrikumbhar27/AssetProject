import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LocationPayload, LocationResponse } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // Resolve current user's role from localStorage
  private getCurrentRole(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return 'employee';
      const parsed = JSON.parse(raw);
      return parsed?.role || 'employee';
    } catch {
      return 'employee';
    }
  }

  // Build role-based GET endpoint
  private buildGetLocationsUrl(department?: string): string {
    const role = this.getCurrentRole();

    let base: string;
    switch (String(role)) {
      case 'super-admin':
        base = `${this.apiUrl}/superadmin/locations`;
        break;
      case 'store-manager':
        base = `${this.apiUrl}/store-manager/locations`;
        break;
      case 'department-admin':
        base = `${this.apiUrl}/department-admin/locations`;
        break;
      default:
        // Fallback for other roles (employees/admins)
        base = `${this.apiUrl}/locations`;
        break;
    }

    if (department) {
      const sep = base.includes('?') ? '&' : '?';
      base = `${base}${sep}department=${encodeURIComponent(department)}`;
    }
    return base;
  }

  // Normalize list responses that may be wrapped or plain
  private parseList(raw: string): LocationResponse[] {
    try {
      const parsed = JSON.parse(raw);
      const payload = parsed?.data ?? parsed;
      return Array.isArray(payload) ? (payload as LocationResponse[]) : [];
    } catch {
      return [];
    }
  }

  // Normalize single item responses that may be wrapped or plain
  private parseOne(raw: string, fallback: LocationResponse): LocationResponse {
    try {
      const parsed = JSON.parse(raw);
      return (parsed?.data ?? parsed) as LocationResponse;
    } catch {
      return fallback;
    }
  }

  // GET locations (role-aware). Includes Bearer auth when available; no cookies required.
  getLocations(department?: string): Observable<LocationResponse[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const primaryUrl = this.buildGetLocationsUrl(department);
    const genericFallback = department
      ? `${this.apiUrl}/locations?department=${encodeURIComponent(department)}`
      : `${this.apiUrl}/locations`;

    return new Observable<LocationResponse[]>(subscriber => {
      this.http.get(primaryUrl, { withCredentials: false, responseType: 'text', headers }).subscribe({
        next: (raw) => { subscriber.next(this.parseList(raw)); subscriber.complete(); },
        error: () => {
          // Fallback to generic locations if role-specific endpoint not available
          this.http.get(genericFallback, { withCredentials: false, responseType: 'text', headers }).subscribe({
            next: (raw2) => { subscriber.next(this.parseList(raw2)); subscriber.complete(); },
            error: (finalErr) => subscriber.error(finalErr)
          });
        }
      });
    });
  }

  // POST location via department-admin endpoint; send name and optional department
  createLocation(payload: LocationPayload): Observable<LocationResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

    // Backend accepts Location entity: include department if provided
    const body: any = { name: payload.name };
    if (payload.department) body.department = payload.department;

    const primaryUrl = `${this.apiUrl}/department-admin/locations`;
    const genericFallback = `${this.apiUrl}/locations`;

    return new Observable<LocationResponse>(subscriber => {
      this.http.post(primaryUrl, body, { headers, withCredentials: false, responseType: 'text' }).subscribe({
        next: (raw) => { subscriber.next(this.parseOne(raw, { name: payload.name, department: payload.department })); subscriber.complete(); },
        error: () => {
          // Fallback to generic creation endpoint if needed
          this.http.post(genericFallback, body, { headers, withCredentials: false, responseType: 'text' }).subscribe({
            next: (raw2) => { subscriber.next(this.parseOne(raw2, { name: payload.name, department: payload.department })); subscriber.complete(); },
            error: (finalErr) => subscriber.error(finalErr)
          });
        }
      });
    });
  }

  // Assign location to employee (department-admin only); invisible to other roles
  assignLocationToEmployee(employeeId: string | number, locationId: string | number): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
    const url = `${this.apiUrl}/department-admin/employees/${employeeId}/assign-location`;
    const body = { locationId };
    return new Observable<void>(subscriber => {
      this.http.post(url, body, { headers, withCredentials: false }).subscribe({
        next: () => { subscriber.next(); subscriber.complete(); },
        error: (err) => subscriber.error(err)
      });
    });
  }
}