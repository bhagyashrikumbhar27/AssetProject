import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IssueAssetPayload {
  assetId: number;
  employeeId: number;
  quantity: number; // number of units to issue
  issueDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface ReturnAssetPayload {
  assetId: number;
  employeeId: number;
  returnDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface AddStockPayload {
  assetId: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class StoreManagerService {
  private readonly baseUrl = `${environment.apiUrl}/store-manager`;
  constructor(private http: HttpClient) {}

  issueAsset(payload: IssueAssetPayload): Observable<any> {
    const token = localStorage.getItem('token');
    console.log('StoreManagerService.issueAsset called with:', { payload, token });

    // Create headers with authentication
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && token !== 'session-auth' ? { 'Authorization': `Bearer ${token}` } : {})
    });

    console.log('Request headers:', headers.keys().map(key => `${key}: ${headers.get(key)}`));
    console.log('Request URL:', `${this.baseUrl}/issue`);
    console.log('With credentials:', true);

    return this.http
      .post(`${this.baseUrl}/issue`, payload, {
        headers,
        withCredentials: true,
        responseType: 'text',
        observe: 'response'
      })
      .pipe(
        map(response => {
          console.log('Issue asset response:', response);
          try {
            return JSON.parse(response.body || '{}');
          } catch {
            return response.body || 'Success';
          }
        })
      );
  }

  returnAsset(payload: ReturnAssetPayload): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && token !== 'session-auth' ? { 'Authorization': `Bearer ${token}` } : {})
    });

    // Align body with backend expectations: assetId, employeeId, notes
    const body = {
      assetId: payload.assetId,
      employeeId: payload.employeeId,
      notes: payload.notes
    } as const;

    return this.http
      .post(`${this.baseUrl}/return`, body, { headers, withCredentials: true, responseType: 'text' })
      .pipe(map(raw => { try { return JSON.parse(raw); } catch { return raw; } }));
  }

  addStock(payload: AddStockPayload): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && token !== 'session-auth' ? { 'Authorization': `Bearer ${token}` } : {})
    });

    // Support backends expecting snake_case (asset_id) or camelCase (assetId)
    const body: any = {
      assetId: payload.assetId,
      asset_id: payload.assetId,
      quantity: payload.quantity
    };

    return this.http
      .post(`${this.baseUrl}/add-stock`, body, { headers, withCredentials: true, responseType: 'text' })
      .pipe(map(raw => { try { return JSON.parse(raw); } catch { return raw; } }));
  }

  // GET /api/store-manager/stats - matches your backend controller
  getStats(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && token !== 'session-auth' ? { 'Authorization': `Bearer ${token}` } : {})
    });

    return this.http
      .get(`${this.baseUrl}/stats`, { headers, withCredentials: true, responseType: 'text' })
      .pipe(map(raw => { try { return JSON.parse(raw); } catch { return raw; } }));
  }

  // GET /api/store-manager/inventory - supports optional department/location filters
  getInventory(params?: { department?: string; location?: string }): Observable<any[]> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Build URL with optional query params to match backend filters
    let url = `${this.baseUrl}/inventory`;
    const qs: string[] = [];
    if (params?.department) qs.push(`department=${encodeURIComponent(params.department)}`);
    if (params?.location) qs.push(`location=${encodeURIComponent(params.location)}`);
    if (qs.length) url += `?${qs.join('&')}`;

    return this.http
      .get(url, { headers, withCredentials: true, responseType: 'text' })
      .pipe(
        map(raw => {
          try {
            const parsed = JSON.parse(raw);
            const rows = Array.isArray(parsed)
              ? parsed
              : Array.isArray((parsed as any)?.data)
                ? (parsed as any).data
                : Array.isArray((parsed as any)?.rows)
                  ? (parsed as any).rows
                  : [];

            // Normalize backend store_assets rows to UI shape (prefer direct backend fields)
            return rows.map((r: any) => {
              const id = r.id ?? r.asset_id ?? r.assetId;
              const model = r.model ?? '';
              const name = r.name ?? model ?? 'Unknown';
              const qty = Number(r.quantity ?? r.qty ?? 0) || 0;
              const status = r.status ?? 'Available';

              const lowerName = (name || '').toLowerCase();
              const assetType = r.category ?? r.assetType ?? (lowerName.includes('laptop') ? 'Laptop' : (lowerName.includes('monitor') ? 'Monitor' : 'General'));
              const available = Number(r.available ?? (status === 'ISSUED' ? 0 : qty)) || 0;
              const issued = Number(r.issued ?? (status === 'ISSUED' ? qty : 0)) || 0;
              const location = r.location ?? '';
              const serialNumber = r.serialNumber ?? r.serial ?? `ASSET-${id}`;

              return {
                id,
                name,                 // used by template
                assetName: name,      // template fallback compatibility
                model,
                category: assetType,  // template reads category or assetType
                assetType,
                quantity: qty,
                available,
                issued,
                location,
                status,
                serialNumber
              };
            });
          } catch {
            return [];
          }
        })
      );
  }

  // GET /api/store-manager/transactions - matches your backend controller
  getTransactions(): Observable<any[]> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .get(`${this.baseUrl}/transactions`, { headers, withCredentials: true, responseType: 'text' })
      .pipe(
        map(raw => {
          // Accept text responses and normalize to UI-friendly shape
          try {
            const parsed = JSON.parse(raw);
            const records = Array.isArray(parsed)
              ? parsed
              : Array.isArray((parsed as any)?.data)
                ? (parsed as any).data
                : Array.isArray((parsed as any)?.rows)
                  ? (parsed as any).rows
                  : [];

            // Map DB fields (id, asset_id, employee_id, notes, txn_date, txn_type, resolved_date)
            // to UI fields expected by the dashboard template
            return records.map((t: any) => {
              const typeRaw = t.txn_type || t.type || t.transactionType;
              const type = typeRaw === 'ISSUE' ? 'Issue' : typeRaw === 'RETURN' ? 'Return' : (typeRaw || 'Issue');
              const assetId = t.asset_id ?? t.assetId ?? t.asset?.id;
              const employeeId = t.employee_id ?? t.employeeId ?? t.employee?.id;
              const date = t.txn_date || t.issueDate || t.date || t.transactionDate;
              const resolvedDate = t.resolved_date || t.resolvedDate || t.fix_date || t.fixedDate || t.closure_date || t.closureDate || null;
              const assetName = t.asset_name || t.assetName || (assetId != null ? `Asset #${assetId}` : (t.asset || 'Unknown Asset'));
              const employeeName = t.employee_name || t.employeeName || (employeeId != null ? `Emp #${employeeId}` : (t.employee || 'Unknown Employee'));
              const employeeLocation = t.employee_location || t.employeeLocation || t.location || '';

              return {
                id: t.id,
                type,                      // 'Issue' | 'Return'
                assetId,                   // numeric id
                employeeId,                // numeric id
                asset: assetName,          // used by template fallback
                assetName,                 // preferred by template
                employee: employeeName,    // used by template fallback
                employeeName,              // preferred by template
                employeeLocation,          // show location in Store Manager
                date,                      // issue/transaction date
                resolvedDate,              // new: resolved/fixed/closure date
                transactionDate: date,     // fallback used by template
                status: t.status || 'Completed',
                notes: t.notes ?? ''
              };
            });
          } catch {
            return [];
          }
        })
      );
  }
}