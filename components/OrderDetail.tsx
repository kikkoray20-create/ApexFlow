import React, { useState, useMemo, useEffect } from 'react';
import { 
    ArrowLeft, 
    RefreshCw, 
    Search, 
    Truck, 
    User, 
    Plus,
    X,
    RotateCcw,
    ArrowUp,
    ArrowDown,
    Pencil,
    CheckCircle2,
    UserCheck,
    ChevronRight,
    Check,
    Eye,
    Send,
    PlusCircle,
    Loader2,
    Printer,
    FileDown,
    Share2,
    Smartphone,
    ChevronUp,
    Ban,
    AlertTriangle,
    Package,
    ArrowRightCircle,
    Info,
    Lock,
    Square,
    CheckSquare,
    Users
} from 'lucide-react';
import { Order, OrderItem, User as UserType, OrderStatus, InventoryItem } from '../types';
import { useNotification } from '../context/NotificationContext';
import { updateOrderInDB, fetchInventory } from '../services/db';

interface OrderDetailProps {
  order: Order;
  onBack: () => void;
  currentUser: UserType;
  allUsers: UserType[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, assignedToId?: string, assignedToName?: string) => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, onBack, currentUser, allUsers, onUpdateStatus }) => {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkLessValue, setBulkLessValue] = useState<string>('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddModelsModalOpen, setIsAddModelsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [isFulfillWarningOpen, setIsFulfillWarningOpen] = useState(false);
  
  // Local verification state for staff
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Role Check Logic - Picker, Dispatcher, Checker are "Staff"
  const isStaff = currentUser && ['Picker', 'Checker', 'Dispatcher'].includes(currentUser.role);

  // Structural Lock: Disable Assign, Add, and Fulfill All after check
  const isStructuralLocked = order.status === 'checked' || order.status === 'dispatched';

  // Cargo Editing State
  const [isEditingCargo, setIsEditingCargo] = useState(false);
  const [cargoDraft, setCargoDraft] = useState(order.cargoName || '');

  // Inventory for "Add Models"
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [addModelsSearch, setAddModelsSearch] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof OrderItem; direction: 'asc' | 'desc' } | null>(null);

  const [items, setItems] = useState<OrderItem[]>(() => {
    const stored = localStorage.getItem(`apexflow_items_${order.id}`);
    if (stored) return JSON.parse(stored);
    return [];
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setSortConfig(null);
    setSearchTerm('');
    setBulkLessValue('');
    setTimeout(() => {
        setIsRefreshing(false);
        showNotification('Order view refreshed');
    }, 800);
  };

  const handleSaveCargo = async () => {
    try {
      const updatedOrder = { ...order, cargoName: cargoDraft };
      await updateOrderInDB(updatedOrder);
      order.cargoName = cargoDraft; 
      setIsEditingCargo(false);
      showNotification('Cargo name updated');
    } catch (err) {
      showNotification('Failed to update cargo', 'error');
    }
  };

  const handleStatusProgress = () => {
    const statusMap: Record<OrderStatus, OrderStatus> = {
        'fresh': 'assigned',
        'assigned': 'packed',
        'packed': 'checked',
        'checked': 'dispatched',
        'dispatched': 'dispatched',
        'pending': 'assigned',
        'cancelled': 'fresh',
        'rejected': 'fresh',
        'Payment': 'Payment',
        'Return': 'Return'
    };

    const nextStatus = statusMap[order.status] || order.status;
    onUpdateStatus(order.id, nextStatus);
    showNotification(`Order moved to ${nextStatus.toUpperCase()}`);
    
    if (isStaff) {
        setTimeout(onBack, 500);
    }
  };

  const toggleItemCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAssignPicker = (picker: UserType) => {
    if (isStructuralLocked || isStaff) return;
    const targetStatus = (order.status === 'fresh' || order.status === 'rejected') ? 'assigned' : order.status;
    onUpdateStatus(order.id, targetStatus, picker.id, picker.name);
    setIsAssignModalOpen(false);
    showNotification(`Order assigned to ${picker.name}${order.status === 'rejected' ? ' (Re-activated)' : ''}`);
  };

  const handleRejectOrder = async () => {
    if (isStaff) return;
    setIsRejectConfirmOpen(false);
    onUpdateStatus(order.id, 'rejected');
    showNotification('Order Rejected Successfully', 'error');
    setTimeout(() => {
        onBack();
    }, 400);
  };

  const hasManualChanges = useMemo(() => {
      return items.some(i => (i.fulfillQty > 0 && i.fulfillQty !== i.orderQty) || i.finalPrice !== i.displayPrice);
  }, [items]);

  const handleFulfillAllClick = () => {
      if (isStructuralLocked || isStaff) return;
      if (hasManualChanges) {
          setIsFulfillWarningOpen(true);
      } else {
          executeFulfillAll();
      }
  };

  const executeFulfillAll = () => {
      if (isStructuralLocked || isStaff) return;
      const updated = items.map(i => ({ ...i, fulfillQty: i.orderQty, finalPrice: i.displayPrice }));
      setItems(updated);
      localStorage.setItem(`apexflow_items_${order.id}`, JSON.stringify(updated));
      setIsFulfillWarningOpen(false);
      showNotification('All items fulfilled (Price reset to Display Price)');
  };

  const handleApplyBulkLess = () => {
      if (isStaff) return;
      const rawInput = parseFloat(bulkLessValue);
      if (isNaN(rawInput) || rawInput < 0) {
          showNotification('Enter a valid amount', 'info');
          return;
      }
      const reduction = rawInput / 10;
      const updated = items.map(i => ({ 
          ...i, 
          finalPrice: Math.max(0, i.displayPrice - reduction) 
      }));
      setItems(updated);
      localStorage.setItem(`apexflow_items_${order.id}`, JSON.stringify(updated));
      setBulkLessValue('');
      showNotification(`Applied ₹${reduction.toFixed(1)} reduction to items`);
  };

  const handleSort = (key: keyof OrderItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
      const updated = items.map(i => i.id === id ? { ...i, [field]: value } : i);
      setItems(updated);
      localStorage.setItem(`apexflow_items_${order.id}`, JSON.stringify(updated));
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => 
        item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.quality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
        result = [...result].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [items, searchTerm, sortConfig]);

  const totalFulfilledQty = useMemo(() => items.reduce((s, i) => s + (i.fulfillQty || 0), 0), [items]);
  const totalInvoiceAmount = useMemo(() => items.reduce((s, i) => s + ((i.fulfillQty || 0) * (i.finalPrice || 0)), 0), [items]);

  const HeaderSortIcon = ({ columnKey }: { columnKey: keyof OrderItem }) => {
    const isActive = sortConfig?.key === columnKey;
    return (
        <div className={`flex flex-col gap-0.5 ml-1.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-50'}`}>
            <ArrowUp size={8} strokeWidth={isActive && sortConfig.direction === 'asc' ? 5 : 3} className={isActive && sortConfig.direction === 'asc' ? 'text-indigo-600' : ''} />
            <ArrowDown size={8} strokeWidth={isActive && sortConfig.direction === 'desc' ? 5 : 3} className={isActive && sortConfig.direction === 'desc' ? 'text-indigo-600' : ''} />
        </div>
    );
  };

  const pickers = useMemo(() => allUsers.filter(u => u.role === 'Picker' && u.active), [allUsers]);

  const handleViewInvoice = () => {
    if (isStaff) return;
    setIsInvoiceModalOpen(true);
  };

  const handleSendInvoice = () => {
    if (totalFulfilledQty === 0 || isStaff) return;
    const summary = `*INVOICE SUMMARY - #${order.id}*\n*Customer:* ${order.customerName}\n*Qty:* ${totalFulfilledQty}\n*Amount:* ₹${totalInvoiceAmount.toFixed(1)}`;
    navigator.clipboard.writeText(summary);
    showNotification(`Invoice summary copied`, 'success');
  };

  const handleAddModels = async () => {
    if (isStructuralLocked || isStaff) return;
    setIsAddModelsModalOpen(true);
    setLoadingInventory(true);
    try {
        const inv = await fetchInventory();
        setInventory(inv);
    } catch (e) {
        showNotification('Sync failed', 'error');
    } finally {
        setLoadingInventory(false);
    }
  };

  const handleAddItemToOrder = (invItem: InventoryItem) => {
    if (isStructuralLocked || isStaff) return;
    const isDuplicate = items.some(i => i.brand === invItem.brand && i.model === invItem.model && i.quality === invItem.quality);
    if (isDuplicate) {
        showNotification('Already in order', 'info');
        return;
    }

    const newItem: OrderItem = {
        id: `added-${Date.now()}`,
        brand: invItem.brand,
        quality: invItem.quality,
        category: invItem.category || 'APEXFLOW',
        model: invItem.model,
        orderQty: 1,
        displayPrice: invItem.price,
        fulfillQty: 0,
        finalPrice: invItem.price
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    localStorage.setItem(`apexflow_items_${order.id}`, JSON.stringify(updatedItems));
    showNotification(`${invItem.model} added`);
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => 
        i.status !== 'Inactive' && (
        i.model.toLowerCase().includes(addModelsSearch.toLowerCase()) ||
        i.brand.toLowerCase().includes(addModelsSearch.toLowerCase())
        )
    );
  }, [inventory, addModelsSearch]);

  const handlePrint = () => {
      window.print();
  };

  const handleDownloadInvoice = () => {
      showNotification('Opening Print Dialog for PDF Save...', 'info');
      window.print();
  };

  const getStaffActionText = () => {
      if (currentUser.role === 'Picker') return 'MARK AS PICKED';
      if (currentUser.role === 'Checker') return 'MARK AS CHECKED';
      if (currentUser.role === 'Dispatcher') return 'MARK AS DISPATCHED';
      return 'COMPLETE TASK';
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between no-print gap-4">
        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={onBack} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-all active:scale-95 shrink-0">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-tight">Order Details <span className="text-[#4f46e5]">#{order.id}</span></h2>
                {(isStructuralLocked || isStaff) && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200">
                        <Lock size={10} /> {isStaff ? 'SECURE' : 'LOCKED'}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {!isStaff && (
                <button 
                  onClick={handleStatusProgress}
                  title={order.status === 'fresh' ? 'Assign order first to progress' : 'Click to progress status'}
                  disabled={order.status === 'fresh' || order.status === 'rejected' || order.status === 'dispatched'}
                  className={`flex items-center gap-1.5 px-2 py-0.5 text-[8px] md:text-[9px] font-bold uppercase rounded border tracking-widest transition-all active:scale-90 hover:brightness-95 shadow-sm group ${
                    (order.status === 'rejected' || order.status === 'fresh') ? 'bg-rose-50 text-rose-600 border-rose-100 cursor-not-allowed' : 'bg-[#f5f3ff] text-[#4f46e5] border-[#e9e4ff] hover:border-indigo-300'
                  }`}
                >
                  {order.status === 'rejected' ? 'REJECT' : order.status.toUpperCase()}
                  {order.status !== 'rejected' && order.status !== 'dispatched' && order.status !== 'fresh' && <ArrowRightCircle size={10} className="group-hover:translate-x-0.5 transition-transform" />}
                </button>
              )}
              <span className="text-[8px] md:text-[10px] font-medium text-slate-400 uppercase tracking-tight">{order.orderTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.status !== 'rejected' && !isStaff && (
            <button 
              onClick={() => setIsRejectConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 md:px-5 py-2 md:py-2.5 bg-rose-50 border border-rose-200 text-rose-500 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm hover:bg-rose-100"
            >
              <Ban size={14} className="shrink-0" />
              <span>REJECT</span>
            </button>
          )}
          
          <button 
            onClick={handleRefresh}
            className="p-2 md:p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#4f46e5] shadow-sm transition-all active:rotate-180 duration-500"
          >
            <RefreshCw size={16} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Unified Info Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 md:px-6 py-4 md:py-5 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 no-print">
        <div className="flex flex-col sm:flex-row gap-6 md:gap-12 items-center w-full lg:w-auto">
            {/* Customer Info */}
            <div className="flex items-center gap-4 w-full sm:w-auto min-w-[200px]">
                <div className="w-10 h-10 bg-indigo-50 text-[#4f46e5] rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CUSTOMER</p>
                    <p className="text-[13px] font-bold text-slate-800 uppercase truncate leading-tight">
                        {order.customerName}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-none">
                        {!isStaff ? '9865323265' : '•••• ••••'}
                    </p>
                </div>
            </div>

            {/* Cargo Info */}
            <div className="flex items-center gap-4 w-full sm:w-auto min-w-[240px]">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <Truck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CARGO NAME</p>
                    <div className="flex items-center gap-3">
                        {isEditingCargo && !isStaff ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={cargoDraft}
                              onChange={(e) => setCargoDraft(e.target.value)}
                              className="w-24 px-2 py-0.5 border border-emerald-400 rounded text-xs font-semibold outline-none"
                              autoFocus
                            />
                            <button onClick={handleSaveCargo} className="text-emerald-600 hover:text-emerald-700">
                              <Check size={14} strokeWidth={3} />
                            </button>
                            <button onClick={() => setIsEditingCargo(false)} className="text-rose-400 hover:text-rose-500">
                              <X size={14} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">{order.cargoName || '1'}</p>
                        )}
                        {!isStaff && !isEditingCargo && (
                            <button onClick={() => setIsEditingCargo(true)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                <Pencil size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto justify-center lg:justify-end">
            {!isStaff ? (
                <>
                    <button 
                        onClick={handleAddModels}
                        disabled={isStructuralLocked}
                        className={`flex items-center gap-1.5 px-4 md:px-5 py-2.5 md:py-3.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.1em] transition-all active:scale-95 ${isStructuralLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <PlusCircle size={16} /> Add
                    </button>
                    <button 
                        onClick={handleViewInvoice}
                        className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 md:py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.1em] transition-all active:scale-95"
                    >
                        <Eye size={16} /> Invoice
                    </button>
                    <button 
                        disabled={totalFulfilledQty === 0}
                        onClick={handleSendInvoice}
                        className={`flex items-center gap-1.5 px-4 md:px-5 py-2.5 md:py-3.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.1em] transition-all active:scale-95 ${totalFulfilledQty === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <Send size={16} /> Share
                    </button>

                    <button 
                        disabled={totalFulfilledQty === 0 || isStructuralLocked}
                        onClick={() => setIsAssignModalOpen(true)}
                        className={`flex items-center gap-1.5 px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-bold text-[10px] md:text-[11px] uppercase tracking-[0.1em] transition-all active:scale-95 shadow-sm border ${
                        (totalFulfilledQty === 0 || isStructuralLocked) ? 'opacity-50 cursor-not-allowed grayscale' : ''
                        } ${
                        order.assignedTo 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                        : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                        }`}
                    >
                        <UserCheck size={16} /> 
                        {order.assignedTo ? order.assignedTo.toUpperCase() : 'ASSIGN'}
                    </button>
                </>
            ) : (
                <button 
                    onClick={handleStatusProgress}
                    disabled={totalFulfilledQty === 0}
                    className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                >
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                    {getStaffActionText()}
                </button>
            )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col no-print">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-xl">
            <input 
              type="text" 
              placeholder="Filter items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-white border-2 border-[#3b82f6] rounded-xl text-[11px] font-semibold outline-none shadow-sm transition-all placeholder-slate-300 focus:ring-4 focus:ring-blue-100"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          
          {!isStaff && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 transition-colors w-full sm:w-auto justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <RotateCcw size={12} /> Bulk Less
                </span>
                <input 
                    type="number" 
                    value={bulkLessValue}
                    onChange={(e) => setBulkLessValue(e.target.value)}
                    placeholder="0"
                    className="w-16 h-8 bg-white border border-slate-200 rounded-lg text-center text-[10px] font-bold outline-none focus:border-indigo-500"
                />
                <button 
                    onClick={handleApplyBulkLess}
                    className="bg-[#ef4444] text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                    APPLY
                </button>
                </div>
                <button 
                    onClick={handleFulfillAllClick}
                    disabled={isStructuralLocked}
                    className={`w-full sm:w-auto px-8 py-2.5 bg-[#f1f5f9] border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-slate-200 shadow-sm transition-all active:scale-95 ${isStructuralLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                FULFILL ALL
                </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-5 cursor-pointer select-none group" onClick={() => handleSort('brand')}>
                    <div className="flex items-center">Brand <HeaderSortIcon columnKey="brand" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer select-none group" onClick={() => handleSort('quality')}>
                    <div className="flex items-center">Quality <HeaderSortIcon columnKey="quality" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer select-none group" onClick={() => handleSort('category')}>
                    <div className="flex items-center">Category <HeaderSortIcon columnKey="category" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer select-none group" onClick={() => handleSort('model')}>
                    <div className="flex items-center">Model <HeaderSortIcon columnKey="model" /></div>
                </th>
                {!isStaff && (
                    <>
                        <th className="px-6 py-5 text-center cursor-pointer select-none group" onClick={() => handleSort('orderQty')}>
                            <div className="flex items-center justify-center">Order Qty <HeaderSortIcon columnKey="orderQty" /></div>
                        </th>
                        <th className="px-6 py-5 text-center cursor-pointer select-none group" onClick={() => handleSort('displayPrice')}>
                            <div className="flex items-center justify-center">Display Price <HeaderSortIcon columnKey="displayPrice" /></div>
                        </th>
                    </>
                )}
                <th className="px-6 py-5 text-center cursor-pointer select-none group" onClick={() => handleSort('fulfillQty')}>
                    <div className="flex items-center justify-center">Fulfill Qty <HeaderSortIcon columnKey="fulfillQty" /></div>
                </th>
                <th className="px-6 py-5 text-center cursor-pointer select-none group">
                    <div className="flex items-center justify-center">
                        {!isStaff ? (
                            <>Final Price <HeaderSortIcon columnKey="finalPrice" /></>
                        ) : (
                            "Verify"
                        )}
                    </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                    <td colSpan={isStaff ? 6 : 8} className="py-20 text-center opacity-30">
                        <Package size={40} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No matching items found</p>
                    </td>
                </tr>
              ) : filteredAndSortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-wider">{item.brand}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-[#10b981] uppercase tracking-wider">{item.quality}</span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-[#a855f7] uppercase tracking-wider">{item.category}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[11px] font-bold text-[#f97316] uppercase tracking-tight leading-tight max-w-[280px]">{item.model}</p>
                  </td>
                  {!isStaff && (
                      <>
                        <td className="px-6 py-5 text-center whitespace-nowrap">
                            <span className="text-[12px] font-bold text-slate-800">{item.orderQty}</span>
                        </td>
                        <td className="px-6 py-5 text-center whitespace-nowrap">
                            <span className="text-[12px] font-bold text-slate-800">₹{item.displayPrice.toFixed(1)}</span>
                        </td>
                      </>
                  )}
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <input 
                        type="number" 
                        readOnly={isStaff}
                        value={item.fulfillQty === 0 ? '' : item.fulfillQty} 
                        onChange={(e) => !isStaff && updateItem(item.id, 'fulfillQty', parseInt(e.target.value) || 0)}
                        className={`w-16 h-10 border rounded-lg text-center text-[12px] font-bold outline-none transition-all ${isStaff ? 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-50'}`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center">
                      {!isStaff ? (
                        <input 
                            type="number" 
                            step="0.1"
                            value={item.finalPrice.toFixed(1)} 
                            onChange={(e) => updateItem(item.id, 'finalPrice', parseFloat(e.target.value) || 0)}
                            className="w-20 h-10 border border-slate-200 bg-white rounded-lg text-center text-[12px] font-bold text-slate-800 outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-50 transition-all"
                        />
                      ) : (
                          <button 
                            onClick={() => toggleItemCheck(item.id)}
                            className={`p-2 rounded-xl transition-all active:scale-90 ${checkedItems[item.id] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300 hover:text-slate-400'}`}
                          >
                            {checkedItems[item.id] ? <CheckSquare size={20} strokeWidth={3} /> : <Square size={20} strokeWidth={3} />}
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-[#f8fafc] border-t border-slate-100 px-6 md:px-10 py-8 md:py-10 flex flex-col items-end">
            <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Items Count</span>
                    <span className="text-slate-700">{filteredAndSortedItems.length} Lines</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Total Quantity</span>
                    <span className="text-slate-700">{totalFulfilledQty} Pcs</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- INVOICE VIEW MODAL --- */}
      {isInvoiceModalOpen && !isStaff && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-2 md:p-4 overflow-y-auto print:p-0 print:static print:bg-white animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none animate-in zoom-in-95">
                <div className="px-4 md:px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 no-print">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Invoice Preview - Order: {order.id}</span>
                    <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 p-2 md:p-6 print:p-0 bg-gray-50 flex justify-center no-scrollbar print:bg-white overflow-y-auto">
                    <div className="bg-white w-full max-w-[600px] min-h-[600px] shadow-sm p-6 md:p-10 border border-slate-200 print:shadow-none print:border-none print:p-10 font-sans text-slate-900 flex flex-col">
                        
                        <div className="text-center mb-6 md:mb-10">
                            <h1 className="text-2xl font-bold tracking-tighter uppercase text-slate-900">ApexFlow Management</h1>
                            <div className="h-0.5 w-24 bg-slate-900 mx-auto mt-1"></div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Authorized Distribution Channel</p>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 md:mb-10 text-[11px] md:text-[12px] gap-6">
                            <div className="space-y-2">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Bill To</p>
                                <div>
                                    <p className="font-bold text-base text-slate-900 uppercase tracking-tight">{order.customerName}</p>
                                    <p className="text-slate-500 font-medium mt-1 uppercase max-w-[200px] leading-tight text-[10px]">{order.customerSubtext}</p>
                                </div>
                            </div>
                            <div className="text-left sm:text-right space-y-2 w-full sm:w-auto">
                                <div className="space-y-1">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Invoice Meta</p>
                                    <p className="font-medium text-slate-600">Date : <span className="text-slate-900">{order.orderTime.split(' ')[0]}</span></p>
                                    <p className="font-medium text-slate-600">No : <span className="text-slate-900">{order.orderTime.split(' ')[0]}/{order.id}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full border-collapse min-w-[450px]">
                                <thead>
                                    <tr className="border-y border-slate-900">
                                        <th className="py-2 px-1 text-left text-[9px] font-bold uppercase tracking-widest text-slate-900">Description</th>
                                        <th className="py-2 px-1 text-center text-[9px] font-bold uppercase tracking-widest text-slate-900 w-12">Qty</th>
                                        <th className="py-2 px-1 text-center text-[9px] font-bold uppercase tracking-widest text-slate-900 w-20">Price</th>
                                        <th className="py-2 px-1 text-right text-[9px] font-bold uppercase tracking-widest text-slate-900 w-24">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.filter(i => i.fulfillQty > 0).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="py-2 px-1 text-[11px] font-bold uppercase text-slate-800 leading-tight">
                                                {item.brand} {item.quality} {item.model}
                                            </td>
                                            <td className="py-2 px-1 text-center text-[12px] font-bold text-slate-900">{item.fulfillQty}</td>
                                            <td className="py-2 px-1 text-center text-[12px] font-medium text-slate-700">₹{item.finalPrice.toFixed(1)}</td>
                                            <td className="py-2 px-1 text-right text-[12px] font-bold text-slate-900">₹{(item.fulfillQty * item.finalPrice).toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-slate-900">
                                        <td className="py-3 px-1 text-[12px] font-bold uppercase tracking-widest text-slate-900">Grand Total</td>
                                        <td className="py-3 px-1 text-center text-[12px] font-bold text-slate-900">{totalFulfilledQty}</td>
                                        <td className="py-3 px-1"></td>
                                        <td className="py-3 px-1 text-right text-[16px] font-bold text-indigo-600 tracking-tighter">₹{totalInvoiceAmount.toFixed(1)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="text-center mt-6 md:mt-10 pt-6 border-t border-slate-100">
                            <h3 className="text-base font-bold tracking-tight text-slate-800 uppercase">Thank You</h3>
                            <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Computer Generated Document.</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 md:px-8 py-4 bg-white border-t border-slate-200 flex flex-wrap justify-center sm:justify-end gap-2 md:gap-3 no-print">
                    <button 
                        onClick={handleDownloadInvoice}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95"
                    >
                        <FileDown size={14} /> PDF
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                    >
                        <Printer size={14} /> Print
                    </button>
                    <button 
                        onClick={() => setIsInvoiceModalOpen(false)}
                        className="w-full sm:w-auto px-6 py-2 bg-white border border-slate-300 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {isRejectConfirmOpen && !isStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[340px] overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="p-6 md:p-8 text-center">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">Confirm REJECT?</h3>
                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
                        This will mark the order as REJECT and remove it from the active pipeline.
                    </p>
                </div>
                <div className="flex border-t border-slate-50">
                    <button 
                        onClick={() => { setIsRejectConfirmOpen(false); }}
                        className="flex-1 py-3.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleRejectOrder}
                        className="flex-1 py-3.5 text-[9px] font-bold uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-inner"
                    >
                        Yes, REJECT
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FULFILL ALL WARNING MODAL */}
      {isFulfillWarningOpen && !isStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[260] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[360px] overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="p-6 md:p-8 text-center">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-3">Reset Changes?</h3>
                    <p className="text-[12px] font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
                        Aapne jo change kiya hai vo fir se order qty aur display price ki tra ho jayega. Kya aap ise karna chahte hain?
                    </p>
                </div>
                <div className="flex border-t border-slate-50">
                    <button 
                        onClick={() => setIsFulfillWarningOpen(false)}
                        className="flex-1 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeFulfillAll}
                        className="flex-1 py-4 text-[9px] font-bold uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-inner"
                    >
                        Yes, RESET
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ADD MODELS MODAL */}
      {isAddModelsModalOpen && !isStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 md:p-4 no-print">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-50 flex justify-between items-center bg-blue-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                            <PlusCircle size={18} />
                        </div>
                        <h3 className="text-sm md:text-base font-bold text-slate-800 uppercase tracking-tight">Add Models</h3>
                    </div>
                    <button onClick={() => setIsAddModelsModalOpen(false)} className="text-slate-300 hover:text-slate-600"><X size={22} /></button>
                </div>
                <div className="p-4 md:p-6 shrink-0"><div className="relative"><input type="text" placeholder="Search..." value={addModelsSearch} onChange={(e) => setAddModelsSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] md:text-[12px] font-bold uppercase outline-none focus:bg-white focus:border-blue-400" /><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /></div></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 bg-slate-50/30">
                    {loadingInventory ? (<Loader2 className="animate-spin mx-auto text-blue-500" size={32} />) : filteredInventory.map(item => (
                        <div key={item.id} className="bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 flex items-center justify-between group">
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className="text-[12px] md:text-[13px] font-bold text-slate-800 uppercase leading-tight truncate">{item.model}</h4>
                                <p className="text-[9px] md:text-[10px] font-medium text-slate-400 uppercase mt-1">{item.brand} | ₹{item.price}</p>
                            </div>
                            <button onClick={() => handleAddItemToOrder(item)} className="px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 shrink-0">Add</button>
                        </div>
                    ))}
                </div>
                <div className="px-6 md:px-8 py-4 md:py-6 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={() => setIsAddModelsModalOpen(false)} className="px-6 md:px-8 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Close</button></div>
            </div>
        </div>
      )}

      {/* ASSIGN PICKER MODAL */}
      {isAssignModalOpen && !isStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight">Select Personnel</h3>
                    <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-all hover:rotate-90"><X size={22} /></button>
                </div>
                <div className="p-4 md:p-8 space-y-3 min-h-[200px] flex flex-col">
                    {pickers.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-40 grayscale">
                            <Users size={48} className="mb-4" />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed">No active pickers detected in Team Registry</p>
                        </div>
                    ) : (
                        pickers.map(picker => (
                            <button key={picker.id} onClick={() => handleAssignPicker(picker)} className="w-full flex items-center justify-between px-6 py-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xs group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {picker.name.charAt(0)}
                                    </div>
                                    <span className="text-[12px] md:text-sm font-black text-slate-800 uppercase tracking-tight">{picker.name}</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))
                    )}
                </div>
                <div className="px-6 md:px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                    <button onClick={() => setIsAssignModalOpen(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 transition-colors">Cancel Protocol</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;