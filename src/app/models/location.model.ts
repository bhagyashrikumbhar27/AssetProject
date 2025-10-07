export interface LocationPayload {
  name: string;
  // department is optional for POST /department-admin/locations
  department?: string; // e.g., 'IT'
}

export interface LocationResponse {
  id?: number | string;
  name?: string;
  department?: string;
}