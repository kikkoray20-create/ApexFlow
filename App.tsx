
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import Filters from './components/Filters';
import OrderTable from './components/OrderTable';
import OrderDetail from './components/OrderDetail';
import FinancialInvoice from './components/FinancialInvoice';
import Inventory from './components/Inventory';
import UserManagement from './components/UserManagement';
import MasterControl from './components/MasterControl';
import Customers from './components/Customers';
import CustomerFirms from './components/CustomerFirms';
import CustomerGR from './components/CustomerGR';
import LinksManager from './components/LinksManager';
import BroadcastGroups from './components/BroadcastGroups';
import ShopModelList from './components/ShopModelList';
import ModelHistoryDetail from './components/ModelHistoryDetail';
import OrderReports from './components/OrderReports';
import CustomerOrderReports from './components/CustomerOrderReports';
import CreateOrder from './components/CreateOrder';
import Login from './components/Login';
import { RefreshCw } from 'lucide-react';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Order, User, OrderStatus, InventoryItem, Customer, OrderItem, InventoryLog } from './types';
import { 
    fetchOrders, 
    updateOrderInDB, 
    addOrderToDB, 
    fetchCustomers, 
    updateCustomerInDB,
    fetchInventory,
    updateInventoryItemInDB,
    addInventoryLogToDB,
    fetchLinks,
    updateLinkInDB,
    fetchUsers
} from './services/db';

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState('orders'); 
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedModel, setSelectedModel] = useState<any | null>(null);
  const [orderingCustomer, setOrderingCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [dateFilter, setDateFilter] = useState('LAST 3 DAY');
  const [statusFilter, setStatusFilter] = useState('ALL STATUS');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    console.log("ApexFlow Core v2.5.8 initialized.");
    const storedUser = localStorage.getItem('apexflow_auth_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('apexflow_auth_user');
      }
    }
    setIsAuthChecking(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
        loadOrders();
        loadUsers();
    }
  }, [currentUser]);

  const loadOrders = async () => {
    const data = await fetchOrders(currentUser?.instanceId);
    setOrders(data);
  };

  const loadUsers = async () => {
    const data = await fetchUsers(currentUser?.instanceId);
    setUsers(data);
  };

  const handleRefreshDashboard = async () => {
    setIsDashboardRefreshing(true);
    setSearchTerm('');
    setDateFilter('LAST 3 DAY');
    setStatusFilter('ALL STATUS');
    setModeFilter('ALL');
    setWarehouseFilter('ALL');
    await Promise.all([loadOrders(), loadUsers()]);
    setTimeout(() => setIsDashboardRefreshing(false), 600);
  };

  const handleViewChange = (viewId: string) => {
    setSelectedOrder(null);
    setSelectedModel(null);
    setOrderingCustomer(null);
    setCurrentView(viewId);
    if (viewId === 'orders') loadUsers();
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'GR') {
        handleViewChange('customer_gr');
    } else {
        handleViewChange('orders');
    }
    localStorage.setItem('apexflow_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('apexflow_auth_user');
    showNotification('Logged out successfully', 'info');
  };

  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => {
      if (!showAllTransactions) {
          if (o.status === 'Payment' || o.status === 'Return') return false;
      }

      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
      if (!matchesSearch) return false;

      if (statusFilter === 'ALL STATUS') {
        if (o.status === 'rejected') return false;
      } else if (statusFilter === 'REJECTED') {
        if (o.status !== 'rejected') return false;
      } else if (statusFilter === 'PENDING') {
        if (o.invoiceStatus !== 'Pending') return false;
      } else {
        if (o.status.toUpperCase() !== statusFilter) return false;
      }

      if (modeFilter !== 'ALL') {
        if (o.orderMode.toUpperCase() !== modeFilter) return false;
      }

      if (warehouseFilter !== 'ALL') {
        if (o.warehouse !== warehouseFilter) return false;
      }

      try {
        const [dateStr] = o.orderTime.split(' ');
        const [d, m, y] = dateStr.split('/').map(Number);
        const orderDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'TODAY') {
          if (orderDate.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'LAST 3 DAY') {
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          if (orderDate < threeDaysAgo) return false;
        } else if (dateFilter === 'LAST 7 DAY') {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'CURRENT MONTH') {
          if (orderDate.getMonth() !== today.getMonth() || orderDate.getFullYear() !== today.getFullYear()) return false;
        } else if (dateFilter === 'LAST MONTH') {
          const lastMonth = new Date(today);
          lastMonth.setMonth(today.getMonth() - 1);
          if (orderDate.getMonth() !== lastMonth.getMonth() || orderDate.getFullYear() !== lastMonth.getFullYear()) return false;
        }
      } catch (e) {
        return true; 
      }

      return true;
    });

    if (currentUser) {
        if (currentUser.role === 'Picker') {
            return result.filter(o => o.assignedToId === currentUser.id && o.status === 'assigned');
        }
        if (currentUser.role === 'Checker') {
            return result.filter(o => o.status === 'packed');
        }
        if (currentUser.role === 'Dispatcher') {
            return result.filter(o => o.status === 'checked');
        }
    }

    return result;
  }, [orders, searchTerm, dateFilter, statusFilter, modeFilter, warehouseFilter, showAllTransactions, currentUser]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus, assignedToId?: string, assignedToName?: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if(!orderToUpdate) return;

    const previousStatus = orderToUpdate.status;
    
    // --- REJECTION REFUND LOGIC ---
    if (newStatus === 'rejected' && (previousStatus === 'checked' || previousStatus === 'dispatched')) {
        try {
            const calculatedTotal = orderToUpdate.totalAmount || 0;
            if (calculatedTotal > 0) {
                const customers = await fetchCustomers(currentUser?.instanceId);
                const customer = customers.find(c => c.name === orderToUpdate.customerName);
                if (customer) {
                    const updatedCustomer = { ...customer, balance: customer.balance + calculatedTotal };
                    await updateCustomerInDB(updatedCustomer);
                    showNotification(`Order Rejected: ₹${calculatedTotal} credited back to client`, 'success');
                }
            }
        } catch (err) {
            showNotification('Error processing refund', 'error');
        }
    }
    
    if (newStatus === 'checked' && previousStatus !== 'checked') {
      try {
        const storedItems = localStorage.getItem(`apexflow_items_${orderId}`);
        if (storedItems) {
          const items: OrderItem[] = JSON.parse(storedItems);
          const calculatedTotal = items.reduce((sum, i) => sum + ((i.fulfillQty || 0) * (i.finalPrice || 0)), 0);
          
          if (calculatedTotal > 0) {
            const customers = await fetchCustomers(currentUser?.instanceId);
            const customer = customers.find(c => c.name === orderToUpdate.customerName);
            if (customer) {
              const updatedCustomer = { ...customer, balance: customer.balance - calculatedTotal };
              await updateCustomerInDB(updatedCustomer);
              orderToUpdate.totalAmount = calculatedTotal;
              showNotification(`Balance Updated: ₹${calculatedTotal} deducted`, 'info');
            }
          }

          const inventory = await fetchInventory(currentUser?.instanceId);
          for (const orderItem of items) {
              if (orderItem.fulfillQty > 0) {
                  const invItem = inventory.find(i => 
                    i.brand.toUpperCase() === orderItem.brand.toUpperCase() && 
                    i.model.toUpperCase() === orderItem.model.toUpperCase() && 
                    i.quality.toUpperCase() === orderItem.quality.toUpperCase()
                  );

                  if (invItem) {
                      const newQty = invItem.quantity - orderItem.fulfillQty;
                      const updatedInvItem = { ...invItem, quantity: newQty };
                      await updateInventoryItemInDB(updatedInvItem);

                      const log: InventoryLog = {
                          id: `log-sale-${Date.now()}-${orderItem.id}`,
                          instanceId: currentUser?.instanceId, 
                          itemId: invItem.id,
                          modelName: `${invItem.brand} ${invItem.model} ${invItem.quality}`,
                          shopName: orderToUpdate.customerName,
                          status: 'Removed',
                          quantityChange: orderItem.fulfillQty,
                          currentStock: newQty,
                          remarks: `Automatic Deduction: Order Verified #${orderId}`,
                          createdDate: new Date().toLocaleString('en-GB')
                      };
                      await addInventoryLogToDB(log);
                  }
              }
          }
        }
      } catch (err) {
        showNotification('Database sync error', 'error');
      }
    }

    const updated = { 
      ...orderToUpdate, 
      status: newStatus,
      assignedTo: assignedToName || orderToUpdate.assignedTo,
      assignedToId: assignedToId || orderToUpdate.assignedToId
    };
    
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    if (selectedOrder && selectedOrder.id === orderId) setSelectedOrder(updated);
    
    await updateOrderInDB(updated);
  }, [orders, selectedOrder, showNotification, currentUser]);

  const handleCreateOfflineOrder = async (newOrder: Order, items: OrderItem[]) => {
    const orderWithInstance = { ...newOrder, instanceId: currentUser?.instanceId };
    await addOrderToDB(orderWithInstance);
    localStorage.setItem(`apexflow_items_${newOrder.id}`, JSON.stringify(items));
    
    setOrders(prev => [orderWithInstance, ...prev]);
    setOrderingCustomer(null);
    handleViewChange('orders');
  };

  const getPageTitle = (view: string) => {
    if (orderingCustomer) return `CREATE OFFLINE ORDER`;
    if (selectedOrder) {
        if (selectedOrder.status === 'Payment' || selectedOrder.status === 'Return') return `FINANCIAL VOUCHER`;
        return `ORDER #${selectedOrder.id}`;
    }
    if (selectedModel) return `INVENTORY DETAILS`;
    if (view === 'orders') return currentUser?.id === 'root-master' ? 'ROOT CONSOLE' : 'ORDER DASHBOARD';
    if (view === 'clients') return 'CLIENTS';
    if (view === 'reports') return 'ORDER REPORTS';
    if (view === 'master_control') return 'ROOT CONSOLE';
    return view.replace('_', ' ').toUpperCase();
  };

  const renderView = () => {
    if (orderingCustomer) return <CreateOrder customer={orderingCustomer} onBack={() => setOrderingCustomer(null)} onSubmitOrder={handleCreateOfflineOrder} />;
    
    if (selectedOrder) {
        if (selectedOrder.status === 'Payment' || selectedOrder.status === 'Return') {
            return <FinancialInvoice order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
        }
        return <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} currentUser={currentUser!} allUsers={users} onUpdateStatus={handleUpdateOrderStatus} />;
    }

    if (selectedModel) return <ModelHistoryDetail model={selectedModel} onBack={() => setSelectedModel(null)} />;

    switch (currentView) {
      case 'inventory': return <Inventory />;
      case 'models': return <ShopModelList onViewModel={(item) => setSelectedModel(item)} />;
      case 'clients': return <Customers onCreateOrder={(c) => setOrderingCustomer(c)} />;
      case 'customer_firms': return <CustomerFirms />;
      case 'customer_gr': return <CustomerGR userRole={currentUser?.role} />;
      case 'users': return <UserManagement currentUser={currentUser!} />;
      case 'master_control': return <MasterControl />;
      case 'links': return <LinksManager currentUser={currentUser!} />;
      case 'broadcast': return <BroadcastGroups />;
      case 'reports': 
      case 'order_reports': return <OrderReports />;
      case 'customer_order_report': return <CustomerOrderReports />;
      default:
        if (currentUser?.id === 'root-master') return <MasterControl />;
        const isStaff = currentUser && ['Picker', 'Checker', 'Dispatcher'].includes(currentUser.role);
        return (
          <>
            <StatsCards orders={orders} activeFilter={statusFilter} onStatusClick={setStatusFilter} />
            {!isStaff && (
              <Filters 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                dateFilter={dateFilter} setDateFilter={setDateFilter}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                modeFilter={modeFilter} setModeFilter={setModeFilter}
                warehouseFilter={warehouseFilter} setWarehouseFilter={setWarehouseFilter}
                onRefresh={handleRefreshDashboard} isRefreshing={isDashboardRefreshing}
              />
            )}
            {isStaff && (
              <div className="flex justify-end mb-6">
                <button onClick={handleRefreshDashboard} disabled={isDashboardRefreshing} className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50">
                  <RefreshCw size={16} strokeWidth={4} className={isDashboardRefreshing ? 'animate-spin' : ''} />
                  {isDashboardRefreshing ? 'Refreshing...' : 'Refresh Pipeline'}
                </button>
              </div>
            )}
            <OrderTable orders={filteredOrders} onViewOrder={setSelectedOrder} userRole={currentUser?.role} />
          </>
        );
    }
  };

  if (isAuthChecking) return null;
  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleViewChange} 
        userRole={currentUser.role}
        userId={currentUser.id}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      
      <div className="flex-1 transition-all duration-300 min-w-0">
        <main className="px-4 md:px-10 pb-10 max-w-[1600px] mx-auto min-h-screen">
          <Header 
            currentUser={currentUser} 
            title={currentView === 'clients' ? 'clients' : currentView} 
            onMenuClick={() => setMobileSidebarOpen(true)}
            showAllTransactions={showAllTransactions}
            onToggleAllTransactions={() => setShowAllTransactions(!showAllTransactions)}
            onLogout={handleLogout}
          />
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{getPageTitle(currentView)}</h1>
          </div>
          <div className="pt-0 md:pt-2">{renderView()}</div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider><AppContent /></NotificationProvider>
);

export default App;
