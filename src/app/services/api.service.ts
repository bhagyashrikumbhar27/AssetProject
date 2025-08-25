import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // Example backend health check
  getHealth() {
    return this.http.get(`${this.baseUrl}/health`);
  }
}