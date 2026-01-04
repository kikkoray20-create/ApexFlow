import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, 
    ShoppingCart, 
    X,
    LogOut,
    Edit2,
    Loader2,
    Filter,
    ChevronDown,
    ChevronUp,
    Box,
    ArrowLeft,
    CheckCircle2,
    Package,
    Tag,
    Layers,
    ReceiptText,
    Truck
} from 'lucide-react';
import { Customer, InventoryItem, Order, OrderItem } from '../types.ts';
import { MOCK_INVENTORY } from '../constants.tsx';
import { fetchInventory, addOrderToDB } from '../services/db.ts';
import { useNotification } from '../context/NotificationContext.tsx';

interface CreateOrderProps {
    customer: Customer;
    onBack: () => void;
    onSubmitOrder: (order: Order, items: OrderItem[]) => void;
}

interface ProductItem extends InventoryItem {
    category: string;
}

const CreateOrder: React.FC<CreateOrderProps> = ({ customer, onBack, onSubmitOrder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<Record<string, number>>({});
    const [activeTab, setActiveTab] = useState('All');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [cargoName, setCargoName] = useState('1');
    const { showNotification } = useNotification();

    const [inventory, setInventory] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchInventory();
                const formattedData: ProductItem[] = data.map((item: any) => ({
                    ...item,
                    category: item.category || 'General'
                }));
                
                if (formattedData.length === 0) {
                     const mockWithCategory = MOCK_INVENTORY.map((i: any) => ({...i, category: i.category || 'General'}));
                     setInventory(mockWithCategory);
                } else {
                     setInventory(formattedData);
                }
            } catch (error) {
                console.error("Failed to load inventory", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const tabs = useMemo(() => {
        const counts: Record<string, number> = {};
        inventory.forEach(i => {
            if (i.status !== 'Inactive') {
                counts[i.category] = (counts[i.category] || 0) + 1;
            }
        });
        const categories = Object.keys(counts).sort();
        const activeTotal = inventory.filter(i => i.status !== 'Inactive').length;
        return [{ name: 'All', count: activeTotal }, ...categories.map(c => ({ name: c, count: counts[c] }))];
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            if (item.status === 'Inactive') return false;
            const matchesSearch = 
                item.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.brand.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTab = activeTab === 'All' || item.category === activeTab;
            return matchesSearch && matchesTab;
        });
    }, [searchTerm, activeTab, inventory]);

    const handleQuantityChange = (itemId: string, val: string) => {
        const qty = parseInt(val) || 0;
        setCart(prev => {
            if (qty <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: qty };
        });
    };

    const cartItemIds = Object.keys(cart);
    const totalQty: number = (Object.values(cart) as number[]).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    const totalItemsCount = cartItemIds.length;
    
    const totalAmount = cartItemIds.reduce((sum, itemId) => {
        const item = inventory.find(i => i.id === itemId);
        return sum + (item ? item.price * (cart[itemId] || 0) : 0);
    }, 0);

    const handlePlaceOrder = async () => {
        if (totalQty === 0) return;
        const now = new Date();
        const orderId = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 899)}`;
        const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newOrder: Order = {
            id: orderId,
            customerName: customer.name,
            customerSubtext: customer.city || '',
            orderTime: dateStr,
            warehouse: 'Main Warehouse',
            status: 'fresh',
            invoiceStatus: 'Pending',
            orderMode: 'Offline',
            cargoName: cargoName,
            totalAmount: totalAmount
        };

        const orderItems: OrderItem[] = cartItemIds.map((itemId, index) => {
            const item = inventory.find(i => i.id === itemId)!;
            return {
                id: `${orderId}-${index}`,
                brand: item.brand,
                quality: item.quality,
                category: item.category,
                model: item.model,
                orderQty: cart[itemId] || 0,
                displayPrice: item.price,
                fulfillQty: 0, 
                finalPrice: item.price
            };
        });

        localStorage.setItem(`apexflow_items_${orderId}`, JSON.stringify(orderItems));
        await addOrderToDB(newOrder);
        onSubmitOrder(newOrder, orderItems);
        showNotification('Order placed successfully!', 'success');
        onBack();
    };

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-95">
                        <ArrowLeft size={20} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Offline Order Protocol</h2>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1 italic">Customer: {customer.name}</p>
                    </div>
                </div>
                <div className="bg-indigo-600 px-6 py-3 rounded-2xl text-white shadow-xl shadow-indigo-100 flex items-center gap-4">
                    <div className="text-right border-r border-white/20 pr-4">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Cart Value</p>
                        <p className="text-lg font-black tracking-tighter leading-none">₹{totalAmount.toFixed(1)}</p>
                    </div>
                    <button 
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={totalQty === 0}
                        className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest disabled:opacity-50"
                    >
                        <ShoppingCart size={18} /> Review
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="SEARCH MODELS..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.name}
                                    onClick={() => setActiveTab(tab.name)}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeTab === tab.name ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {tab.name} ({tab.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => <div key={i} className="h-40 bg-white rounded-3xl animate-pulse"></div>)
                        ) : filteredInventory.map(item => (
                            <div key={item.id} className={`p-6 rounded-3xl border transition-all ${cart[item.id] ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/5' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase border border-indigo-100 w-fit">{item.brand}</span>
                                        <h4 className="text-[13px] font-black text-slate-800 uppercase leading-tight tracking-tight h-10 line-clamp-2">{item.model}</h4>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.quality}</span>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Unit Rate</p>
                                        <p className="text-sm font-black text-emerald-600 tracking-tighter">₹{item.price.toFixed(1)}</p>
                                    </div>
                                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                                        <input 
                                            type="number" 
                                            value={cart[item.id] || ''} 
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            placeholder="0"
                                            className="w-12 text-center text-[12px] font-black outline-none bg-transparent"
                                        />
                                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                                            <ShoppingCart size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Cart View */}
                <div className="w-full lg:w-96 no-print">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-24">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><ShoppingCart size={20} className="text-indigo-400" /> Order Deck</h3>
                            <span className="px-3 py-1 bg-indigo-500 rounded-full text-[9px] font-black uppercase">{totalItemsCount} Types</span>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-8">
                            {cartItemIds.length === 0 ? (
                                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 grayscale">
                                    <Package size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selection Deck Empty</p>
                                </div>
                            ) : cartItemIds.map(id => {
                                const item = inventory.find(i => i.id === id);
                                return (
                                    <div key={id} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl group transition-all hover:bg-white/10">
                                        <div className="min-w-0 pr-4">
                                            <p className="text-[11px] font-black uppercase truncate tracking-tight">{item?.model}</p>
                                            <p className="text-[9px] font-bold text-white/40 uppercase mt-1">{item?.brand} • ₹{item?.price}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-indigo-400">x{cart[id]}</span>
                                            <button onClick={() => handleQuantityChange(id, '0')} className="text-white/20 hover:text-rose-500 transition-colors"><X size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-4 pt-8 border-t border-white/10">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                <span>Subtotal Units</span>
                                <span>{totalQty} Pcs</span>
                            </div>
                            <div className="flex justify-between items-center text-xl font-black uppercase tracking-tighter">
                                <span>Grand Total</span>
                                <span className="text-emerald-400">₹{totalAmount.toFixed(1)}</span>
                            </div>
                            <button 
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={totalQty === 0}
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/5 disabled:text-white/20 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 mt-4"
                            >
                                Secure Checkout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Order Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><ReceiptText size={24} /></div>
                                <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Order Validation</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Confirming Node: {customer.name}</p></div>
                            </div>
                            <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dispatch Cargo Name</label><div className="relative"><input type="text" value={cargoName} onChange={e => setCargoName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all" /><Truck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Summary</p><p className="text-2xl font-black text-slate-900 tracking-tighter">{totalQty} Pcs • {totalItemsCount} Models</p></div>
                            </div>
                            <div className="border border-slate-100 rounded-[2rem] overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-100"><tr className="text-[9px] font-black uppercase text-slate-400"><th className="px-6 py-3">Item Description</th><th className="px-6 py-3 text-center">Qty</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-50">{cartItemIds.map(id => { const item = inventory.find(i => i.id === id); return (<tr key={id} className="text-[11px] font-bold text-slate-600"><td className="px-6 py-4 uppercase">{item?.model}</td><td className="px-6 py-4 text-center">{cart[id]}</td><td className="px-6 py-4 text-right">₹{(cart[id] * (item?.price || 0)).toFixed(1)}</td></tr>); })}</tbody></table>
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Verified Total Payable</p><p className="text-3xl font-black text-indigo-600 tracking-tighter italic">₹{totalAmount.toFixed(1)}</p></div>
                            <button onClick={handlePlaceOrder} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center gap-3">Authorize Order <CheckCircle2 size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateOrder;