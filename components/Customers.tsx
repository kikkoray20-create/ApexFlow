import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Firm, Order, OrderItem } from '../types';
import { 
  Phone, 
  MapPin, 
  Search, 
  Plus, 
  X, 
  Pencil, 
  Loader2, 
  Store, 
  UserCircle, 
  Eye, 
  EyeOff, 
  Building2, 
  ChevronRight, 
  Building, 
  RotateCcw, 
  Hash, 
  MapPinned, 
  UserCheck, 
  Briefcase, 
  ShoppingCart, 
  Globe, 
  ExternalLink, 
  Mail, 
  MessageSquare, 
  ArrowRight, 
  Info, 
  Users, 
  Printer, 
  FileDown, 
  Calendar, 
  ReceiptText, 
  Download, 
  Share2, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ChevronLeft, 
  User, 
  CreditCard, 
  Lock, 
  Smartphone, 
  Shield, 
  Activity, 
  Filter, 
  ChevronDown, 
  RefreshCw,
  // Added AlertTriangle to fix the "Cannot find name 'AlertTriangle'" error
  AlertTriangle 
} from 'lucide-react';
import { fetchCustomers, addCustomerToDB, updateCustomerInDB, fetchFirms, addOrderToDB, fetchOrders, addFirmToDB } from '../services/db';
import { useNotification } from '../context/NotificationContext';

interface CustomersProps {
  onCreateOrder?: (customer: Customer) => void;
}

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)' },
  { code: '+977', label: '+977 (Nepal)' },
  { code: '+1', label: '+1 (USA)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+61', label: '+61 (AU)' },
  { code: '+81', label: '+81 (JP)' },
];

const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 500, 1000];

