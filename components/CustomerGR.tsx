import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    RefreshCw, 
    Loader2, 
    Plus, 
    X, 
    RotateCcw, 
    Package, 
    ChevronRight, 
    History,
    Trash2,
    Info,
    ReceiptText,
    PackageSearch,
    UserCircle2,
    Eye,
    Printer,
    FileDown,
    Share2,
    Download,
    Layers,
    TrendingUp,
    Calendar,
    ArrowRight,
    ChevronUp,
    ChevronDown,
    Check,
    AlertCircle,
    Edit2,
    CheckCircle2,
    AlertTriangle,
    CreditCard,
    MessageSquare,
    ArrowLeftRight,
    MinusCircle,
    ChevronLeft
} from 'lucide-react';
import { Order, Customer, InventoryItem, GRInventoryItem, UserRole, OrderItem } from '../types.ts';
import { fetchOrders, fetchCustomers, fetchInventory, addOrderToDB, fetchGRInventory, updateGRInventoryItemInDB, deleteOrderFromDB, updateCustomerInDB, updateOrderInDB } from '../services/db.ts';
import { useNotification } from '../context/NotificationContext.tsx';

const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 500, 1000];

interface CustomerGRProps {
    userRole?: UserRole;
}

const CustomerGR: React.FC<CustomerGRProps> = ({ userRole }) => {
    const [grs, setGrs] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [mainInventory, setMainInventory] = useState<InventoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'history' | 'inventory'>('history');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { showNotification } = useNotification();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Creation Workflow State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfirmGRModalOpen, setIsConfirmGRModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [grToDelete, setGrToDelete] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [itemSearch, setItemSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    
    // Removal Workflow State
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [removeQtyInput, setRemoveQtyInput] = useState('');
    const [itemBeingRemoved, setItemBeingRemoved] = useState<any | null>(null);

    // Direct Amount Mode State
    const [isDirectMode, setIsDirectMode] = useState(false);
    const [directAmount, setDirectAmount] = useState('');
    const [directRemarks, setDirectRemarks] = useState('');

    // Cart state handles price as string for smooth editing
    const [returnCart, setReturnCart] = useState<Record<string, { qty: number, price: string }>>({});

    // Detail View State
    const [viewingGR, setViewingGR] = useState<Order | null>(null);
    const [viewingItems, setViewingItems] = useState<any[]>([]);
    const [stockDrillDown, setStockDrillDown] = useState<any | null>(null);

    // Role restriction
    const isGRUser = userRole === 'GR';

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [allOrders, allCustomers, allInventory] = await Promise.all([ 
            fetchOrders(), 
            fetchCustomers(), 
            fetchInventory()
        ]);
        setGrs(allOrders.filter(o => o.status === 'Return'));
        setCustomers(allCustomers); 
        setMainInventory(allInventory); 
        setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
        showNotification('GR ledger synchronized');
    };

    // --- GR Calculation Logic ---
    const cartItemIds = Object.keys(returnCart);
    const totalReturnQty = cartItemIds.reduce((sum, id) => sum + returnCart[id].qty, 0);
    
    const totalCreditValue = useMemo(() => {
        if (isDirectMode) {
            return parseFloat(directAmount) || 0;
        }
        return cartItemIds.reduce((sum, id) => {
            const item = mainInventory.find(i => i.id === id);
            return sum + (returnCart[id].qty * parseFloat(returnCart[id].price || '0'));
        }, 0);
    }, [isDirectMode, directAmount, returnCart, cartItemIds, mainInventory]);

    const categories = useMemo(() => {
        const counts: Record<string, number> = {};
        mainInventory.forEach(i => {
            const cat = i.category || 'General';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return [{ name: 'All', count: mainInventory.length }, ...Object.keys(counts).sort().map(c => ({ name: c, count: counts[c] }))];
    }, [mainInventory]);

    const filteredInventoryForReturn = useMemo(() => {
        return mainInventory.filter(i => {
            const matchesCat = activeCategory === 'All' || i.category === activeCategory;
            const matchesSearch = i.model.toLowerCase().includes(itemSearch.toLowerCase()) || 
                                 i.brand.toLowerCase().includes(itemSearch.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [mainInventory, activeCategory, itemSearch]);

    const handleUpdateReturnQty = (itemId: string, val: string, defaultPrice: number) => {
        const qty = parseInt(val) || 0;
        setReturnCart(prev => {
            if (qty <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            const existing = prev[itemId] || { qty: 0, price: defaultPrice.toFixed(1) };
            return { ...prev, [itemId]: { ...existing, qty } };
        });
    };

    const handleUpdateReturnPrice = (itemId: string, val: string) => {
        const sanitized = val.replace(/[^0-9.]/g, '');
        setReturnCart(prev => {
            if (!prev[itemId]) return prev;
            return { ...prev, [itemId]: { ...prev[itemId], price: sanitized } };
        });
    };

    const handlePriceBlur = (itemId: string) => {
        setReturnCart(prev => {
            if (!prev[itemId]) return prev;
            const currentPrice = parseFloat(prev[itemId].price);
            return { 
                ...prev, 
                [itemId]: { 
                    ...prev[itemId], 
                    price: isNaN(currentPrice) ? '0.0' : currentPrice.toFixed(1) 
                } 
            };
        });
    };

    const handleFinalizeGR = async () => {
        if (!selectedCustomer) return;
        if (!isDirectMode && cartItemIds.length === 0) return;
        if (isDirectMode && !directAmount) return;

        const now = new Date();
        const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const grOrder: Order = {
            id: `GR-${Date.now()}`,
            customerName: selectedCustomer.name,
            customerSubtext: selectedCustomer.city,
            orderTime: timestamp,
            warehouse: isDirectMode ? 'Direct Adjustment' : 'Main GR Dept',
            status: 'Return',
            totalAmount: totalCreditValue,
            invoiceStatus: 'Paid',
            orderMode: 'Offline',
            remarks: isDirectMode ? directRemarks : ''
        };

        if (!isDirectMode) {
            const itemsToStore = cartItemIds.map(id => {
                const item = mainInventory.find(i => i.id === id)!;
                return {
                    item: item,
                    returnQty: returnCart[id].qty,
                    returnPrice: parseFloat(returnCart[id].price)
                };
            });
            localStorage.setItem(`apexflow_gr_items_${grOrder.id}`, JSON.stringify(itemsToStore));
        }

        try {
            const allCustomers = await fetchCustomers();
            const latestCustomer = allCustomers.find(c => c.id === selectedCustomer.id);
            if (latestCustomer) {
                const updatedCustomer = { 
                    ...latestCustomer, 
                    balance: latestCustomer.balance + totalCreditValue 
                };
                await updateCustomerInDB(updatedCustomer);
            }

            await addOrderToDB(grOrder);
            setGrs([grOrder, ...grs]);
            setIsConfirmGRModalOpen(false);
            setIsCreateModalOpen(false);
            showNotification(`GR Finalized: ₹${totalCreditValue.toFixed(1)} credited to ${selectedCustomer.name}`, 'success');
            loadData();
        } catch (err) {
            showNotification('Failed to sync GR to cloud', 'error');
        }
    };

    const handleViewGR = (gr: Order) => {
        const stored = localStorage.getItem(`apexflow_gr_items_${gr.id}`);
        if (stored) {
            setViewingItems(JSON.parse(stored));
        } else {
            setViewingItems([]);
        }
        setViewingGR(gr);
    };

    const handleDeleteGR = async () => {
        if (!grToDelete || isGRUser) return;
        
        await deleteOrderFromDB(grToDelete);
        localStorage.removeItem(`apexflow_gr_items_${grToDelete}`);
        setGrs(prev => prev.filter(o => o.id !== grToDelete));
        showNotification('Return record deleted', 'info');
        setIsDeleteConfirmOpen(false);
        setGrToDelete(null);
    };

    const handleInitiateRemove = (item: any) => {
        if (isGRUser) return;
        setItemBeingRemoved(item);
        setRemoveQtyInput('');
        setIsRemoveModalOpen(true);
    };

    const handleConfirmRemoveQty = async () => {
        if (!itemBeingRemoved || !removeQtyInput) return;
        
        const qtyToRemoveTotal = parseInt(removeQtyInput);
        if (isNaN(qtyToRemoveTotal) || qtyToRemoveTotal <= 0) {
            showNotification('Invalid removal quantity', 'error');
            return;
        }

        if (qtyToRemoveTotal > itemBeingRemoved.quantity) {
            showNotification('Cannot remove more than available stock', 'error');
            return;
        }

        let remainingToRemove = qtyToRemoveTotal;
        const affectedGrs = [];

        for (const gr of grs) {
            if (remainingToRemove <= 0) break;
            const storedKey = `apexflow_gr_items_${gr.id}`;
            const stored = localStorage.getItem(storedKey);
            if (!stored) continue;
            const itemsList = JSON.parse(stored);
            const itemIndex = itemsList.findIndex((entry: any) => 
                entry.item.brand.toUpperCase() === itemBeingRemoved.brand.toUpperCase() && 
                entry.item.model.toUpperCase() === itemBeingRemoved.model.toUpperCase() &&
                entry.item.quality.toUpperCase() === itemBeingRemoved.quality.toUpperCase()
            );
            if (itemIndex !== -1) {
                const entry = itemsList[itemIndex];
                const availableInThisGR = entry.returnQty;
                const deductFromThisGR = Math.min(availableInThisGR, remainingToRemove);
                entry.returnQty -= deductFromThisGR;
                remainingToRemove -= deductFromThisGR;
                if (entry.returnQty <= 0) itemsList.splice(itemIndex, 1);
                if (itemsList.length === 0) {
                    await deleteOrderFromDB(gr.id);
                    localStorage.removeItem(storedKey);
                    affectedGrs.push({ id: gr.id, action: 'delete' });
                } else {
                    localStorage.setItem(storedKey, JSON.stringify(itemsList));
                    const newTotal = itemsList.reduce((s: number, i: any) => s + (i.returnQty * i.returnPrice), 0);
                    const updatedGr = { ...gr, totalAmount: newTotal };
                    await updateOrderInDB(updatedGr);
                    affectedGrs.push({ id: gr.id, action: 'update', data: updatedGr });
                }
            }
        }

        setGrs(prev => {
            let next = [...prev];
            affectedGrs.forEach(aff => {
                if (aff.action === 'delete') next = next.filter(o => o.id !== aff.id);
                else next = next.map(o => o.id === aff.id ? aff.data : o);
            });
            return next;
        });

        setIsRemoveModalOpen(false);
        setItemBeingRemoved(null);
        showNotification(`Successfully removed ${qtyToRemoveTotal} units from GR stock`);
    };

    const handlePrint = () => window.print();

    const handleShareGR = async () => {
        if (!viewingGR) return;
        const totalVal = viewingItems.reduce((s, i) => s + (i.returnQty * i.returnPrice), 0);
        const text = `*APEXFLOW GOODS RETURN SUMMARY*\nReturn ID: #${viewingGR.id.slice(-8)}\nClient: ${viewingGR.customerName}\nItems: ${viewingItems.length}\nCredit Value: ₹${totalVal.toFixed(1)}\nDate: ${viewingGR.orderTime}`;
        if (navigator.share) try { await navigator.share({ title: 'GR Summary', text }); } catch (e) {}
        else { navigator.clipboard.writeText(text); showNotification('Summary copied to clipboard'); }
    };

    const aggregatedStockRoom = useMemo(() => {
        const stockMap: Record<string, { model: string; brand: string; quality: string; category: string; warehouse: string; quantity: number; totalVal: number; lastDate: string; history: Array<{ customer: string; date: string; qty: number }> }> = {};
        grs.forEach(gr => {
            const stored = localStorage.getItem(`apexflow_gr_items_${gr.id}`);
            if (stored) {
                const itemsList = JSON.parse(stored);
                itemsList.forEach((entry: any) => {
                    const key = `${entry.item.brand}-${entry.item.model}-${entry.item.quality}`.toUpperCase();
                    if (!stockMap[key]) {
                        stockMap[key] = { model: entry.item.model, brand: entry.item.brand, quality: entry.item.quality, category: entry.item.category || 'APEXFLOW', warehouse: entry.item.warehouse || 'APEXFLOW', quantity: 0, totalVal: 0, lastDate: gr.orderTime, history: [] };
                    }
                    stockMap[key].quantity += entry.returnQty;
                    stockMap[key].totalVal += (entry.returnQty * entry.returnPrice);
                    stockMap[key].lastDate = gr.orderTime; 
                    stockMap[key].history.push({ customer: gr.customerName, date: gr.orderTime, qty: entry.returnQty });
                });
            }
        });
        return Object.values(stockMap).sort((a, b) => b.quantity - a.quantity);
    }, [grs]);

    const totalBilledUnits = useMemo(() => aggregatedStockRoom.reduce((sum, i) => sum + i.quantity, 0), [aggregatedStockRoom]);

    const filteredHistory = grs.filter(o => 
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredStockRoom = aggregatedStockRoom.filter(i => 
        i.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.warehouse.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Dynamic Data Source for Pagination
    const dataSource = activeTab === 'history' ? filteredHistory : filteredStockRoom;
    const totalPages = Math.ceil(dataSource.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return dataSource.slice(startIndex, startIndex + itemsPerPage);
    }, [dataSource, currentPage, itemsPerPage]);

    const rangeStart = (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, dataSource.length);

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
            {/* Header and Stats */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100 shrink-0">
                        <RotateCcw size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Goods Return Console</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Inventory Restoration & Credit Adjustment</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex items-center gap-4 bg-white border border-slate-200 px-8 py-3.5 rounded-3xl shadow-sm">
                        <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                            <Package size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Billed Units</p>
                            <p className="text-xl font-black text-slate-800 tracking-tighter leading-none">{totalBilledUnits} Pcs</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setStep(1);
                            setSelectedCustomer(null);
                            setReturnCart({});
                            setDirectAmount('');
                            setDirectRemarks('');
                            setIsDirectMode(false);
                            setIsCreateModalOpen(true);
                            setCustomerSearch('');
                            setItemSearch('');
                            setActiveCategory('All');
                        }}
                        className="px-10 py-4 bg-rose-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-rose-200 active:scale-95 transition-all"
                    >
                        <Plus size={16} className="mr-2 inline" strokeWidth={4} /> Create GR
                    </button>
                </div>
            </div>

            {/* Navigation & Search */}
            <div className="flex flex-col xl:flex-row gap-6 items-center no-print">
                <div className="flex p-1.5 bg-slate-100 rounded-[2rem] w-full xl:w-auto">
                    <button 
                        onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
                        className={`flex items-center gap-2 px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'history' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={16} /> Return History
                    </button>
                    <button 
                        onClick={() => { setActiveTab('inventory'); setCurrentPage(1); }}
                        className={`flex items-center gap-2 px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'inventory' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <PackageSearch size={16} /> GR Stock Room
                    </button>
                </div>

                <div className="relative flex-1 w-full group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab === 'history' ? 'client or return id' : 'model or brand'}...`}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-14 pr-14 py-4 bg-white border border-slate-200 rounded-[2.5rem] text-[13px] font-bold uppercase tracking-tight text-slate-800 outline-none focus:ring-8 focus:ring-rose-500/5 focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <button onClick={handleRefresh} className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-rose-500 transition-all active:rotate-180 duration-500">
                        <RefreshCw size={20} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* List View Card */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col no-print">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                {activeTab === 'history' ? (
                                    <>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Return Details</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Identity</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Value Impact</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Item</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Quality / Grade</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Billed Qty</th>
                                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-40 text-center">
                                        <Loader2 className="animate-spin text-rose-500 mx-auto" size={32} />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Auditing Cloud Repository...</p>
                                    </td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-40 text-center">
                                        <ReceiptText size={48} className="text-slate-100 mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No return records found</p>
                                    </td>
                                </tr>
                            ) : paginatedData.map((item: any, idx: number) => (
                                <tr key={activeTab === 'history' ? item.id : idx} className="hover:bg-slate-50/50 transition-all group">
                                    {activeTab === 'history' ? (
                                        <>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-black text-slate-900 uppercase tracking-tight">#{item.id.toString().slice(-8)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.orderTime}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">
                                                        {item.customerName.charAt(0)}
                                                    </div>
                                                    <span className="text-[13px] font-bold text-slate-700 uppercase tracking-tight">{item.customerName}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-lg font-black text-emerald-600 tracking-tighter">+₹{Math.abs(item.totalAmount || 0).toFixed(1)}</span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleViewGR(item)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"><Eye size={14} strokeWidth={3} /> View</button>
                                                    {!isGRUser && (
                                                        <button onClick={() => { setGrToDelete(item.id); setIsDeleteConfirmOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"><Trash2 size={14} strokeWidth={3} /> Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{item.model}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span className="text-rose-500">{item.brand}</span>
                                                        <span className="mx-1.5 opacity-30">|</span>
                                                        <span>{item.category}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="inline-block px-3 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest">{item.quality}</span>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <button onClick={() => setStockDrillDown(item)} className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-black text-[14px] border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 mx-auto">{item.quantity} Units <ChevronRight size={14} strokeWidth={3} /></button>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end">
                                                    {!isGRUser && (
                                                        <button onClick={() => handleInitiateRemove(item)} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"><MinusCircle size={14} strokeWidth={3} /> Remove</button>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && dataSource.length > 0 && (
                    <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rows per Page</span>
                                <div className="relative">
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="appearance-none bg-white border border-slate-200 rounded-xl px-5 py-2 pr-10 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                                    >
                                        {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Showing <span className="text-slate-900">{rangeStart} - {rangeEnd}</span> of <span className="text-slate-900">{dataSource.length}</span> Records
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            >
                                <ChevronLeft size={18} strokeWidth={3} />
                            </button>
                            
                            <div className="flex items-center gap-1.5">
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
                                            className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95 ${currentPage === pageNum ? 'bg-rose-600 text-white shadow-rose-100' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            >
                                <ChevronRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Existing Modals */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[260] flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[360px] overflow-hidden border border-slate-100 animate-in zoom-in-95">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">Delete Record?</h3>
                            <p className="text-[12px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">Are you sure you want to permanently remove this return record? This action cannot be reversed.</p>
                        </div>
                        <div className="flex border-t border-slate-50">
                            <button onClick={() => { setIsDeleteConfirmOpen(false); setGrToDelete(null); }} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={handleDeleteGR} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-inner">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isRemoveModalOpen && itemBeingRemoved && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[270] flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden border border-slate-100 animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/50">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg"><MinusCircle size={18} /></div>
                                 <div><h3 className="text-base font-black text-slate-800 uppercase tracking-tight leading-none">Remove Stock Units</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{itemBeingRemoved.model}</p></div>
                             </div>
                             <button onClick={() => setIsRemoveModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-rose-500 transition-all shadow-sm"><X size={20} /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Available</p><p className="text-2xl font-black text-slate-900 tracking-tighter">{itemBeingRemoved.quantity} Pcs</p></div>
                                <div className="w-px h-10 bg-slate-200"></div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                                    <p className={`text-2xl font-black tracking-tighter ${Math.max(0, itemBeingRemoved.quantity - (parseInt(removeQtyInput) || 0)) === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{Math.max(0, itemBeingRemoved.quantity - (parseInt(removeQtyInput) || 0))} Pcs</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity to Remove</label>
                                <input type="number" value={removeQtyInput} onChange={e => setRemoveQtyInput(e.target.value)} placeholder="0" className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-3xl font-black text-slate-900 outline-none focus:bg-white focus:border-rose-500 focus:ring-8 focus:ring-rose-500/5 transition-all text-center" autoFocus />
                                <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-tight">Units will be deducted from the oldest records first</p>
                            </div>
                        </div>
                        <div className="px-8 pb-8 flex gap-4">
                            <button onClick={() => setIsRemoveModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Discard</button>
                            <button onClick={handleConfirmRemoveQty} disabled={!removeQtyInput || parseInt(removeQtyInput) <= 0 || parseInt(removeQtyInput) > itemBeingRemoved.quantity} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-100 transition-all active:scale-95 hover:bg-rose-700 disabled:opacity-50">Confirm Removal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerGR;