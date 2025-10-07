export interface AssetRequest {
  id: number;
  assetType: string;
  priority: string;
  justification: string;
  status: string;
  requestDate: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
    password: string;
  };
}

export interface CreateAssetRequest {
  assetType: string;
  priority: string;
  justification: string;
}

export enum AssetRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export enum AssetRequestPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum AssetType {
  LAPTOP = 'Laptop',
  MONITOR = 'Monitor',
  KEYBOARD = 'Keyboard',
  MOUSE = 'Mouse',
  HEADSET = 'Headset',
  PRINTER = 'Printer',
  PHONE = 'Phone',
  TABLET = 'Tablet',
  OTHER = 'Other'
}