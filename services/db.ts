import { User, Order, Customer, Firm, InventoryItem, InventoryLog, GRInventoryItem, RolePermissions, OrderItem } from '../types.ts';
import { MOCK_USERS, MOCK_CUSTOMERS, MOCK_INVENTORY } from '../constants.tsx';

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

const getData = async (storageKey: string, fallbackData: any[] = [], instanceId?: string) => {
    try {
        const local = localStorage.getItem(storageKey);
        let parsed = local ? JSON.parse(local) : [];
        
        if (parsed.length === 0 && fallbackData.length > 0) {
            parsed = fallbackData;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
        }

        if (instanceId && !storageKey.startsWith(KEYS.master_records) && storageKey !== KEYS.role_permissions) {
            return parsed.filter((item: any) => !item.instanceId || item.instanceId === instanceId);
        }
        
        return parsed;
    } catch (e) {
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

export const fetchMasterRecords = async (type: string): Promise<string[]> => {
    const data = await getData(`${KEYS.master_records}_${type}`, []);
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

export const fetchUsers = async (instanceId?: string): Promise<User[]> => getData(KEYS.users, MOCK_USERS, instanceId);
export const addUserToDB = async (user: User) => saveData(KEYS.users, user);
export const updateUserInDB = async (user: User) => saveData(KEYS.users, user, true);
export const deleteUserFromDB = async (id: string) => removeData(KEYS.users, id);

export const fetchOrders = async (instanceId?: string): Promise<Order[]> => getData(KEYS.orders, [], instanceId);
export const addOrderToDB = async (order: Order) => saveData(KEYS.orders, order);
export const updateOrderInDB = async (order: Order) => saveData(KEYS.orders, order, true);
export const deleteOrderFromDB = async (id: string) => removeData(KEYS.orders, id);

export const fetchCustomers = async (instanceId?: string): Promise<Customer[]> => getData(KEYS.customers, MOCK_CUSTOMERS, instanceId);
export const addCustomerToDB = async (customer: Customer) => saveData(KEYS.customers, customer);
export const updateCustomerInDB = async (customer: Customer) => saveData(KEYS.customers, customer, true);

export const fetchFirms = async (instanceId?: string): Promise<Firm[]> => getData(KEYS.firms, [], instanceId);
export const addFirmToDB = async (firm: Firm) => saveData(KEYS.firms, firm);
export const updateFirmInDB = async (firm: Firm) => saveData(KEYS.firms, firm, true);

export const fetchInventory = async (instanceId?: string): Promise<InventoryItem[]> => getData(KEYS.inventory, MOCK_INVENTORY, instanceId);
export const addInventoryItemToDB = async (item: InventoryItem) => saveData(KEYS.inventory, item);
export const updateInventoryItemInDB = async (item: InventoryItem) => saveData(KEYS.inventory, item, true);

export const fetchInventoryLogs = async (instanceId?: string): Promise<InventoryLog[]> => getData(KEYS.inventory_logs, [], instanceId);
export const addInventoryLogToDB = async (log: InventoryLog) => saveData(KEYS.inventory_logs, log);

export const fetchLinks = async (instanceId?: string) => getData(KEYS.links, [], instanceId);
export const addLinkToDB = async (link: any) => saveData(KEYS.links, link);
export const updateLinkInDB = async (link: any) => saveData(KEYS.links, link, true);
export const deleteLinkFromDB = async (id: string) => removeData(KEYS.links, id);

export const fetchGroups = async (instanceId?: string) => getData(KEYS.groups, [], instanceId);
export const addGroupToDB = async (group: any) => saveData(KEYS.groups, group);
export const updateGroupInDB = async (group: any) => saveData(KEYS.groups, group, true);
export const deleteGroupFromDB = async (id: string) => removeData(KEYS.groups, id);

export const fetchGRInventory = async (instanceId?: string): Promise<GRInventoryItem[]> => getData(KEYS.gr_inventory, [], instanceId);
export const updateGRInventoryItemInDB = async (item: GRInventoryItem) => saveData(KEYS.gr_inventory, item, true);