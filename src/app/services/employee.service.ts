import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeeRequestPayload {
  assetType: string;
  priority: string;
  justification: string;
}

export interface EmployeeRequest {
  id: number;
  assetType: string;
  priority: string;
  justification: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeRequestService {
  private readonly baseUrl = `${environment.apiUrl}/api/employee/requests`;

  constructor(private http: HttpClient) {}

  // POST /api/employee/requests
  createRequest(payload: EmployeeRequestPayload): Observable<EmployeeRequest> {
    return this.http.post<EmployeeRequest>(this.baseUrl, payload);
  }

  // GET /api/employee/requests/{id}
  getRequestById(id: number): Observable<EmployeeRequest> {
    return this.http.get<EmployeeRequest>(`${this.baseUrl}/${id}`);
  }

  // GET /api/employee/requests
  getAllRequests(): Observable<EmployeeRequest[]> {
    return this.http.get<EmployeeRequest[]>(this.baseUrl);
  }
}
