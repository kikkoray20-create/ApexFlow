import { User, Order, Customer, Firm, InventoryItem, InventoryLog, GRInventoryItem, RolePermissions, OrderItem } from '../types';
import { MOCK_USERS, MOCK_CUSTOMERS, MOCK_INVENTORY } from '../constants';

// Storage Keys
const KEYS = {
    users: 'apexflow_users',
    orders: 'apexflow_orders',
    customers: 'apexflow_customers', 
    firms: 'apexflow_firms',
    inventory: 'apexflow_inventory',
    inventory_logs: 'apexflow_inventory_logs',
    links: 'apexflow_links',
    groups: 'apexflow_groups',
    gr_inventory: 'apexflow_gr_inventory',
    master_records: 'apexflow_master_records',
    role_permissions: 'apexflow_role_permissions'
};

// =========================================================
// PURE LOCAL STORAGE HELPERS
// =========================================================

const getData = async (storageKey: string, fallbackData: any[] = [], instanceId?: string) => {
    try {
        const local = localStorage.getItem(storageKey);
        let parsed = local ? JSON.parse(local) : [];
        
        const isMasterKey = storageKey.startsWith(KEYS.master_records);
        const isMockAllowedKey = [
            'apexflow_role_permissions', 
            'apexflow_users', 
            'apexflow_inventory', 
            'apexflow_customers'
        ].includes(storageKey) || isMasterKey;
        
        if (parsed.length === 0 && fallbackData.length > 0 && isMockAllowedKey) {
            parsed = fallbackData;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
        }

        if (instanceId && !['apexflow_role_permissions'].includes(storageKey) && !storageKey.startsWith(KEYS.master_records)) {
            return parsed.filter((item: any) => !item.instanceId || item.instanceId === instanceId);
        }
        
        return parsed;
    } catch (e) {
        console.warn(`Data retrieval failed for ${storageKey}`, e);
        return fallbackData;
    }
};

const saveData = async (storageKey: string, data: any, isUpdate = false) => {
    const localStr = localStorage.getItem(storageKey);
    let localData: any[] = localStr ? JSON.parse(localStr) : [];
    
    if (isUpdate) {
        localData = localData.map((item: any) => item.id === data.id ? data : item);
    } else {
        const exists = localData.find((item: any) => item.id === data.id);
        if (!exists) localData = [data, ...localData];
    }
    localStorage.setItem(storageKey, JSON.stringify(localData));
    return data;
};

const removeData = async (storageKey: string, id: string) => {
    const localStr = localStorage.getItem(storageKey);
    if (localStr) {
        const localData = JSON.parse(localStr);
        const filteredData = localData.filter((item: any) => item.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(filteredData));
    }
};

// =========================================================
// ROLE PERMISSIONS
// =========================================================

export const fetchRolePermissions = async (): Promise<RolePermissions[]> => {
    const defaultPermissions: RolePermissions[] = [
        { role: 'Super Admin', allowedModules: ['orders', 'clients', 'links', 'broadcast', 'models', 'users', 'reports'] },
        { role: 'Picker', allowedModules: ['orders'] },
        { role: 'Checker', allowedModules: ['orders'] },
        { role: 'Dispatcher', allowedModules: ['orders'] },
        { role: 'GR', allowedModules: ['clients'] }
    ];
    const data = await getData(KEYS.role_permissions, defaultPermissions.map(p => ({ ...p, id: p.role })));
    return data.map((d: any) => ({ role: d.role, allowedModules: d.allowedModules }));
};

export const updateRolePermissions = async (permission: RolePermissions) => {
    return saveData(KEYS.role_permissions, { ...permission, id: permission.role }, true);
};

// =========================================================
// MASTER DATA
// =========================================================

const DEFAULT_MASTERS: Record<string, string[]> = {
    brand: ['APPLE', 'SAMSUNG', 'VIVO', 'OPPO', 'REALME', 'XIAOMI', 'ONEPLUS', 'MOTOROLA', 'GOOGLE'],
    quality: ['OG', 'ORIGINAL', 'PREMIUM', 'HD+', 'OLED', 'AMOLED', 'IN-CELL'],
    category: ['DISPLAY', 'BATTERY', 'FLEX', 'CAMERA', 'BACK GLASS', 'HOUSING', 'IC'],
    warehouse: ['MAIN WAREHOUSE', 'APEXFLOW NORTH', 'APEXFLOW SOUTH'],
    model: ['IPHONE 15 PRO MAX', 'S23 ULTRA', 'NOTE 12 PRO', 'V29 PRO', 'RENO 10']
};

export const fetchMasterRecords = async (type: string): Promise<string[]> => {
    const fallback = (DEFAULT_MASTERS[type] || []).map(val => ({
        id: `${type}_${val.replace(/\s+/g, '_').toLowerCase()}`,
        value: val
    }));
    const data = await getData(`${KEYS.master_records}_${type}`, fallback);
    return data.map((d: any) => d.value).sort();
};

export const addMasterRecord = async (type: string, value: string) => {
    const id = `${type}_${value.replace(/\s+/g, '_').toLowerCase()}`;
    return saveData(`${KEYS.master_records}_${type}`, { id, value: value.toUpperCase() });
};

export const deleteMasterRecord = async (type: string, value: string) => {
    const id = `${type}_${value.replace(/\s+/g, '_').toLowerCase()}`;
    return removeData(`${KEYS.master_records}_${type}`, id);
};

