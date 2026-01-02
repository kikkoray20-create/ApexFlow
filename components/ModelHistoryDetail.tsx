import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, RefreshCw, Calendar, Tag, Info, Package, 
    ArrowUp, ArrowDown, ShoppingCart, History, 
    TrendingDown, TrendingUp, Search,
    Loader2, Database, Users, X, User, Plus
} from 'lucide-react';
import { InventoryLog } from '../types';
import { fetchInventoryLogs } from '../services/db';

interface ModelHistoryDetailProps {
    model: any;
    onBack: () => void;
}

// Entry represents a specific type of activity on a date
interface ActivityEntry {
    date: string;
    type: 'sale' | 'add';
    count: number;
    remainingStock: number;
    saleDetails: Array<{ customer: string; qty: number }>;
}

const ModelHistoryDetail: React.FC<ModelHistoryDetailProps> = ({ model, onBack }) => {
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 90); 
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Drill-down Modal State
    const [selectedDailySales, setSelectedDailySales] = useState<ActivityEntry | null>(null);

    useEffect(() => {
        loadLogs();
    }, [model.id]);

    const loadLogs = async () => {
        setLoading(true);
        const data = await fetchInventoryLogs();
        
        // Match by ID or Name
        const brandMatch = model.brand.toLowerCase();
        const nameMatch = model.model.toLowerCase();
        
        const filtered = data.filter(log => {
            const isIdMatch = log.itemId === model.id;
            const logName = log.modelName.toLowerCase();
            const isNameMatch = logName.includes(brandMatch) && logName.includes(nameMatch);
            return isIdMatch || isNameMatch;
        });

        setLogs(filtered);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadLogs();
        setIsRefreshing(false);
    };

    // Group logs by Date AND Type (Sale vs Add)
    const dailyActivities = useMemo(() => {
        const groups: Record<string, ActivityEntry> = {};

        // 1. Filter by range
        const filteredLogs = logs.filter(log => {
            if (!log.createdDate) return false;
            try {
                const cleanDate = log.createdDate.replace(',', '').split(' ')[0];
                const [d, m, y] = cleanDate.split('/');
                const logDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                return logDate >= startDate && logDate <= endDate;
            } catch (e) {
                return false;
            }
        });

        // 2. Aggregate by Day + Type
        filteredLogs.forEach(log => {
            const dateStr = log.createdDate.replace(',', '').split(' ')[0];
            const type = log.status === 'Removed' ? 'sale' : 'add';
            const groupKey = `${dateStr}_${type}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    date: dateStr,
                    type: type,
                    count: 0,
                    remainingStock: log.currentStock, // Assumes logs are in descending order
                    saleDetails: []
                };
            }

            groups[groupKey].count += log.quantityChange;
            
            if (type === 'sale') {
                groups[groupKey].saleDetails.push({
                    customer: log.shopName || 'Unknown Client',
                    qty: log.quantityChange
                });
            }
        });

        // 3. Sort by actual Date object and Type (Sale first if same date)
        return Object.values(groups).sort((a, b) => {
            const [da, ma, ya] = a.date.split('/');
            const [db, mb, yb] = b.date.split('/');
            const timeA = new Date(`${ya}-${ma}-${da}`).getTime();
            const timeB = new Date(`${yb}-${mb}-${db}`).getTime();
            
            if (timeA !== timeB) return timeB - timeA;
            // If same day, put 'sale' before 'add'
            return a.type === 'sale' ? -1 : 1;
        });
    }, [logs, startDate, endDate]);

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            
            {/* Top Navigation */}
            <div className="flex items-center justify-between no-print">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm shrink-0 active:scale-95"
                >
                    <ArrowLeft size={16} strokeWidth={3} />
                    Back to Registry
                </button>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh}
                        className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm active:rotate-180 duration-700"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} strokeWidth={2.5} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">Audit Active</span>
                </div>
            </div>

            {/* Profile Header */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider shadow-lg shadow-indigo-100">{model.brand}</span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg font-black text-[9px] uppercase tracking-wider">{model.quality}</span>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{model.model}</h2>
                            <div className="flex items-center gap-3 mt-4">
                                <Database size={12} className="text-indigo-500" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{model.category} • {model.warehouse}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 min-w-[200px] flex flex-col items-center justify-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Market Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-slate-400">₹</span>
                                <span className="text-3xl font-black text-slate-800 tracking-tighter">{model.price.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 min-w-[200px] flex flex-col items-center justify-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Current Stock</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-indigo-600 tracking-tighter">{model.quantity}</span>
                                <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Units</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-slate-50 rounded-full blur-[100px] pointer-events-none"></div>
            </div>

            {/* Controls and Activity History */}
            <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
                
                {/* Date Controls Strip */}
                <div className="px-10 py-8 bg-slate-50/60 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-8">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Activity History</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
                            Showing activities from {startDate.split('-').reverse().join('/')} to {endDate.split('-').reverse().join('/')}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-inner">
                        <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-300" />
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start:</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none focus:text-indigo-600 cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="w-px h-6 bg-slate-100"></div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End:</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent text-[11px] font-black text-slate-700 outline-none focus:text-indigo-600 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left table-fixed min-w-[900px]">
                        <thead>
                            <tr className="bg-white border-b border-slate-50">
                                <th className="w-[20%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Sale Count</th>
                                <th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Inventory</th>
                                <th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="w-[20%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Remaining Inventory</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-40 text-center">
                                        <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Pulling Secure Records...</p>
                                    </td>
                                </tr>
                            ) : dailyActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-40 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Search size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero entries for this date window</p>
                                    </td>
                                </tr>
                            ) : dailyActivities.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <Calendar size={14} className="text-slate-300" />
                                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">{row.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        {row.type === 'sale' ? (
                                            <button 
                                                onClick={() => setSelectedDailySales(row)}
                                                className="px-4 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[14px] font-black tracking-tighter hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2 mx-auto group/btn"
                                            >
                                                {row.count}
                                                <Users size={12} className="opacity-40 group-hover/btn:opacity-100" />
                                            </button>
                                        ) : (
                                            <span className="text-[14px] font-black text-slate-200">-</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        {row.type === 'add' ? (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 text-[12px] font-black tracking-widest">
                                                <Plus size={12} strokeWidth={3} />
                                                {row.count}
                                            </div>
                                        ) : (
                                            <span className="text-[12px] font-black text-slate-200">-</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <span className={`px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                                            row.type === 'sale' 
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' 
                                            : 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-100'
                                        }`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-900 border border-slate-100 text-[12px] font-black tracking-tighter">
                                            {row.remainingStock} Units
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between no-print">
                    <div className="flex items-center gap-3 text-slate-300">
                        <Info size={14} />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Verified Secure Ledger Core</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
                        Showing {dailyActivities.length} Records
                    </span>
                </div>
            </div>

            {/* --- SALE DISTRIBUTION DRILL-DOWN MODAL --- */}
            {selectedDailySales && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <ShoppingCart size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Order Distribution</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedDailySales.date} | Total: {selectedDailySales.count} Pcs</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDailySales(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:rotate-90 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={14} className="text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer breakdown for this date</span>
                            </div>
                            
                            {selectedDailySales.saleDetails.map((detail, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm">
                                            {detail.customer.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{detail.customer}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Transaction</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-black text-indigo-600">-{detail.qty}</span>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Units</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setSelectedDailySales(null)} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                                Close Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelHistoryDetail;