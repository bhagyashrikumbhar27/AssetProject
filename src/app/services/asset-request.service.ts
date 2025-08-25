import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssetRequest, CreateAssetRequest } from '../models/asset-request.model';

@Injectable({
  providedIn: 'root'
})
export class AssetRequestService {
  private readonly employeeBase = `${environment.apiUrl}/employee`;
  private readonly baseUrl = `${environment.apiUrl}/employee/requests`; // <-- added baseUrl

  // Real-time update subjects
  private requestStatusUpdated = new Subject<{requestId: number, status: string, updatedBy: string}>();
  private requestsRefreshNeeded = new BehaviorSubject<boolean>(false);

  // Observables for components to subscribe to
  public requestStatusUpdated$ = this.requestStatusUpdated.asObservable();
  public requestsRefreshNeeded$ = this.requestsRefreshNeeded.asObservable();

  constructor(private http: HttpClient) {
    // Listen for storage events (cross-tab communication)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'request_status_update') {
          const updateData = JSON.parse(event.newValue || '{}');
          this.requestStatusUpdated.next(updateData);
        }
      });
    }
  }

  // GET /api/department-admin/requests?department=IT
  getDepartmentRequests(department: string): Observable<AssetRequest[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ ...(token ? { Authorization: `Bearer ${token}` } : {}) });

    const dept = (department || '').toString().trim();
    const urlQuery = `${environment.apiUrl}/department-admin/requests?department=${encodeURIComponent(dept)}`;
    const urlPath = `${environment.apiUrl}/department-admin/requests/${encodeURIComponent(dept)}`;

    const parseList = (raw: string): AssetRequest[] => {
      try {
        const parsed = JSON.parse(raw);
        const payload = parsed?.data ?? parsed;
        const mapObj = (o: any): AssetRequest => ({
          id: Number(o?.id) || 0,
          assetType: o?.assetType ?? o?.asset_type ?? '',
          priority: o?.priority ?? '',
          justification: o?.justification ?? '',
          status: o?.status ?? '',
          requestDate: o?.requestDate ?? o?.request_date ?? new Date().toISOString(),
          user: {
            id: Number(o?.user?.id ?? o?.user_id ?? 0),
            name: o?.user?.name ?? '',
            email: o?.user?.email ?? '',
            role: o?.user?.role ?? '',
            department: o?.user?.department ?? department,
            password: ''
          }
        });
        if (Array.isArray(payload)) return (payload as any[]).map(mapObj);
        if (payload && typeof payload === 'object') return [mapObj(payload)];
        return [];
      } catch { return []; }
    };

    return new Observable<AssetRequest[]>(subscriber => {
      this.http.get(urlQuery, { headers, withCredentials: true, responseType: 'text' }).subscribe({
        next: (raw) => { subscriber.next(parseList(raw)); subscriber.complete(); },
        error: () => {
          this.http.get(urlPath, { headers, withCredentials: true, responseType: 'text' }).subscribe({
            next: (raw2) => { subscriber.next(parseList(raw2)); subscriber.complete(); },
            error: (finalErr) => subscriber.error(finalErr)
          });
        }
      });
    });
  }

  // GET employee requests with role-aware endpoints and safe fallbacks
  getEmployeeRequests(userId?: number): Observable<AssetRequest[]> {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const targetUserId = userId || currentUser.id || '21';
    const role = (currentUser.role || '').toString();

    const token = localStorage.getItem('token');
    const isProbablyJwt = (t: string | null | undefined): boolean => {
      if (!t) return false;
      const trimmed = t.trim();
      if (trimmed === 'session-auth') return false;
      if (!trimmed || !trimmed.includes('.')) return false;
      const parts = trimmed.split('.');
      if (parts.length !== 3) return false;
      return trimmed.startsWith('eyJ');
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(isProbablyJwt(token) ? { Authorization: `Bearer ${token!.trim()}` } : {})
    });

    // Build role-specific URL candidates
    const urls: string[] = [];
    switch (role) {
      case 'super-admin':
        urls.push(
          `${environment.apiUrl}/superadmin/requests?userId=${encodeURIComponent(targetUserId)}`,
          `${environment.apiUrl}/superadmin/users/${encodeURIComponent(targetUserId)}/requests`
        );
        break;
      case 'department-admin':
        urls.push(
          `${environment.apiUrl}/department-admin/requests?userId=${encodeURIComponent(targetUserId)}`,
          `${environment.apiUrl}/department-admin/users/${encodeURIComponent(targetUserId)}/requests`
        );
        break;
      case 'store-manager':
        urls.push(
          `${environment.apiUrl}/store-manager/requests?userId=${encodeURIComponent(targetUserId)}`
        );
        break;
    }

    // Employee-pattern fallbacks
    urls.push(
      `${this.baseUrl}/${targetUserId}`, // /employee/requests/{userId}
      `${environment.apiUrl}/employee/${encodeURIComponent(targetUserId)}/requests`, // /employee/{userId}/requests
      `${environment.apiUrl}/employee/requests?userId=${encodeURIComponent(targetUserId)}` // query param
      // intentionally NOT calling /employee/requests without id to avoid 404 noise
    );

    const parseList = (raw: string): AssetRequest[] => {
      try {
        const parsed = JSON.parse(raw);
        const payload = parsed?.data ?? parsed;
        const mapObj = (o: any): AssetRequest => this.mapSqlToFrontend(o, Number(targetUserId));
        if (Array.isArray(payload)) return (payload as any[]).map(mapObj);
        if (payload && typeof payload === 'object') return [mapObj(payload)];
        return [];
      } catch { return []; }
    };

    return new Observable<AssetRequest[]>(subscriber => {
      const tryNext = (i: number) => {
        if (i >= urls.length) { subscriber.next([]); subscriber.complete(); return; }
        const url = urls[i];
        this.http.get(url, { headers, responseType: 'text', withCredentials: false }).subscribe({
          next: raw => { subscriber.next(parseList(raw)); subscriber.complete(); },
          error: () => tryNext(i + 1)
        });
      };
      tryNext(0);
    });
  }

  createAssetRequest(_employeeId: number, request: CreateAssetRequest): Observable<AssetRequest> {
    // Backend expects POST /api/employee/requests/{userId} - matches your controller
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const targetUserId = _employeeId || currentUser.id || '21'; // Default to user 21 from your DB

    const url = `${this.employeeBase}/requests/${targetUserId}`;
    const token = localStorage.getItem('token');

    console.log('Creating request for user ID:', targetUserId);
    console.log('API URL:', url);
    console.log('Request payload:', request);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    // Use SQL field mapping for backend compatibility
    const payload = this.mapFrontendToSql(request, _employeeId);

    return this.http.post(url, payload, { headers, responseType: 'text', withCredentials: true }).pipe(
      map(raw => {
        try {
          const parsed = JSON.parse(raw);
          const created = parsed?.data ?? parsed;
          return this.mapSqlToFrontend(created, _employeeId);
        } catch {
          // Fallback response when parsing fails
          return {
            id: Date.now(),
            assetType: request.assetType,
            priority: request.priority,
            justification: request.justification,
            status: 'Pending',
            requestDate: new Date().toISOString(),
            user: { id: _employeeId, name: '', email: '', role: '', department: '', password: '' }
          } as AssetRequest;
        }
      })
    );
  }

  updateRequestStatus(requestId: number, status: 'APPROVED'|'REJECTED'|'PENDING'): Observable<AssetRequest> {
    // Backend expects PUT /api/employee/requests/{requestId} with status in payload
    const url = `${this.baseUrl}/${requestId}`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    // Send minimal payload with just the status update
    const body = { status };
    return this.http.put(url, body, { headers, responseType: 'text', withCredentials: true }).pipe(
      map(raw => {
        try {
          const r = JSON.parse(raw)?.data ?? JSON.parse(raw);
          return { ...r, id: requestId, status } as AssetRequest;
        } catch {
          return { id: requestId, assetType: '', priority: '', justification: '', status, requestDate: new Date().toISOString(), user: { id: 0, name: '', email: '', role: '', department: '', password: '' } } as AssetRequest;
        }
      })
    );
  }

  // Department Admin specific methods
  approveDepartmentRequest(requestId: number, comment?: string): Observable<AssetRequest> {
    // Backend expects POST /api/department-admin/requests/{requestId}/approve with JSON body and Bearer auth
    const url = `${environment.apiUrl}/department-admin/requests/${requestId}/approve`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const body = {
      status: 'APPROVED',
      comment: comment || 'Approved by department admin'
    };

    return this.http.post(url, body, { headers, responseType: 'text', withCredentials: false }).pipe(
      map(raw => {
        try {
          const parsed = JSON.parse(raw);
          const data = parsed?.data ?? parsed;
          return this.mapSqlToFrontend({ ...data, id: requestId, status: 'APPROVED' });
        } catch {
          return { id: requestId, assetType: '', priority: '', justification: '', status: 'Approved', requestDate: new Date().toISOString(), user: { id: 0, name: '', email: '', role: '', department: '', password: '' } } as AssetRequest;
        }
      })
    );
  }

  rejectDepartmentRequest(requestId: number, comment?: string): Observable<AssetRequest> {
    // Backend expects POST /api/department-admin/requests/{requestId}/reject
    const url = `${environment.apiUrl}/department-admin/requests/${requestId}/reject`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const body = {
      status: 'REJECTED',
      comment: comment || 'Rejected by department admin'
    };

    return this.http.post(url, body, { headers, responseType: 'text', withCredentials: false }).pipe(
      map(raw => {
        try {
          const parsed = JSON.parse(raw);
          const data = parsed?.data ?? parsed;
          return this.mapSqlToFrontend({ ...data, id: requestId, status: 'REJECTED' });
        } catch {
          return { id: requestId, assetType: '', priority: '', justification: '', status: 'Rejected', requestDate: new Date().toISOString(), user: { id: 0, name: '', email: '', role: '', department: '', password: '' } } as AssetRequest;
        }
      })
    );
  }

  // For methods using baseUrl (update, delete, get details)
  updateAssetRequest(requestId: number, request: Partial<CreateAssetRequest & { status?: string }>, userId: number): Observable<AssetRequest> {
    // Backend expects PUT /api/employee/requests/{requestId}
    const url = `${this.baseUrl}/${requestId}`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    // Ensure the payload matches backend expectations
    const payload = {
      assetType: request.assetType,
      priority: request.priority,
      justification: request.justification,
      status: request.status || 'PENDING'
    };

    return this.http.put(url, payload, { headers, responseType: 'text', withCredentials: true }).pipe(
      map(raw => {
        try {
          const parsed = JSON.parse(raw);
          return {
            id: requestId,
            assetType: parsed.assetType || payload.assetType,
            priority: parsed.priority || payload.priority,
            justification: parsed.justification || payload.justification,
            status: parsed.status || payload.status,
            requestDate: parsed.requestDate || new Date().toISOString(),
            user: { id: userId, name: '', email: '', role: '', department: '', password: '' }
          } as AssetRequest;
        } catch {
          return {
            id: requestId,
            assetType: payload.assetType || '',
            priority: payload.priority || '',
            justification: payload.justification || '',
            status: payload.status,
            requestDate: new Date().toISOString(),
            user: { id: userId, name: '', email: '', role: '', department: '', password: '' }
          } as AssetRequest;
        }
      })
    );
  }

  deleteAssetRequest(requestId: number, _userId: number): Observable<boolean> {
    // Backend expects DELETE /api/employee/requests/{requestId}
    const url = `${this.baseUrl}/${requestId}`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    return this.http.delete(url, { headers, responseType: 'text', withCredentials: true }).pipe(map(() => true));
  }

  // CORRECTED METHOD
  getRequestDetails(requestId: number, userId: number): Observable<AssetRequest> {
    // Backend expects GET /api/employee/requests/{requestId}
    const url = `${this.baseUrl}/${requestId}`;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    return this.http.get(url, { headers, responseType: 'text', withCredentials: true }).pipe(
      map(raw => {
        try {
          const partial = JSON.parse(raw);
          // Construct a full AssetRequest object from the partial response
          const fullRequest: AssetRequest = {
            id: requestId, // Use the ID from the parameter
            assetType: partial.assetType || '',
            priority: partial.priority || '',
            justification: partial.justification || '',
            status: partial.status || 'PENDING',
            requestDate: partial.requestDate || new Date().toISOString(), // Add a fallback date
            user: { // Add a fallback user object
              id: userId,
              name: '',
              email: '',
              role: '',
              department: '',
              password: ''
            }
          };
          return fullRequest;
        } catch {
          // If parsing fails, return a minimal fallback object to prevent crashing
          return {
            id: requestId,
            assetType: '',
            priority: '',
            justification: '',
            status: 'PENDING',
            requestDate: new Date().toISOString(),
            user: { id: userId, name: '', email: '', role: '', department: '', password: '' }
          } as AssetRequest;
        }
      })
    );
  }

  // Notification methods for real-time updates
  notifyRequestStatusUpdate(requestId: number, status: string, updatedBy: string = 'department-admin') {
    const updateData = { requestId, status, updatedBy, timestamp: Date.now() };

    // Emit to current tab
    this.requestStatusUpdated.next(updateData);

    // Store in localStorage for cross-tab communication
    localStorage.setItem('request_status_update', JSON.stringify(updateData));

    // Trigger refresh for employee dashboards
    this.requestsRefreshNeeded.next(true);

    console.log('Request status update notification sent:', updateData);
  }

  triggerRequestsRefresh() {
    this.requestsRefreshNeeded.next(true);
  }

  // Method to clear refresh flag
  clearRefreshFlag() {
    this.requestsRefreshNeeded.next(false);
  }

  // Send approve/reject decision email; try multiple endpoints and suppress 404 noise
  sendDecisionEmail(requestId: number, decision: 'APPROVED' | 'REJECTED', recipientEmail?: string, comment?: string): Observable<boolean> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });

    const body: any = {
      requestId,
      decision,
      ...(recipientEmail ? { recipientEmail } : {}),
      ...(comment ? { comment } : {}),
      // Template support (backend should pick a Bootstrap-styled template by name)
      templateName: 'decision',
      theme: 'bootstrap'
    };

    const urls = [
      `${environment.apiUrl}/department-admin/requests/${requestId}/notify`
    ];

    return new Observable<boolean>(subscriber => {
      const tryNext = (index: number) => {
        if (index >= urls.length) {
          // All attempts failed
          subscriber.next(false);
          subscriber.complete();
          return;
        }
        const url = urls[index];
        this.http.post(url, body, { headers, withCredentials: false, responseType: 'text' }).subscribe({
          next: () => { subscriber.next(true); subscriber.complete(); },
          error: (err) => {
            // Suppress noisy 404s; log others once
            if (err?.status && err.status !== 404) {
              console.warn('Decision email attempt failed on', url, err);
            }
            tryNext(index + 1);
          }
        });
      };
      tryNext(0);
    });
  }

  // Notify admins about approvals/rejections (summary)
  notifyAdminsOfDecision(requestId: number, decision: 'APPROVED'|'REJECTED', department?: string): Observable<boolean> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
    const body = { requestId, decision, department };
    const urls = [
      `${environment.apiUrl}/mail/decision-admins`,
      `${environment.apiUrl}/department-admin/requests/${requestId}/notify-admins`
    ];
    return new Observable<boolean>(subscriber => {
      const tryNext = (i: number) => {
        if (i >= urls.length) { subscriber.next(false); subscriber.complete(); return; }
        this.http.post(urls[i], body, { headers, responseType: 'text', withCredentials: false }).subscribe({
          next: () => { subscriber.next(true); subscriber.complete(); },
          error: () => tryNext(i + 1)
        });
      };
      tryNext(0);
    });
  }

  // Map SQL database fields to frontend AssetRequest model
  private mapSqlToFrontend(sqlData: any, fallbackUserId?: number): AssetRequest {
    return {
      id: Number(sqlData?.id) || 0,
      assetType: sqlData?.asset_type ?? sqlData?.assetType ?? '',
      priority: sqlData?.priority ?? '',
      justification: sqlData?.justification ?? '',
      status: this.normalizeStatus(sqlData?.status ?? ''),
      requestDate: sqlData?.request_date ?? sqlData?.requestDate ?? new Date().toISOString(),
      user: {
        id: Number(sqlData?.user_id ?? sqlData?.user?.id ?? fallbackUserId ?? 0),
        name: sqlData?.user?.name ?? sqlData?.user_name ?? '',
        email: sqlData?.user?.email ?? sqlData?.user_email ?? '',
        role: sqlData?.user?.role ?? sqlData?.user_role ?? 'employee',
        department: sqlData?.user?.department ?? sqlData?.user_department ?? '',
        password: ''
      }
    };
  }

  // Map frontend AssetRequest to backend API format (matches your Postman request)
  private mapFrontendToSql(frontendData: CreateAssetRequest, _userId: number): any {
    return {
      assetType: frontendData.assetType,    // Backend expects camelCase, not snake_case
      priority: frontendData.priority,
      justification: frontendData.justification,
      status: 'PENDING'
      // user_id and request_date are handled by backend automatically
    };
  }

  // Normalize status values to match frontend expectations
  private normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed'
    };
    return statusMap[status?.toUpperCase()] || status || 'Pending';
  }
}