// =========================================================
// USERS
// =========================================================

// Fixed missing export for fetchUsers
export const fetchUsers = async (instanceId?: string): Promise<User[]> => {
    return getData(KEYS.users, MOCK_USERS, instanceId);
};

// Fixed missing export for addUserToDB
export const addUserToDB = async (user: User) => {
    return saveData(KEYS.users, user);
};

// Fixed missing export for updateUserInDB
export const updateUserInDB = async (user: User) => {
    return saveData(KEYS.users, user, true);
};

// Fixed missing export for deleteUserFromDB
export const deleteUserFromDB = async (id: string) => {
    return removeData(KEYS.users, id);
};

// =========================================================
// ORDERS
// =========================================================

// Fixed missing export for fetchOrders
export const fetchOrders = async (instanceId?: string): Promise<Order[]> => {
    return getData(KEYS.orders, [], instanceId);
};

// Fixed missing export for addOrderToDB
export const addOrderToDB = async (order: Order) => {
    return saveData(KEYS.orders, order);
};

// Fixed missing export for updateOrderInDB
export const updateOrderInDB = async (order: Order) => {
    return saveData(KEYS.orders, order, true);
};

// Fixed missing export for deleteOrderFromDB
export const deleteOrderFromDB = async (id: string) => {
    return removeData(KEYS.orders, id);
};

// =========================================================
// CUSTOMERS
// =========================================================

// Fixed missing export for fetchCustomers
export const fetchCustomers = async (instanceId?: string): Promise<Customer[]> => {
    return getData(KEYS.customers, MOCK_CUSTOMERS, instanceId);
};

// Fixed missing export for addCustomerToDB
export const addCustomerToDB = async (customer: Customer) => {
    return saveData(KEYS.customers, customer);
};

// Fixed missing export for updateCustomerInDB
export const updateCustomerInDB = async (customer: Customer) => {
    return saveData(KEYS.customers, customer, true);
};

// =========================================================
// FIRMS
// =========================================================

// Fixed missing export for fetchFirms
export const fetchFirms = async (instanceId?: string): Promise<Firm[]> => {
    return getData(KEYS.firms, [], instanceId);
};

// Fixed missing export for addFirmToDB
export const addFirmToDB = async (firm: Firm) => {
    return saveData(KEYS.firms, firm);
};

// Fixed missing export for updateFirmInDB
export const updateFirmInDB = async (firm: Firm) => {
    return saveData(KEYS.firms, firm, true);
};

// =========================================================
// INVENTORY
// =========================================================

// Fixed missing export for fetchInventory
export const fetchInventory = async (instanceId?: string): Promise<InventoryItem[]> => {
    return getData(KEYS.inventory, MOCK_INVENTORY, instanceId);
};

// Fixed missing export for addInventoryItemToDB
export const addInventoryItemToDB = async (item: InventoryItem) => {
    return saveData(KEYS.inventory, item);
};

// Fixed missing export for updateInventoryItemInDB
export const updateInventoryItemInDB = async (item: InventoryItem) => {
    return saveData(KEYS.inventory, item, true);
};

// Fixed missing export for fetchInventoryLogs
export const fetchInventoryLogs = async (instanceId?: string): Promise<InventoryLog[]> => {
    return getData(KEYS.inventory_logs, [], instanceId);
};

// Fixed missing export for addInventoryLogToDB
export const addInventoryLogToDB = async (log: InventoryLog) => {
    return saveData(KEYS.inventory_logs, log);
};

// =========================================================
// PORTALS / LINKS
// =========================================================

// Fixed missing export for fetchLinks
export const fetchLinks = async (instanceId?: string) => {
    return getData(KEYS.links, [], instanceId);
};

// Fixed missing export for addLinkToDB
export const addLinkToDB = async (link: any) => {
    return saveData(KEYS.links, link);
};

// Fixed missing export for updateLinkInDB
export const updateLinkInDB = async (link: any) => {
    return saveData(KEYS.links, link, true);
};

// Fixed missing export for deleteLinkFromDB
export const deleteLinkFromDB = async (id: string) => {
    return removeData(KEYS.links, id);
};

// =========================================================
// BROADCAST GROUPS
// =========================================================

// Fixed missing export for fetchGroups
export const fetchGroups = async (instanceId?: string) => {
    return getData(KEYS.groups, [], instanceId);
};

// Fixed missing export for addGroupToDB
export const addGroupToDB = async (group: any) => {
    return saveData(KEYS.groups, group);
};

// Fixed missing export for updateGroupInDB
export const updateGroupInDB = async (group: any) => {
    return saveData(KEYS.groups, group, true);
};

// Fixed missing export for deleteGroupFromDB
export const deleteGroupFromDB = async (id: string) => {
    return removeData(KEYS.groups, id);
};

// =========================================================
// GR INVENTORY
// =========================================================

// Fixed missing export for fetchGRInventory
export const fetchGRInventory = async (instanceId?: string): Promise<GRInventoryItem[]> => {
    return getData(KEYS.gr_inventory, [], instanceId);
};

// Fixed missing export for updateGRInventoryItemInDB
export const updateGRInventoryItemInDB = async (item: GRInventoryItem) => {
    return saveData(KEYS.gr_inventory, item, true);
};