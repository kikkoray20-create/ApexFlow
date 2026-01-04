import React from 'react';
import { 
  ShoppingBag, Users, Radio, Link as LinkIcon, Box, Layers, UserCog, 
  FileText, Package, CheckCircle, Truck, Clock, Send, UserPlus
} from 'lucide-react';
import { User, Customer, InventoryItem } from './types.ts';

export const SIDEBAR_ITEMS = [
  { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
  { id: 'clients', label: 'Clients', icon: <Users size={18} /> },
  { id: 'links', label: 'Links', icon: <LinkIcon size={18} /> },
  { id: 'broadcast', label: 'Broadcast', icon: <Radio size={18} /> },
  { id: 'models', label: 'Inventory', icon: <Box size={18} /> },
  { id: 'users', label: 'Team', icon: <UserCog size={18} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'ApexFlow Admin', role: 'Super Admin', phone: '1231231231', password: '123', active: true },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'c1', name: 'RAJESH MOBILE STORE', nickname: 'Rajesh Bhai', 
    phone: '+91 9829012345', city: 'Mumbai', state: 'Maharashtra', 
    type: 'Owner', status: 'Approved', createdAt: '12/05/2024', 
    totalOrders: 12, balance: 4500
  }
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'inv1', brand: 'APPLE', quality: 'ORIGINAL', model: 'IPHONE 15 PRO DISPLAY', quantity: 15, price: 18500, location: 'R1-A' }
];