import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, RefreshCw, Plus, Edit2, Loader2, FileSpreadsheet, ChevronDown, 
    Filter, X, Package, Tag, PlusCircle, MinusCircle, ClipboardList, 
    ChevronLeft, ChevronRight, MoreHorizontal, LayoutGrid, List, Settings2, 
    Trash2, Box, Layers, ArrowUpDown, CheckCircle, AlertCircle, Info, Database,
    SearchCode, Check
} from 'lucide-react';
import { InventoryItem, InventoryLog } from '../types.ts';
import { fetchInventory, updateInventoryItemInDB, addInventoryItemToDB, addInventoryLogToDB, fetchMasterRecords, addMasterRecord, deleteMasterRecord, fetchLinks, updateLinkInDB } from '../services/db.ts';
import { useNotification } from '../context/NotificationContext.tsx';

const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 500, 1000];

interface ShopItem extends InventoryItem {
    category: string;
    warehouse: string;
    status: string;
    isNew?: string;
}

type SortConfig = {
    key: 'price' | 'quantity' | null;
    direction: 'asc' | 'desc' | null;
};

interface ShopModelListProps {
    onViewModel: (item: ShopItem) => void;
}

const ShopModelList: React.FC<ShopModelListProps> = ({ onViewModel }) => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Master Records States
    const [masters, setMasters] = useState<{ brands: string[], qualities: string[], categories: string[], models: string[], warehouses: string[] }>({
        brands: [], qualities: [], categories: [], models: [], warehouses: []
    });
    const [masterModal, setMasterModal] = useState<{ isOpen: boolean, type: 'brand' | 'quality' | 'category' | 'model' | 'warehouse' | null }>({ isOpen: false, type: null });
    const [masterInput, setMasterInput] = useState('');
    const [isMasterSaving, setIsMasterSaving] = useState(false);

    // Search & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('All Warehouse');
    const [statusFilter, setStatusFilter] = useState('Active');
    
    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Stock Adjustment Modal State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<ShopItem | null>(null);
    const [adjType, setAdjType] = useState<'Add' | 'Remove'>('Add');
    const [adjQty, setAdjQty] = useState('');
    const [adjRemarks, setAdjRemarks] = useState('');
    const [isUpdatingStock, setIsUpdatingStock] = useState(false);

    // Create Form State
    const [createFormData, setCreateFormData] = useState<Partial<ShopItem>>({
        brand: '',
        model: '',
        quality: '',
        category: '',
        warehouse: '',
        price: 0,
        quantity: 0,
        status: 'Active',
        isNew: 'No',
        location: '-'
    });

    useEffect(() => { loadAllData(); }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [invData, b, q, c, m, w] = await Promise.all([
                fetchInventory(),
                fetchMasterRecords('brand'),
                fetchMasterRecords('quality'),
                fetchMasterRecords('category'),
                fetchMasterRecords('model'),
                fetchMasterRecords('warehouse')
            ]);
            
            setItems((invData || []).map((item: any) => ({ 
                ...item, 
                category: item.category || 'APEXFLOW', 
                warehouse: item.warehouse || 'APEXFLOW', 
                status: item.status || 'Active' 
            })));
            
            setMasters({ 
                brands: b || [], 
                qualities: q || [], 
                categories: c || [], 
                models: m || [],
                warehouses: w || []
            });
        } catch (error) {
            console.error("Failed to load inventory data", error);
            showNotification('Error syncing data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadAllData();
        setIsRefreshing(false);
        showNotification('Inventory database synchronized');
    };

    const openStockAdjustment = (item: ShopItem) => {
        setSelectedStockItem(item);
        setAdjType('Add');
        setAdjQty('');
        setAdjRemarks('');
        setIsStockModalOpen(true);
    };

    const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStockItem || !adjQty || isNaN(parseInt(adjQty))) return;

        setIsUpdatingStock(true);
        const change = parseInt(adjQty);
        let newQuantity = selectedStockItem.quantity;
        if (adjType === 'Add') newQuantity += change;
        else newQuantity = newQuantity - change; 

        const updatedItem = { ...selectedStockItem, quantity: newQuantity };
        setItems(prev => prev.map(i => i.id === selectedStockItem.id ? updatedItem : i));

        try {
            await updateInventoryItemInDB(updatedItem);
            
            if (newQuantity <= 0) {
                const allLinks = await fetchLinks();
                const updatePromises = allLinks.map(link => {
                    const currentAllowed = link.allowedModels || [];
                    const nextAllowed = currentAllowed.filter(id => id !== selectedStockItem.id);
                    if (nextAllowed.length !== currentAllowed.length) {
                        return updateLinkInDB({ ...link, allowedModels: nextAllowed });
                    }
                    return null;
                }).filter(p => p !== null);
                
                if (updatePromises.length > 0) {
                    await Promise.all(updatePromises);
                    showNotification('System: Item auto-removed from portals due to zero stock', 'info');
                }
            }

            const log: InventoryLog = {
                id: `log-${Date.now()}`,
                itemId: selectedStockItem.id,
                modelName: `${selectedStockItem.brand} ${selectedStockItem.model} ${selectedStockItem.quality}`,
                shopName: 'Manual Stock Update',
                status: adjType === 'Add' ? 'Added' : 'Removed',
                quantityChange: change,
                currentStock: updatedItem.quantity,
                remarks: adjRemarks || `Manual ${adjType} of ${change} units`,
                createdDate: new Date().toLocaleString('en-GB')
            };
            await addInventoryLogToDB(log);
            showNotification(`Stock adjusted to ${newQuantity}`);
            setIsStockModalOpen(false);
        } catch (err) {
            showNotification('Error updating stock', 'error');
            loadAllData();
        } finally {
            setIsUpdatingStock(false);
        }
    };

    const handlePriceUpdate = async (id: string, newPrice: number) => {
        if (isNaN(newPrice)) return;
        const itemToUpdate = items.find(i => i.id === id);
        if (!itemToUpdate) return;
        const updatedItem = { ...itemToUpdate, price: newPrice };
        setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
        try {
            await updateInventoryItemInDB(updatedItem);
            showNotification('Unit price updated');
        } catch (error) {
            showNotification('Update failed', 'error');
            loadAllData();
        }
    };

    const handleStatusToggle = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
        const updatedItem = { ...item, status: newStatus };
        setItems(prev => prev.map(i => i.id === id ? updatedItem : i));
        try {
            await updateInventoryItemInDB(updatedItem);
            showNotification(`Visibility toggled to ${newStatus}`);
        } catch (error) {
            showNotification('Failed to update status', 'error');
            loadAllData();
        }
    };

    const handleMasterSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!masterInput.trim() || !masterModal.type) return;

        const val = masterInput.trim().toUpperCase();
        const pluralKeyMap: Record<string, keyof typeof masters> = {
            brand: 'brands',
            quality: 'qualities',
            category: 'categories',
            model: 'models',
            warehouse: 'warehouses'
        };
        const key = pluralKeyMap[masterModal.type];
        
        if (masters[key].some(item => item.toUpperCase() === val)) {
            showNotification(`${masterModal.type} entry already exists`, 'error');
            return;
        }

        setIsMasterSaving(true);
        try {
            await addMasterRecord(masterModal.type, val);
            const updatedList = await fetchMasterRecords(masterModal.type);
            setMasters(prev => ({ ...prev, [key]: updatedList }));
            setMasterInput('');
            showNotification(`New ${masterModal.type} recorded`);
        } finally {
            setIsMasterSaving(false);
        }
    };

    const handleCreateModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createFormData.brand || !createFormData.model || !createFormData.category || !createFormData.warehouse) {
            showNotification('Missing required model attributes', 'error');
            return;
        }

        const isDuplicate = items.some(i => 
            i.brand.toUpperCase() === createFormData.brand?.toUpperCase() &&
            i.model.toUpperCase() === createFormData.model?.toUpperCase() &&
            i.quality.toUpperCase() === (createFormData.quality || 'OG').toUpperCase()
        );

        if (isDuplicate) {
            showNotification('Duplicate model configuration detected', 'error');
            return;
        }

        const newItem: ShopItem = {
            id: `mod-${Date.now()}`,
            brand: createFormData.brand!,
            model: createFormData.model!,
            quality: createFormData.quality || 'OG',
            category: createFormData.category || 'APEXFLOW',
            warehouse: createFormData.warehouse || 'APEXFLOW',
            price: Number(createFormData.price) || 0,
            quantity: 0,
            status: createFormData.status || 'Active',
            isNew: createFormData.isNew || 'No',
            location: '-'
        };

        try {
            await addInventoryItemToDB(newItem);
            setItems(prev => [newItem, ...prev]);
            setIsCreateModalOpen(false);
            setCreateFormData({ brand: '', model: '', quality: '', category: '', warehouse: '', price: 0, quantity: 0, status: 'Active', isNew: 'No', location: '-' });
            showNotification('New model initialized in warehouse');
        } catch (err) {
            showNotification('Creation failed', 'error');
        }
    };

    const handleExport = () => {
        if (processedItems.length === 0) return;
        const data = processedItems.map(item => ({
            'Brand': item.brand,
            'Quality': item.quality,
            'Category': item.category,
            'Model': item.model,
            'Warehouse': item.warehouse,
            'Price/Unit': item.price,
            'Inventory': item.quantity,
            'Status': item.status
        }));
        const ws = (window as any).XLSX.utils.json_to_sheet(data);
        const wb = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(wb, ws, "Inventory_Audit");
        (window as any).XLSX.writeFile(wb, `ApexFlow_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filterWarehouses = ['All Warehouse', ...Array.from(new Set([
        ...masters.warehouses,
        ...items.map(i => i.warehouse || '')
    ])).filter(Boolean).sort()];

    const brandsList = (masters.brands?.length > 0) ? masters.brands : Array.from(new Set(items.map(i => i.brand))).filter(Boolean).sort();
    const qualitiesList = (masters.qualities?.length > 0) ? masters.qualities : Array.from(new Set(items.map(i => i.quality))).filter(Boolean).sort();
    const categoriesList = (masters.categories?.length > 0) ? masters.categories : Array.from(new Set(items.map(i => i.category))).filter(Boolean).sort();
    const modelsList = (masters.models?.length > 0) ? masters.models : Array.from(new Set(items.map(i => i.model))).filter(Boolean).sort();
    const uniqueWarehousesList = (masters.warehouses?.length > 0) ? masters.warehouses : Array.from(new Set(items.map(i => i.warehouse))).filter(w => w && w !== 'All Warehouse').sort();

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = (item.model || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (item.quality || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesWarehouse = warehouseFilter === 'All Warehouse' || item.warehouse === warehouseFilter;
            const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
            return matchesSearch && matchesWarehouse && matchesStatus;
        });
    }, [items, searchTerm, warehouseFilter, statusFilter]);

    const processedItems = useMemo(() => {
        let result = [...filteredItems];
        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const valA = (a[sortConfig.key!] as number) || 0;
                const valB = (b[sortConfig.key!] as number) || 0;
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            });
        }
        return result;
    }, [filteredItems, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(processedItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedItems.slice(startIndex, startIndex + itemsPerPage);
    }, [processedItems, currentPage, itemsPerPage]);

    const rangeStart = (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, processedItems.length);

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-10">
            
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-5 w-full xl:w-auto">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                        <Database size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Catalog Intelligence</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Manage Models & Centralized Inventory</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                    {['brand', 'quality', 'category', 'model', 'warehouse'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setMasterModal({ isOpen: true, type: type as any })}
                            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-2"
                        >
                            <Settings2 size={12} strokeWidth={3} /> {type}s
                        </button>
                    ))}
                    <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>
                    <button onClick={handleExport} className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" title="Export to XLSX">
                        <FileSpreadsheet size={20} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className="px-8 py-3.5 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2">
                        <Plus size={16} strokeWidth={4} /> Register Model
                    </button>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search models..." 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                        className="w-full pl-14 pr-8 py-4 bg-slate-50/50 border border-slate-200 rounded-[2rem] text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner" 
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="relative min-w-[160px]">
                        <select value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setCurrentPage(1); }} className={selectStyles}>
                            {filterWarehouses.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        <ChevronDown size={14} className={iconStyles} />
                    </div>
                    <div className="relative min-w-[160px]">
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className={selectStyles}>
                            <option value="All Status">All Status</option>
                            <option value="Active">Visible</option>
                            <option value="Inactive">Hidden</option>
                        </select>
                        <ChevronDown size={14} className={iconStyles} />
                    </div>
                    <button onClick={handleRefresh} disabled={isRefreshing} className="p-4 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 transition-all active:rotate-180 duration-700 shadow-sm">
                        <RefreshCw size={20} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Inventory Table Card */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Brand</th>
                                <th className="w-[8%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Quality</th>
                                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="w-[20%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Model Name</th>
                                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Warehouse</th>
                                <th className="w-[12%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center cursor-pointer" onClick={() => setSortConfig({key: 'price', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                                    <div className="flex items-center justify-center gap-1.5 group">Unit Price <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100" /></div>
                                </th>
                                <th className="w-[10%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center cursor-pointer" onClick={() => setSortConfig({key: 'quantity', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                                    <div className="flex items-center justify-center gap-1.5 group">Stock <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100" /></div>
                                </th>
                                <th className="w-[8%] px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Visible</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={8} className="py-40 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Syncing Encrypted Stock...</p></td></tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr><td colSpan={8} className="py-40 text-center"><Package size={48} className="text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No matching models found in database</p></td></tr>
                            ) : paginatedItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex px-2 py-0.5 rounded-lg border border-indigo-100 text-indigo-600 bg-indigo-50 font-black text-[9px] uppercase tracking-wider">{item.brand}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex px-2 py-0.5 rounded-lg border border-emerald-100 text-emerald-600 bg-emerald-50 font-black text-[9px] uppercase tracking-wider">{item.quality}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight truncate">{item.category}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => onViewModel(item)} className="text-[12px] font-black text-slate-800 hover:text-indigo-600 transition-colors text-left uppercase leading-tight tracking-tight group-hover:underline truncate w-full">{item.model}</button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Layers size={10} strokeWidth={3} />
                                            <span className="text-[10px] font-black uppercase tracking-tight truncate">{item.warehouse}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="relative inline-block w-20">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black pointer-events-none">₹</span>
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                defaultValue={(item.price || 0).toFixed(1)} 
                                                onBlur={(e) => handlePriceUpdate(item.id, parseFloat(e.target.value))}
                                                className="w-full pl-5 pr-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[12px] font-black text-emerald-600 text-center outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => openStockAdjustment(item)}
                                            className={`inline-flex px-3 py-1.5 rounded-xl border font-black text-[12px] tracking-tighter transition-all active:scale-90 hover:shadow-sm ${
                                                (item.quantity || 0) > 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                (item.quantity || 0) > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}
                                        >
                                            {item.quantity || 0} PCS
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleStatusToggle(item.id)}
                                            className={`p-1.5 rounded-lg transition-all active:scale-90 shadow-sm border ${item.status === 'Active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                            title={item.status === 'Active' ? 'Mark Hidden' : 'Mark Visible'}
                                        >
                                            {item.status === 'Active' ? <CheckCircle size={16} strokeWidth={3} /> : <AlertCircle size={16} strokeWidth={3} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && processedItems.length > 0 && (
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
                                Showing <span className="text-slate-900">{rangeStart} - {rangeEnd}</span> of <span className="text-slate-900">{processedItems.length}</span> Models
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
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
                                            className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95 ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            >
                                <ChevronRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals remain the same */}
        </div>
    );
};

const selectStyles = "appearance-none bg-white border border-slate-200 rounded-[2rem] px-6 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none pr-12 w-full cursor-pointer hover:bg-slate-50 transition-all focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 shadow-sm text-slate-600";
const iconStyles = "absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";

export default ShopModelList;