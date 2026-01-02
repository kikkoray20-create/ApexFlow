// Added React import to resolve "Cannot find namespace 'React'" error
import React from 'react';

export type UserRole = 'Super Admin' | 'Picker' | 'Checker' | 'Dispatcher' | 'GR';

export interface RolePermissions {
  role: UserRole;
  allowedModules: string[]; // Array of SidebarItem IDs
}

export interface BaseEntity {
  id: string;
  instanceId?: string; // Links data to a specific Super Admin node
}

export interface User extends BaseEntity {
  name: string;
  role: UserRole;
  phone: string;
  password?: string;
  avatar?: string;
  active: boolean;
  location?: string;
  cloudServer?: string;
}

export interface InventoryItem extends BaseEntity {
  brand: string;
  model: string;
  quality: string;
  quantity: number;
  price: number;
  location: string;
  category?: string;
  warehouse?: string;
  status?: string;
}

export interface GRInventoryItem extends BaseEntity {
  brand: string;
  model: string;
  quality: string;
  quantity: number;
  lastReturnDate: string;
}

export interface Firm extends BaseEntity {
  name: string;
  address?: string;
  gstin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer extends BaseEntity {
  firmId?: string;
  name: string;
  nickname?: string;
  phone: string;
  city: string;
  state?: string;
  pincode?: string;
  address?: string;
  market?: string;
  type: 'Owner' | 'Agent';
  status: 'Approved' | 'Pending' | 'Rejected';
  createdAt: string;
  totalOrders: number;
  balance: number;
  password?: string;
}

export interface Order extends BaseEntity {
  customerName: string;
  customerSubtext: string;
  orderTime: string;
  warehouse: string;
  status: OrderStatus;
  assignedTo?: string;
  assignedToId?: string;
  checkedBy?: string;
  invoiceStatus: 'Pending' | 'Paid' | 'Overdue' | 'Sent';
  orderMode: 'Online' | 'Offline';
  cargoName?: string;
  totalAmount?: number;
  remarks?: string;
}

export interface OrderItem {
  id: string;
  brand: string;
  quality: string;
  category: string;
  model: string;
  orderQty: number;
  displayPrice: number;
  fulfillQty: number;
  finalPrice: number;
}

export type OrderStatus = 'fresh' | 'assigned' | 'packed' | 'checked' | 'dispatched' | 'pending' | 'cancelled' | 'rejected' | 'Payment' | 'Return';

export interface StatCardData {
  label: string;
  value: number;
  colorClass: string;
  iconColorClass: string;
  icon?: React.ReactNode;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  subItems?: { label: string; id: string }[];
  isOpen?: boolean;
}

export interface InventoryLog extends BaseEntity {
    itemId: string;
    modelName: string;
    shopName: string;
    status: 'Added' | 'Removed';
    quantityChange: number;
    currentStock: number;
    remarks: string;
    createdDate: string;
    customerName?: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}