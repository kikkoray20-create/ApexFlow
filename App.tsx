import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import StatsCards from './components/StatsCards.tsx';
import Filters from './components/Filters.tsx';
import OrderTable from './components/OrderTable.tsx';
import OrderDetail from './components/OrderDetail.tsx';
import FinancialInvoice from './components/FinancialInvoice.tsx';
import Inventory from './components/Inventory.tsx';
import UserManagement from './components/UserManagement.tsx';
import MasterControl from './components/MasterControl.tsx';
import Customers from './components/Customers.tsx';
import CustomerFirms from './components/CustomerFirms.tsx';
import CustomerGR from './components/CustomerGR.tsx';
import LinksManager from './components/LinksManager.tsx';
import BroadcastGroups from './components/BroadcastGroups.tsx';
import ShopModelList from './components/ShopModelList.tsx';
import ModelHistoryDetail from './components/ModelHistoryDetail.tsx';
import OrderReports from './components/OrderReports.tsx';
import CustomerOrderReports from './components/CustomerOrderReports.tsx';
import CreateOrder from './components/CreateOrder.tsx';
import Login from './components/Login.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import { NotificationProvider, useNotification } from './context/NotificationContext.tsx';
import { fetchOrders, updateOrderInDB, fetchUsers } from './services/db.ts';

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState('orders'); 
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [orderingCustomer, setOrderingCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();
  
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL STATUS');
  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('apexflow_auth_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
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
    setOrders(data || []);
  };

  const loadUsers = async () => {
    const data = await fetchUsers(currentUser?.instanceId);
    setUsers(data || []);
  };

  const handleRefreshDashboard = async () => {
    setIsDashboardRefreshing(true);
    await Promise.all([loadOrders(), loadUsers()]);
    setTimeout(() => setIsDashboardRefreshing(false), 600);
  };

  const handleViewChange = (viewId: string) => {
    setSelectedOrder(null);
    setSelectedModel(null);
    setOrderingCustomer(null);
    setCurrentView(viewId);
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    handleViewChange(user.role === 'GR' ? 'customer_gr' : 'orders');
    localStorage.setItem('apexflow_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('apexflow_auth_user');
    showNotification('Logged out successfully', 'info');
  };

  const filteredOrders = useMemo(() => {
    let result = (orders || []).filter(o => {
      if (!showAllTransactions && (o.status === 'Payment' || o.status === 'Return')) return false;
      const term = searchTerm.toLowerCase();
      return (o.customerName || '').toLowerCase().includes(term) || (o.id || '').toLowerCase().includes(term);
    });

    if (currentUser) {
        if (currentUser.role === 'Picker') return result.filter(o => o.assignedToId === currentUser.id && o.status === 'assigned');
        if (currentUser.role === 'Checker') return result.filter(o => o.status === 'packed');
        if (currentUser.role === 'Dispatcher') return result.filter(o => o.status === 'checked');
    }
    return result;
  }, [orders, searchTerm, showAllTransactions, currentUser]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, newStatus: string, assignedToId?: string, assignedToName?: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if(!orderToUpdate) return;
    const updated = { ...orderToUpdate, status: newStatus, assignedTo: assignedToName || orderToUpdate.assignedTo, assignedToId: assignedToId || orderToUpdate.assignedToId };
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    await updateOrderInDB(updated);
  }, [orders, selectedOrder]);

  const renderView = () => {
    if (orderingCustomer) return <CreateOrder customer={orderingCustomer} onBack={() => setOrderingCustomer(null)} onSubmitOrder={loadOrders as any} />;
    if (selectedOrder) {
        if (selectedOrder.status === 'Payment' || selectedOrder.status === 'Return') return <FinancialInvoice order={selectedOrder} onClose={() => setSelectedOrder(null)} />;
        return <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} currentUser={currentUser!} allUsers={users} onUpdateStatus={handleUpdateOrderStatus as any} />;
    }
    if (selectedModel) return <ModelHistoryDetail model={selectedModel} onBack={() => setSelectedModel(null)} />;

    switch (currentView) {
      case 'inventory': return <Inventory />;
      case 'models': return <ShopModelList onViewModel={(item) => setSelectedModel(item)} />;
      case 'clients': return <Customers onCreateOrder={(c) => setOrderingCustomer(c)} />;
      case 'customer_gr': return <CustomerGR userRole={currentUser?.role} />;
      case 'users': return <UserManagement currentUser={currentUser!} />;
      case 'master_control': return <MasterControl />;
      case 'links': return <LinksManager currentUser={currentUser!} />;
      case 'broadcast': return <BroadcastGroups />;
      case 'order_reports': return <OrderReports />;
      case 'customer_order_report': return <CustomerOrderReports />;
      default:
        return (
          <>
            <StatsCards orders={orders} activeFilter={statusFilter} onStatusClick={setStatusFilter} />
            <Filters searchTerm={searchTerm} setSearchTerm={setSearchTerm} dateFilter="ALL" setDateFilter={()=>{}} statusFilter={statusFilter} setStatusFilter={setStatusFilter} modeFilter="ALL" setModeFilter={()=>{}} warehouseFilter="ALL" setWarehouseFilter={()=>{}} onRefresh={handleRefreshDashboard} isRefreshing={isDashboardRefreshing} />
            <OrderTable orders={filteredOrders} onViewOrder={setSelectedOrder} userRole={currentUser?.role} />
          </>
        );
    }
  };

  if (isAuthChecking) return null;
  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar currentView={currentView} onChangeView={handleViewChange} userRole={currentUser.role} userId={currentUser.id} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} isMobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 transition-all duration-300 min-w-0">
        <main className="px-4 md:px-10 pb-10 max-w-[1600px] mx-auto min-h-screen relative">
          <Header currentUser={currentUser} title={currentView} onMenuClick={() => setMobileSidebarOpen(true)} showAllTransactions={showAllTransactions} onToggleAllTransactions={() => setShowAllTransactions(!showAllTransactions)} onLogout={handleLogout} />
          <div className="animate-fade-in">{renderView()}</div>
          <AIAssistant />
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider><AppContent /></NotificationProvider>
);

export default App;