const Customers: React.FC<CustomersProps> = ({ onCreateOrder }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const { showNotification } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'Cash', remarks: '' });
  const [viewingTransaction, setViewingTransaction] = useState<Order | null>(null);
  const [previewOrderItems, setPreviewOrderItems] = useState<OrderItem[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [isFirmSearchOpen, setIsFirmSearchOpen] = useState(false);
  const [firmSearchTerm, setFirmSearchTerm] = useState('');

  const isEditMode = isEditModalOpen;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [dbCustomers, dbOrders, dbFirms] = await Promise.all([
      fetchCustomers(),
      fetchOrders(),
      fetchFirms()
    ]);
    setCustomers(dbCustomers);
    setAllOrders(dbOrders);
    setFirms(dbFirms);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showNotification('Client records synchronized');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      return c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [customers, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const rangeStart = (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, filteredCustomers.length);

  const filteredFirmsForSelect = useMemo(() => {
    return firms.filter(f => f.name.toLowerCase().includes(firmSearchTerm.toLowerCase()));
  }, [firms, firmSearchTerm]);

  const firmGroup = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.firmId) return [selectedCustomer];
    return customers.filter(c => c.firmId === selectedCustomer.firmId);
  }, [selectedCustomer, customers]);

  const firmGroupNames = useMemo(() => firmGroup.filter(c => c !== null).map(c => c!.name), [firmGroup]);
  
  const firmLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    if (!selectedCustomer.firmId) {
        return allOrders.filter(o => o.customerName === selectedCustomer.name);
    }
    return allOrders.filter(o => firmGroupNames.includes(o.customerName));
  }, [allOrders, selectedCustomer, firmGroupNames]);

  const sharedFirmBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    if (!selectedCustomer.firmId) return selectedCustomer.balance;
    return firmGroup.reduce((sum, c) => sum + (c?.balance || 0), 0);
  }, [selectedCustomer, firmGroup]);

  const financialSummary = useMemo(() => {
    const summary = { totalPurchases: 0, totalPayments: 0, totalReturns: 0 };
    firmLedger.forEach(o => {
        if (o.status === 'rejected') return; // Ignore rejected in summary
        if (o.status === 'Payment') summary.totalPayments += (o.totalAmount || 0);
        else if (o.status === 'Return') summary.totalReturns += (o.totalAmount || 0);
        else summary.totalPurchases += (o.totalAmount || 0);
    });
    return summary;
  }, [firmLedger]);

  const selectedFirmObj = useMemo(() => {
    if (!selectedCustomer?.firmId) return null;
    return firms.find(f => f.name === selectedCustomer.firmId);
  }, [selectedCustomer, firms]);

  const [formData, setFormData] = useState<any>({
    name: '', countryCode: '+91', phone: '', firmId: '', nickname: '', type: 'Owner',
    status: 'Approved', market: '', password: '', pincode: '', city: '', state: '', address: ''
  });

  const handleOpenProfile = (customer: Customer) => setSelectedCustomer(customer);

  const handleOpenEdit = (customer?: Customer) => {
    const target = customer || selectedCustomer;
    if (!target) return;
    
    let phonePart = target.phone;
    let codePart = '+91';
    const matchedCode = COUNTRY_CODES.find(c => target.phone.startsWith(c.code));
    if (matchedCode) {
      codePart = matchedCode.code;
      phonePart = target.phone.replace(matchedCode.code, '').trim();
    }

    setFormData({ ...target, countryCode: codePart, phone: phonePart });
    setIsEditModalOpen(true);
    setIsAddModalOpen(false);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showNotification('Please fill required fields', 'error');
      return;
    }
    const fullPhone = `${formData.countryCode} ${formData.phone.trim()}`;
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    
    if (isEditMode && (formData.id)) {
      const updatedClient: Customer = { ...formData, phone: fullPhone };
      setCustomers(prev => prev.map(c => c.id === formData.id ? updatedClient : c));
      if (selectedCustomer?.id === formData.id) setSelectedCustomer(updatedClient);
      await updateCustomerInDB(updatedClient);
      setIsEditModalOpen(false);
      showNotification('Client profile updated');
    } else {
      const { countryCode, ...rest } = formData;
      const newClient: Customer = {
        ...rest,
        id: `c-${Date.now()}`,
        phone: fullPhone,
        createdAt: dateStr,
        totalOrders: 0,
        balance: 0
      };
      setCustomers(prev => [newClient, ...prev]);
      await addCustomerToDB(newClient);
      setIsAddModalOpen(false);
      showNotification('New client registered');
    }
    setFormData({
      name: '', countryCode: '+91', phone: '', firmId: '', nickname: '', type: 'Owner',
      status: 'Approved', market: '', password: '', pincode: '', city: '', state: '', address: ''
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentForm.amount) return;
    const amount = parseFloat(paymentForm.amount);
    
    const updatedCustomer = { ...selectedCustomer, balance: selectedCustomer.balance + amount };
    setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));
    setSelectedCustomer(updatedCustomer);
    await updateCustomerInDB(updatedCustomer);

    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
    const paymentLog: Order = { 
        id: `PAY-${Date.now()}`, 
        customerName: selectedCustomer.name, 
        customerSubtext: selectedCustomer.city,
        orderTime: dateStr, 
        status: 'Payment', 
        totalAmount: amount, 
        warehouse: 'Accounting',
        invoiceStatus: 'Paid',
        orderMode: 'Offline',
        remarks: paymentForm.remarks
    };
    
    setAllOrders(prev => [paymentLog, ...prev]);
    await addOrderToDB(paymentLog);
    setIsPaymentModalOpen(false);
    setPaymentForm({ amount: '', mode: 'Cash', remarks: '' });
    showNotification(`₹${amount} added to client credit`);
  };

  const handleRowClick = (order: Order) => {
    if (order.status === 'Return') {
        const storedItems = localStorage.getItem(`apexflow_gr_items_${order.id}`);
        if (storedItems) {
            const grData = JSON.parse(storedItems);
            const formattedItems: OrderItem[] = grData.map((g: any, idx: number) => ({
                id: `gr-${idx}`,
                brand: g.item.brand,
                quality: g.item.quality,
                model: g.item.model,
                orderQty: g.returnQty,
                fulfillQty: g.returnQty,
                finalPrice: g.returnPrice,
                category: g.item.category || 'APEXFLOW'
            }));
            setPreviewOrderItems(formattedItems);
        } else { setPreviewOrderItems([]); }
    } else if (order.status === 'Payment') {
        setPreviewOrderItems([]);
    } else {
        const storedItems = localStorage.getItem(`apexflow_items_${order.id}`);
        if (storedItems) { setPreviewOrderItems(JSON.parse(storedItems)); } 
        else { setPreviewOrderItems([]); }
    }
    setViewingTransaction(order);
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1 no-print">
        <div className="relative w-full lg:max-w-2xl group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={20} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Search by client name, mobile, or city..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-14 pr-8 py-4 bg-white border border-slate-200 rounded-[2.5rem] text-[13px] font-bold uppercase tracking-tight text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm placeholder-slate-300"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-4 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:rotate-180 duration-700 disabled:opacity-50"
          >
            <RefreshCw size={20} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => {
            setFormData({
              name: '', countryCode: '+91', phone: '', firmId: '', nickname: '', type: 'Owner',
              status: 'Approved', market: '', password: '', pincode: '', city: '', state: '', address: ''
            });
            setIsEditModalOpen(false);
            setIsAddModalOpen(true);
          }} className="flex-1 lg:flex-none flex items-center justify-center px-10 py-4 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 shrink-0 whitespace-nowrap">
            <Plus size={16} className="mr-2" strokeWidth={4} /> Add Client
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm no-print flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="table-header bg-slate-50/80 border-b border-slate-100">
                <th className="w-[20%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Customer Info</th>
                <th className="w-[12%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Contact</th>
                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Role</th>
                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">Status</th>
                <th className="w-[20%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Location</th>
                <th className="w-[12%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Created</th>
                <th className="w-[16%] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-4">Syncing...</p>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Search size={32} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-300 uppercase">No clients found</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => handleOpenProfile(customer)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-800 uppercase tracking-tight truncate">{customer.name}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter opacity-70">ID: {customer.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-bold text-slate-600 tracking-tight">{customer.phone}</span></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest group-hover:bg-white group-hover:text-indigo-50/30 transition-all">{customer.type}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`inline-block px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getStatusColorClass(customer.status)}`}>{customer.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={10} className="text-slate-300 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase truncate tracking-tight">{customer.city}, {customer.state}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[11px] font-bold text-slate-400 uppercase">{customer.createdAt}</span></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onCreateOrder?.(customer)} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all" title="New Order"><ShoppingCart size={14} strokeWidth={3} /></button>
                        <button onClick={() => { setSelectedCustomer(customer); setIsPaymentModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-all" title="Add Payment"><CreditCard size={14} strokeWidth={3} /></button>
                        <button onClick={() => handleOpenEdit(customer)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all" title="Edit Profile"><Pencil size={14} strokeWidth={3} /></button>
                        <button onClick={() => handleOpenProfile(customer)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all" title="View Ledger"><Eye size={14} strokeWidth={3} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredCustomers.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rows Per Page</span>
                <div className="relative">
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-1.5 pr-8 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-900">{rangeStart} - {rangeEnd}</span> of <span className="text-slate-900">{filteredCustomers.length}</span> Clients
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft size={16} strokeWidth={3} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all shadow-sm active:scale-95 ${currentPage === pageNum ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && !isPaymentModalOpen && (
        <div className="fixed inset-0 bg-white z-[60] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-4 duration-300 print:static print:h-auto print:overflow-visible">
          <div className="sticky top-0 bg-white border-b border-slate-100 px-10 py-8 flex items-center justify-between z-10 no-print">
            <div className="flex items-center gap-8">
              <button onClick={() => setSelectedCustomer(null)} className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedCustomer.firmId ? selectedCustomer.firmId : selectedCustomer.name}</h2>
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1">{selectedCustomer.firmId ? `Consolidated Firm Profile` : `Client Identity: #${selectedCustomer.id}`}</p>
                </div>
                <button onClick={() => handleOpenEdit(selectedCustomer)} className="p-3.5 bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"><Pencil size={18} strokeWidth={3} /></button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPaymentModalOpen(true)} className="px-10 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 transition-all active:scale-95">Add Payment</button>
            </div>
          </div>

          <div className="p-12 max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-12 no-print">
            <div className="lg:col-span-1 space-y-10">
              <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2"><UserCheck size={16}/> Account Details</p>
                {selectedCustomer.firmId && (
                    <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={14} className="text-indigo-500" /> Firm Members</p>
                        <div className="space-y-3">{firmGroup.map(member => (<div key={member!.id} className="flex items-center justify-between"><span className="text-[12px] font-bold text-slate-700 uppercase">{member!.name}</span><span className="text-[11px] font-medium text-slate-400">{member!.phone}</span></div>))}</div>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-8">
                  <div className="grid grid-cols-2 gap-6"><DetailItem label="Contact Name" value={selectedCustomer.name} /><DetailItem label="Nick Name" value={selectedCustomer.nickname || '-'} /></div>
                  <div className="grid grid-cols-2 gap-6"><DetailItem label="Firm ID" value={selectedCustomer.firmId || '-'} icon={<Building size={12}/>}/><DetailItem label="Phone" value={selectedCustomer.phone} icon={<Phone size={12}/>}/></div>
                  <div className="grid grid-cols-2 gap-6"><DetailItem label="Role" value={selectedCustomer.type} icon={<Briefcase size={12}/>}/><DetailItem label="Status" value={selectedCustomer.status} status /></div>
                  <div className="grid grid-cols-2 gap-6"><DetailItem label="City" value={selectedCustomer.city} /><DetailItem label="Pincode" value={selectedCustomer.pincode || '-'} icon={<Hash size={12}/>}/></div>
                  <div className="grid grid-cols-2 gap-6"><DetailItem label="State" value={selectedCustomer.state || '-'} /></div>
                  <DetailItem label="Business Address" value={selectedCustomer.address || '-'} icon={<MapPinned size={12}/>} fullWidth />
                </div>
              </div>
              <div className="bg-indigo-600 p-12 rounded-[3rem] text-white flex flex-col justify-between shadow-[0_20px_50px_-15px_rgba(79,70,229,0.5)] min-h-[260px] relative overflow-hidden group">
                <div className="relative z-10"><p className="text-indigo-200 text-[11px] font-black uppercase tracking-[0.3em] mb-4">{selectedCustomer.firmId ? 'Firm Total Credit' : 'Available Credit'}</p><h3 className="text-6xl font-black tracking-tighter italic">₹{sharedFirmBalance.toFixed(1)}</h3></div>
                <div className="flex items-center gap-2 text-indigo-200 text-[11px] font-black uppercase tracking-widest relative z-10"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>{selectedCustomer.firmId ? `Aggregated for ${firmGroup.length} clients` : 'Secure Account Sync'}</div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div><h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Order & Ledger History</h3>{selectedCustomer.firmId && <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 italic">Showing shared ledger for Firm: {selectedCustomer.firmId}</p>}</div>
                  <button onClick={() => setIsStatementModalOpen(true)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 active:scale-95"><ReceiptText size={14} /> Generate Statement</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-50 text-[10px] uppercase text-slate-400 font-black"><th className="px-10 py-6">Ref ID</th><th className="px-10 py-6">Timestamp</th>{selectedCustomer.firmId && <th className="px-10 py-6">Placed By</th>}<th className="px-10 py-6">Action</th><th className="px-10 py-6 text-right">Adjustment</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {firmLedger.map((order: any) => (
                        <tr key={order.id} onClick={() => handleRowClick(order)} className="text-sm hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="px-10 py-6 font-black text-slate-900 text-[12px] tracking-tight group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <ReceiptText size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            #{order.id.toString().slice(-10)}
                          </td>
                          <td className="px-10 py-6 text-[12px] font-bold text-slate-400 uppercase tracking-tight">{order.orderTime}</td>
                          {selectedCustomer.firmId && (<td className="px-10 py-6"><span className="text-[11px] font-black text-indigo-400 uppercase">{order.customerName}</span></td>)}
                          <td className="px-10 py-6">
                            {order.status === 'fresh' ? (
                                <div className="flex flex-col gap-1">
                                    <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">NEW</span>
                                    <div className="flex items-center gap-1">
                                        <Info size={10} className="text-amber-500" />
                                        <p className="text-[8px] font-bold text-amber-600 uppercase leading-none">Credit not deducted</p>
                                    </div>
                                </div>
                            ) : order.status === 'rejected' ? (
                                <div className="flex flex-col gap-1">
                                    <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border bg-slate-100 text-slate-400 border-slate-200">REJECTED</span>
                                    <div className="flex items-center gap-1">
                                        <AlertTriangle size={10} className="text-slate-300" />
                                        <p className="text-[8px] font-bold text-slate-300 uppercase leading-none">Zero Financial Impact</p>
                                    </div>
                                </div>
                            ) : (
                                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${order.status === 'Payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : order.status === 'Return' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{(order.status === 'Payment' || order.status === 'Return') ? order.status : 'VERIFIED'}</span>
                            )}
                          </td>
                          <td className={`px-10 py-6 text-right font-black tracking-widest text-[14px] ${order.status === 'rejected' ? 'text-slate-200 line-through' : (order.status === 'Payment' || order.status === 'Return' ? 'text-emerald-600' : 'text-slate-800')}`}>
                            {order.status === 'rejected' ? `₹${Math.abs(order.totalAmount || 0).toFixed(1)}` : `${order.status === 'Payment' || order.status === 'Return' ? '+' : '-'}₹${Math.abs(order.totalAmount || 0).toFixed(1)}`}
                          </td>
                        </tr>
                      ))}
                      {firmLedger.length === 0 && (<tr><td colSpan={selectedCustomer.firmId ? 5 : 4} className="px-10 py-40 text-center text-slate-300 font-black text-[11px] uppercase tracking-[0.3em]">No transaction data available in cloud</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">{isEditMode ? <Pencil size={24} /> : <Plus size={24} strokeWidth={3} />}</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{isEditMode ? 'Update Client' : 'Register New Client'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Member Identity Protocol</p>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setIsFirmSearchOpen(false); }} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:rotate-90"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <form onSubmit={handleSaveClient} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-8">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><UserCircle size={14} className="text-indigo-500" /> Essential Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Identity <span className="text-rose-500">*</span></label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" placeholder="SHOP OR FULL NAME..." />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nick Name / Alias</label>
                            <input type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" placeholder="NICKNAME..." />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact ID <span className="text-rose-500">*</span></label>
                            <div className="flex gap-2">
                                <select value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} className="w-24 px-2 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white">
                                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                                <div className="relative flex-1">
                                    <input required type="tel" maxLength={10} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner" placeholder="PHONE..." />
                                    <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 relative">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Firm (Searchable)</label>
                            <div onClick={() => setIsFirmSearchOpen(!isFirmSearchOpen)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all shadow-inner">
                                <span className={formData.firmId ? 'text-slate-800' : 'text-slate-400'}>{formData.firmId || 'Select Firm...'}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFirmSearchOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isFirmSearchOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-slate-100">
                                        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus type="text" value={firmSearchTerm} onChange={e => setFirmSearchTerm(e.target.value)} placeholder="Filter firms..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase outline-none focus:bg-white"/></div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                        <button type="button" onClick={() => { setFormData({...formData, firmId: ''}); setIsFirmSearchOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-indigo-50 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50">No Firm (Reset)</button>
                                        {filteredFirmsForSelect.map(f => (<button type="button" key={f.id} onClick={() => { setFormData({...formData, firmId: f.name}); setIsFirmSearchOpen(false); }} className={`w-full text-left px-5 py-3 hover:bg-indigo-50 text-[11px] font-black uppercase tracking-tight transition-colors ${formData.firmId === f.name ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'}`}>{f.name}</button>))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                  </div>

                  <div className="space-y-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Shield size={14} className="text-indigo-500" /> Permissions</h4>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Role <span className="text-rose-500">*</span></label>
                        <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-slate-200">
                            <button type="button" onClick={() => setFormData({...formData, type: 'Owner'})} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'Owner' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Owner</button>
                            <button type="button" onClick={() => setFormData({...formData, type: 'Agent'})} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'Agent' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Agent</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Status <span className="text-rose-500">*</span></label>
                        <div className="flex flex-col gap-2">
                            {['Approved', 'Pending', 'Rejected'].map(id => (
                                <button key={id} type="button" onClick={() => setFormData({...formData, status: id})} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${formData.status === id ? 'bg-white border-indigo-500 shadow-md ring-4 ring-indigo-500/5' : 'bg-white border-slate-100 opacity-60 hover:opacity-100'}`}>
                                    <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${id === 'Approved' ? 'bg-emerald-500' : id === 'Pending' ? 'bg-amber-500' : id === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></div><span className={`text-[10px] font-black uppercase tracking-[0.1em] ${formData.status === id ? 'text-indigo-600' : 'text-slate-400'}`}>{id}</span></div>
                                    {formData.status === id && <CheckCircle2 size={16} className="text-indigo-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2 pt-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Portal PIN</label>
                      <div className="relative"><input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="PIN CODE..." /><Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><MapPinned size={14} className="text-indigo-500" /> Geo Deployment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pincode</label><input type="text" maxLength={6} value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white shadow-inner" placeholder="000000" /></div>
                        <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">City <span className="text-rose-500">*</span></label><input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white shadow-inner" placeholder="CITY..." /></div>
                        <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">State</label><input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white shadow-inner" placeholder="STATE..." /></div>
                    </div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Shipping Address</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-[13px] font-bold uppercase outline-none focus:bg-white transition-all min-h-[100px] resize-none shadow-inner" placeholder="COMPLETE BILLING/SHIPPING ADDRESS..." /></div>
                </div>

                <div className="pt-6 flex gap-4 border-t border-slate-50">
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">Discard Changes</button>
                  <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">{isEditMode ? 'Synchronize Profile' : 'Initialize Member'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingTransaction && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3"><ReceiptText size={20} className="text-indigo-600" /><span className="text-sm font-black text-slate-800 uppercase tracking-widest">{viewingTransaction.status === 'Payment' ? 'Payment Receipt' : viewingTransaction.status === 'Return' ? 'Credit Note' : 'Order Invoice'}</span></div>
                    <button onClick={() => setViewingTransaction(null)} className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-rose-500 transition-all"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-100/50 custom-scrollbar">
                    <div className="bg-white w-full max-w-[600px] mx-auto min-h-[700px] shadow-sm p-8 md:p-12 border border-slate-200 font-sans text-slate-900 flex flex-col">
                        <div className="text-center mb-10"><div className="flex items-center justify-center gap-3 mb-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${viewingTransaction.status === 'Payment' ? 'bg-emerald-600' : viewingTransaction.status === 'Return' ? 'bg-rose-600' : 'bg-indigo-600'}`}><Layers size={20} strokeWidth={2.5} /></div><h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">ApexFlow Management</h1></div><p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Transaction Record</p></div>
                        <div className="flex justify-between items-start mb-10 gap-4"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account</p><h3 className="text-base font-black text-slate-900 uppercase leading-none">{viewingTransaction.customerName}</h3><p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">{viewingTransaction.customerSubtext}</p></div><div className="text-right space-y-1"><p className="text-[10px] font-bold text-slate-600 uppercase">Ref: <span className="text-slate-900">#{viewingTransaction.id.slice(-10)}</span></p><p className="text-[10px] font-bold text-slate-600 uppercase">Date: <span className="text-slate-900">{viewingTransaction.orderTime}</span></p></div></div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead><tr className="border-y border-slate-900"><th className="py-3 px-1 text-left text-[9px] font-black uppercase text-slate-900 tracking-widest">Description</th>{(viewingTransaction.status !== 'Payment') && (<><th className="py-3 px-1 text-center text-[9px] font-black uppercase text-slate-900 w-12">Qty</th><th className="py-3 px-1 text-center text-[9px] font-black uppercase text-slate-900 w-20">Rate</th></>)}<th className="py-3 px-1 text-right text-[9px] font-black uppercase text-slate-900 w-24">Amount</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">{(viewingTransaction.status !== 'Payment') ? (previewOrderItems.length > 0 ? previewOrderItems.map((item, idx) => (<tr key={idx}><td className="py-3 px-1"><p className="text-[11px] font-bold uppercase text-slate-800 leading-tight">{item.brand} {item.quality} {item.model}</p></td><td className="py-3 px-1 text-center font-black text-slate-900 text-xs">{item.fulfillQty || item.orderQty}</td><td className="py-3 px-1 text-center font-bold text-slate-500 text-xs">₹{item.finalPrice.toFixed(1)}</td><td className="py-3 px-1 text-right font-black text-slate-900 text-xs">₹{((item.fulfillQty || item.orderQty) * item.finalPrice).toFixed(1)}</td></tr>)) : (<tr><td colSpan={4} className="py-10 text-center text-[10px] text-slate-300 uppercase italic">Detailed items unavailable</td></tr>)) : (<tr><td className="py-10 px-1"><p className="text-[12px] font-black text-slate-800 uppercase leading-tight">Account Credit Voucher</p><p className="text-[9px] font-bold text-slate-400 mt-2 uppercase italic">Processed by {viewingTransaction.warehouse}</p></td><td className="py-10 px-1 text-right font-black text-slate-900 text-base">₹{Math.abs(viewingTransaction.totalAmount || 0).toFixed(1)}</td></tr>)}</tbody>
                                <tfoot><tr className="border-t border-slate-900 bg-slate-50/50"><td colSpan={viewingTransaction.status !== 'Payment' ? 3 : 1} className="py-4 px-1 text-[11px] font-black uppercase text-slate-900">Total Adjustment</td><td className={`py-4 px-1 text-right text-lg font-black tracking-tighter ${viewingTransaction.status === 'Payment' || viewingTransaction.status === 'Return' ? 'text-emerald-600' : 'text-slate-900'}`}>{viewingTransaction.status === 'Payment' || viewingTransaction.status === 'Return' ? '+' : '-'}₹{Math.abs(viewingTransaction.totalAmount || 0).toFixed(1)}</td></tr></tfoot>
                            </table>
                        </div>

                        {viewingTransaction.remarks && (
                            <div className="mt-8 p-5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><MessageSquare size={10} /> Transaction Remark</p>
                                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-relaxed">{viewingTransaction.remarks}</p>
                            </div>
                        )}

                        <div className="mt-10 pt-6 border-t border-slate-100 text-center"><p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Electronic Ledger Entry</p><p className="text-[7px] font-bold text-slate-300 uppercase mt-2 italic tracking-tighter">Verified via ApexFlow Secure Core</p></div>
                    </div>
                </div>
                <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 shrink-0"><button onClick={() => setViewingTransaction(null)} className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button><button onClick={() => window.print()} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"><Printer size={14} /> Print Document</button></div>
            </div>
        </div>
      )}

      {isStatementModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-2 md:p-6 overflow-y-auto print:static print:bg-white print:p-0 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl h-auto max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none animate-in zoom-in-95">
            <div className="px-8 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 no-print shrink-0"><div className="flex items-center gap-3"><ReceiptText size={20} className="text-indigo-600" /><span className="text-sm font-black text-slate-800 uppercase tracking-widest">Account Statement</span></div><button onClick={() => setIsStatementModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-white"><X size={24} /></button></div>
            <div className="flex-1 p-4 md:p-6 print:p-0 bg-slate-100/50 print:bg-white overflow-y-auto custom-scrollbar">
              <div id="statement-print-area" className="bg-white w-full max-w-full mx-auto shadow-sm p-6 md:p-10 border border-slate-200 print:shadow-none print:border-none print:p-10 font-sans text-slate-900 flex flex-col min-h-[800px]">
                <div className="flex justify-between items-start mb-10"><div className="flex items-center gap-4"><div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"><Layers size={28} strokeWidth={2.5} /></div><div><h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">ApexFlow Management</h1><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Authorized Ledger</p></div></div><div className="text-right"><p className="text-lg font-black uppercase text-slate-800 tracking-tight">Financial Statement</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref: ST-{Date.now().toString().slice(-6)}</p></div></div>
                <div className="h-px bg-slate-100 w-full mb-8"></div>
                <div className="grid grid-cols-2 gap-8 mb-10"><div className="space-y-4"><div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2"><User size={10} /> Bill To Account</p><h3 className="text-xl font-black text-slate-900 uppercase leading-none tracking-tighter mb-1">{selectedCustomer.firmId || selectedCustomer.name}</h3>{selectedCustomer.firmId && (<div className="flex flex-col gap-1 mt-2"><p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Firm Consolidated</p>{selectedFirmObj?.gstin && <p className="text-[9px] font-black text-slate-400">GSTIN: {selectedFirmObj.gstin}</p>}</div>)}<div className="space-y-1 mt-4"><p className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2"><MapPin size={11} className="text-slate-300" /> {selectedCustomer.city}, {selectedCustomer.state}</p><p className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2"><Phone size={11} className="text-slate-300" /> {selectedCustomer.phone}</p></div></div></div><div className="flex flex-col gap-3"><div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between"><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Closing Balance</p><p className={`text-2xl font-black tracking-tighter ${sharedFirmBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{sharedFirmBalance.toFixed(1)}</p></div><div className="mt-3 pt-3 border-t border-slate-200"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">As of Date: <span className="text-slate-800 ml-1">{new Date().toLocaleDateString('en-GB')}</span></p></div></div></div></div>
                <div className="mb-8 grid grid-cols-3 gap-3"><div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales</p><p className="text-base font-black text-slate-900">₹{financialSummary.totalPurchases.toFixed(1)}</p></div><div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payments</p><p className="text-base font-black text-emerald-600">₹{financialSummary.totalPayments.toFixed(1)}</p></div><div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Returns</p><p className="text-base font-black text-rose-500">₹{financialSummary.totalReturns.toFixed(1)}</p></div></div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead><tr className="border-y-2 border-slate-900 bg-slate-50/50"><th className="py-3 px-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-900">Date</th><th className="py-3 px-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-900">Ref ID</th>{selectedCustomer.firmId && <th className="py-3 px-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-900">Member</th>}<th className="py-3 px-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-900">Type</th><th className="py-3 px-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-900">Impact</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{firmLedger.map((order: any, idx) => (<tr key={idx} className="hover:bg-slate-50/50"><td className="py-3 px-2 text-[10px] font-bold text-slate-600 uppercase">{order.orderTime.split(' ')[0]}</td><td className="py-3 px-2 text-[10px] font-black text-slate-900 uppercase">#{order.id.toString().slice(-8)}</td>{selectedCustomer.firmId && (<td className="py-3 px-2 text-[10px] font-bold text-indigo-400 uppercase truncate max-w-[120px]">{order.customerName}</td>)}<td className="py-3 px-2"><span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${order.status === 'fresh' ? 'bg-blue-50 text-blue-600 border-blue-200' : order.status === 'rejected' ? 'bg-slate-100 text-slate-400 border-slate-200' : order.status === 'Payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : order.status === 'Return' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{order.status === 'fresh' ? 'NEW' : order.status.toUpperCase()}</span></td><td className={`py-3 px-2 text-right text-[11px] font-black tracking-tight ${order.status === 'rejected' ? 'text-slate-300 line-through' : (order.status === 'Payment' || order.status === 'Return' ? 'text-emerald-600' : 'text-slate-800')}`}>{order.status === 'rejected' ? `₹${Math.abs(order.totalAmount || 0).toFixed(1)}` : `${order.status === 'Payment' || order.status === 'Return' ? '+' : '-'}₹${Math.abs(order.totalAmount || 0).toFixed(1)}`}</td></tr>))}</tbody>
                    <tfoot><tr className="border-t-2 border-slate-900 bg-slate-50/50"><td colSpan={selectedCustomer.firmId ? 4 : 3} className="py-4 px-2 text-[11px] font-black uppercase tracking-widest text-slate-900">Closing Balance Due</td><td className={`py-4 px-2 text-right text-xl font-black tracking-tighter ${sharedFirmBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{sharedFirmBalance.toFixed(1)}</td></tr></tfoot>
                  </table>
                </div>
                <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-2 gap-6"><div><h5 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={10} className="text-indigo-500" /> Official Notice</h5><p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase tracking-tight">This statement reflects verified transactions up to the timestamp. Includes shared liabilities for firm-connected accounts.</p></div><div className="flex flex-col items-end justify-center"><div className="w-32 h-10 border-b border-slate-200 mb-1 relative"><p className="absolute bottom-1 right-0 text-[7px] text-slate-300 font-black uppercase italic tracking-widest">ApexFlow SECURE SIGN</p></div><p className="text-[8px] font-black text-slate-800 uppercase tracking-[0.2em]">Accounts Officer</p></div></div>
              </div>
            </div>
            <div className="px-8 py-5 bg-white border-t border-slate-200 flex flex-wrap justify-center md:justify-end gap-3 no-print shrink-0"><button onClick={() => setIsStatementModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Close</button><button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-50"><Download size={14} /> Save PDF</button><button onClick={async () => { const text = `*ApexFlow LEDGER STATEMENT*\nClient: ${selectedCustomer.name}\nFirm: ${selectedCustomer.firmId || 'N/A'}\nAvailable Credit: ₹${sharedFirmBalance.toFixed(1)}\nGenerated on: ${new Date().toLocaleDateString()}`; if (navigator.share) { try { await navigator.share({ title: 'ApexFlow Account Statement', text: text }); } catch (err) {} } else { navigator.clipboard.writeText(text); showNotification('Statement summary copied'); } }} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"><Share2 size={14} /> Share</button><button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"><Printer size={14} /> Print Paper</button></div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-md overflow-hidden border border-slate-100 animate-in zoom-in-95">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Add Payment Credit</h3>
                    <p className="text-[9px] font-bold text-indigo-600 uppercase mt-1">{selectedCustomer.name}</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-10 space-y-8">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Amount (₹)</label><input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-3xl font-black text-slate-900 outline-none focus:border-emerald-500 transition-all shadow-inner" placeholder="0.00" /></div>
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Remarks</label><input type="text" value={paymentForm.remarks} onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none" placeholder="Reference note..." /></div>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white font-black text-[12px] uppercase tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-emerald-100 active:scale-95 transition-all">Submit Payment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string; status?: boolean; icon?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, status, icon, fullWidth }) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Pending': return 'text-amber-600 bg-amber-50 border-emerald-100';
      case 'Rejected': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] block mb-2 flex items-center gap-2">{icon}{label}</label>
      {status ? (<span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(value)}`}>{value}</span>) : (<p className="text-[13px] font-black text-slate-800 tracking-tight uppercase leading-relaxed">{value}</p>)}
    </div>
  );
};

export default Customers;