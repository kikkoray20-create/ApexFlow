import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, RefreshCw, Plus, Trash2, Home, X, Check, Loader2, Info, 
    Calendar, ArrowRight, ClipboardList, TrendingUp, TrendingDown, Layers, History,
    ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MOCK_INVENTORY } from '../constants';
import { InventoryLog, InventoryItem } from '../types';
import { fetchInventoryLogs, fetchInventory, updateInventoryItemInDB, addInventoryLogToDB } from '../services/db';
import { useNotification } from '../context/NotificationContext';

const PAGE_SIZE_OPTIONS = [50, 100, 200, 300, 500, 1000];

const Inventory: React.FC = () => {
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { showNotification } = useNotification();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSearchTerm, setBulkSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const [loadedLogs, loadedInventory] = await Promise.all([ fetchInventoryLogs(), fetchInventory() ]);
        
        const manualLogs = loadedLogs.filter(log => 
            log.shopName === 'Manual Stock Update' || 
            !log.remarks.includes('Automatic Deduction')
        );
        
        setLogs(manualLogs);
        setInventory(loadedInventory.length > 0 ? loadedInventory : MOCK_INVENTORY);
        setLoading(false);
    };

    const handleRefresh = async () => { 
        setIsRefreshing(true); 
        await loadData(); 
        setIsRefreshing(false); 
        showNotification('Manual inventory logs synchronized');
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => 
            log.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.shopName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [logs, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage, itemsPerPage]);

    const rangeStart = (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, filteredLogs.length);

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-10">
            
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-5 w-full lg:w-auto">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                        <History size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Stock Audit Trail</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Manual User Adjustments Only</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                    <div className="hidden sm:flex items-center gap-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Manual Actions</p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter leading-none">{logs.length}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsBulkModalOpen(true)} className="px-10 py-3.5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 active:scale-95 transition-all hover:bg-indigo-700">
                        <Plus size={16} className="mr-2 inline" strokeWidth={4} /> Batch Transaction
                    </button>
                </div>
            </div>

            {/* Search Hub */}
            <div className="relative group no-print">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Search size={22} strokeWidth={2.5} />
                </div>
                <input 
                    type="text" 
                    placeholder="Search manual logs..." 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                    className="w-full pl-14 pr-14 py-4 bg-white border border-slate-200 rounded-[2.5rem] text-[13px] font-bold uppercase tracking-tight text-slate-800 outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-sm"
                />
                <button onClick={handleRefresh} className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-indigo-500 transition-all active:rotate-180 duration-700">
                    <RefreshCw size={20} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Logs Table Card */}
            <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm flex flex-col no-print">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="w-[12%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                <th className="w-[25%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Hardware Profile</th>
                                <th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                <th className="w-[12%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Movement</th>
                                <th className="w-[12%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Final Stock</th>
                                <th className="w-[24%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="py-40 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Indexing Cloud Logs...</p></td></tr>
                            ) : paginatedLogs.length === 0 ? (
                                <tr><td colSpan={6} className="py-40 text-center"><ClipboardList size={48} className="text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No manual stock activities logged</p></td></tr>
                            ) : paginatedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{log.createdDate.split(' ')[0]}</span>
                                            <span className="text-[9px] font-black text-slate-300 uppercase mt-0.5">{log.createdDate.split(' ')[1] || ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-tight block truncate">{log.modelName}</span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-indigo-500">
                                            <Layers size={12} strokeWidth={3} />
                                            <span className="text-[11px] font-black uppercase tracking-widest truncate">Manual Correction</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-black tracking-widest shadow-sm ${log.status === 'Added' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {log.status === 'Added' ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                                            {log.status === 'Added' ? '+' : '-'}{log.quantityChange}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <span className="text-[14px] font-black text-slate-800 tracking-tighter">{log.currentStock} Units</span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2">
                                            <Info size={14} className="text-slate-200 shrink-0" />
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight line-clamp-1 group-hover:line-clamp-none transition-all">{log.remarks}</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && filteredLogs.length > 0 && (
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
                                Showing <span className="text-slate-900">{rangeStart} - {rangeEnd}</span> of <span className="text-slate-900">{filteredLogs.length}</span> Logs
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

            {/* Bulk Modal (Workflow Unchanged) */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0"><Layers size={28} /></div><div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">Bulk Stock Protocol</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Simultaneous Multi-Model Adjustment</p></div></div>
                            <button onClick={() => setIsBulkModalOpen(false)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:rotate-90"><X size={24} /></button>
                        </div>
                        <div className="flex-1 flex bg-slate-50/30 overflow-hidden">
                            <div className="w-1/2 border-r border-slate-100 p-8 flex flex-col overflow-hidden"><div className="mb-6"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 flex items-center justify-between"><span>Master Catalog</span><span className="text-indigo-500">{inventory.length} Verified Items</span></label><div className="relative group"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /><input type="text" placeholder="Filter items..." value={bulkSearchTerm} onChange={e => setBulkSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-sm"/></div></div><div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">{inventory.filter(i => i.model.toLowerCase().includes(bulkSearchTerm.toLowerCase()) || i.brand.toLowerCase().includes(bulkSearchTerm.toLowerCase())).map(item => (<button key={item.id} onClick={() => { if(selectedItems[item.id]) { const {[item.id]:_,...rest}=selectedItems; setSelectedItems(rest); } else { setSelectedItems({...selectedItems, [item.id]: 1}); } }} className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${selectedItems[item.id] ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1' : 'bg-white border-slate-100 hover:border-indigo-100'}`}><div className="min-w-0 pr-2"><p className={`text-[12px] font-black uppercase tracking-tight truncate leading-tight ${selectedItems[item.id] ? 'text-indigo-600' : 'text-slate-800'}`}>{item.model}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.brand} | {item.quality} | Stock: {item.quantity}</p></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems[item.id] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>{selectedItems[item.id] && <Check size={14} strokeWidth={4}/>}</div></button>))}</div></div>
                            <div className="w-1/2 p-8 bg-white flex flex-col overflow-hidden"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><ArrowRight size={14} /> Adjustment Details</h4>{Object.keys(selectedItems).length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30 grayscale"><Layers size={48} className="mb-4" /><p className="text-xs font-black uppercase tracking-widest leading-relaxed">Select models from the catalog to start bulk operations</p></div>) : (<div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-6">{Object.keys(selectedItems).map(id => { const item = inventory.find(i => i.id === id); return (<div key={id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between shadow-inner"><div className="min-w-0 pr-4"><p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{item?.model}</p><p className="text-[9px] font-bold text-slate-400 uppercase">Available: {item?.quantity}</p></div><div className="flex items-center gap-3"><input type="number" value={selectedItems[id]} onChange={e => setSelectedItems({...selectedItems, [id]: Math.max(1, parseInt(e.target.value) || 0)})} className="w-16 h-10 bg-white border border-slate-200 rounded-xl text-center font-black text-sm outline-none focus:border-indigo-400" /><button onClick={() => { const {[id]:_,...rest}=selectedItems; setSelectedItems(rest); }} className="text-slate-300 hover:text-rose-500"><X size={18}/></button></div></div>); })}</div>)}<div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4"><button disabled={Object.keys(selectedItems).length === 0} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 transition-all">Synchronize Bulk Changes</button></div></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;