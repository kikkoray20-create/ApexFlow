import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, Copy, X, Plus, Check, RefreshCw, Trash2, Send, ShoppingBag, 
    Layers, Smartphone, ArrowRight, LogOut, Loader2, QrCode, Globe, Link2, 
    Settings2, Radio, CopyPlus, Users, User, CheckSquare, Square,
    Package, ChevronRight, Lock, ChevronUp, ChevronDown, ShoppingCart, AlertCircle,
    CreditCard, ReceiptText, History, RotateCcw, CheckCircle2, Building2,
    Download, Share2, ChevronLeft, Target, MessageSquare, UserCheck, CheckCircle,
    ArrowLeftRight, Filter, MinusCircle, PlusCircle, LayoutGrid, ArrowLeft,
    Home, Database, Zap, AlertTriangle, Ban, Truck, UserCircle, MapPin, Printer, Phone, FileText, Info
} from 'lucide-react';
import { MOCK_INVENTORY } from '../constants';
import { InventoryItem, Customer, Order, OrderItem, Firm, User as UserType } from '../types';
import { fetchLinks, addLinkToDB, updateLinkInDB, deleteLinkFromDB, fetchInventory, fetchGroups, fetchCustomers, fetchOrders, addOrderToDB, fetchFirms } from '../services/db';
import { useNotification } from '../context/NotificationContext';

interface LinkEntry {
    id: string; 
    title: string; 
    code: string; 
    status: 'Enabled' | 'Disabled'; 
    createdDate: string; 
    warehouse: string;
    allowedModels?: string[]; // IDs of items allowed in this link
}

interface LinksManagerProps {
    currentUser: UserType;
}

const LinksManager: React.FC<LinksManagerProps> = ({ currentUser }) => {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [broadcastGroups, setBroadcastGroups] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);
  const [visibilityPane, setVisibilityPane] = useState<'master' | 'link'>('master');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  
  // Active Work State
  const [activeLink, setActiveLink] = useState<LinkEntry | null>(null);
  const [newLinkData, setNewLinkData] = useState({ title: '', warehouse: 'Main Warehouse' });
  const [isSaving, setIsSaving] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  
  // Visibility Control States
  const [vSearch, setVSearch] = useState('');
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [selectedPortalIds, setSelectedPortalIds] = useState<string[]>([]);

  // Broadcast Form State
  const [broadcastType, setBroadcastType] = useState<'groups' | 'customers'>('groups');
  const [selectedBroadcastIds, setSelectedBroadcastIds] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  const filteredLinks = useMemo(() => {
    return links.filter(l => 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [links, searchTerm]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
      setLoading(true);
      const [dbLinks, dbInv, dbGroups, dbCustomers] = await Promise.all([
          fetchLinks(), 
          fetchInventory(), 
          fetchGroups(),
          fetchCustomers()
      ]);
      setLinks(dbLinks);
      setInventory(dbInv.length > 0 ? dbInv : MOCK_INVENTORY);
      setBroadcastGroups(dbGroups);
      setCustomers(dbCustomers);
      setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showNotification('Portal environment synchronized');
  };

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkData.title.trim()) return;
    
    setIsSaving(true);
    const newLink: LinkEntry = {
        id: `link-${Date.now()}`,
        title: newLinkData.title.toUpperCase(),
        code: generateCode(),
        status: 'Enabled',
        createdDate: new Date().toLocaleDateString('en-GB'),
        warehouse: newLinkData.warehouse,
        allowedModels: [] // Start empty
    };

    await addLinkToDB(newLink);
    setLinks([newLink, ...links]);
    setIsSaving(false);
    setIsCreateModalOpen(false);
    setNewLinkData({ title: '', warehouse: 'Main Warehouse' });
    showNotification('Direct access portal generated');
  };

  const handleDuplicate = () => {
    if (!activeLink) return;
    const duplicated: LinkEntry = {
        ...activeLink,
        id: `link-${Date.now()}`,
        title: `${activeLink.title} (COPY)`,
        code: generateCode(),
        createdDate: new Date().toLocaleDateString('en-GB')
    };
    setLinks([duplicated, ...links]);
    addLinkToDB(duplicated);
    showNotification('Portal link duplicated successfully');
  };

  const handleCopy = (link: LinkEntry) => {
    const url = `https://portal.apexflow.app/store/${link.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotification('Portal URL copied');
  };

  const handleToggleStatus = async (link: LinkEntry) => {
    const newStatus = link.status === 'Enabled' ? 'Disabled' : 'Enabled';
    const updated = { ...link, status: newStatus as any };
    setLinks(links.map(l => l.id === link.id ? updated : l));
    await updateLinkInDB(updated);
    showNotification(`Portal access ${newStatus.toLowerCase()}`, newStatus === 'Enabled' ? 'success' : 'error');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently revoke this portal?")) return;
    setLinks(links.filter(l => l.id !== id));
    await deleteLinkFromDB(id);
    showNotification('Access revoked', 'error');
  };

  const handleAddToLink = async () => {
    if (!activeLink || selectedMasterIds.length === 0) return;
    const currentAllowed = activeLink.allowedModels || [];
    const newAllowed = Array.from(new Set([...currentAllowed, ...selectedMasterIds]));
    
    const updated = { ...activeLink, allowedModels: newAllowed };
    setActiveLink(updated);
    setLinks(links.map(l => l.id === activeLink.id ? updated : l));
    setSelectedMasterIds([]);
    await updateLinkInDB(updated);
    showNotification(`${selectedMasterIds.length} items added to visibility`);
  };

  const handleRemoveFromLink = async () => {
    if (!activeLink || selectedPortalIds.length === 0) return;
    const currentAllowed = activeLink.allowedModels || [];
    const newAllowed = currentAllowed.filter(id => !selectedPortalIds.includes(id));
    
    const updated = { ...activeLink, allowedModels: newAllowed };
    setActiveLink(updated);
    setLinks(links.map(l => l.id === activeLink.id ? updated : l));
    setSelectedPortalIds([]);
    await updateLinkInDB(updated);
    showNotification(`${selectedPortalIds.length} items hidden from portal`);
  };

  const masterListItems = useMemo(() => {
    const allowedIds = activeLink?.allowedModels || [];
    return inventory.filter(i => 
        i.status !== 'Inactive' && 
        !allowedIds.includes(i.id) &&
        (i.model.toLowerCase().includes(vSearch.toLowerCase()) || i.brand.toLowerCase().includes(vSearch.toLowerCase()))
    );
  }, [inventory, activeLink, vSearch]);

  const portalListItems = useMemo(() => {
    const allowedIds = activeLink?.allowedModels || [];
    return inventory.filter(i => 
        i.status !== 'Inactive' && 
        allowedIds.includes(i.id) &&
        (i.model.toLowerCase().includes(vSearch.toLowerCase()) || i.brand.toLowerCase().includes(vSearch.toLowerCase()))
    );
  }, [inventory, activeLink, vSearch]);

  const handleSelectAllRecipients = (ids: string[]) => {
      setSelectedBroadcastIds(ids);
  };

  const handleClearAllRecipients = () => {
      setSelectedBroadcastIds([]);
  };

  const handleSendBroadcast = () => {
      if (selectedBroadcastIds.length === 0) {
          showNotification('Please select recipients', 'error');
          return;
      }
      showNotification(`Broadcast initiated for ${selectedBroadcastIds.length} recipients`, 'success');
      setIsBroadcastOpen(false);
      setSelectedBroadcastIds([]);
      setBroadcastMessage('');
      setRecipientSearch('');
  };

  const toggleRecipient = (id: string) => {
      setSelectedBroadcastIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const filteredRecipients = useMemo(() => {
      if (broadcastType === 'groups') {
          return broadcastGroups.filter(g => g.name.toLowerCase().includes(recipientSearch.toLowerCase()));
      }
      return customers.filter(c => c.name.toLowerCase().includes(recipientSearch.toLowerCase()) || c.phone.includes(recipientSearch));
  }, [broadcastType, broadcastGroups, customers, recipientSearch]);

  if (simulationMode && activeLink) {
      const allowedInventory = inventory.filter(i => i.status !== 'Inactive' && (activeLink.allowedModels || []).includes(i.id));
      return (
        <CustomerStoreSimulation 
            storeName={activeLink.title} 
            adminName={currentUser.name}
            status={activeLink.status} 
            onClose={() => setSimulationMode(false)} 
            inventory={allowedInventory} 
            allCustomers={customers} 
        />
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                <Link2 size={28} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Direct Store Portals</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Manage External Ordering Entry Points</p>
            </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 group min-w-[300px]">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Search by portal name..." 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[2.5rem] text-[13px] font-bold uppercase tracking-tight outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-sm" 
                />
            </div>
            <button onClick={handleRefresh} className="p-4 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:rotate-180 duration-700">
                <RefreshCw size={20} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="px-10 py-4 bg-indigo-600 text-white rounded-[2.5rem] font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap">
                <Plus size={16} strokeWidth={4} /> Create Portal
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        {loading ? (
            Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-[380px] bg-white rounded-[2.5rem] border border-slate-200 animate-pulse"></div>
            ))
        ) : filteredLinks.map(link => (
            <div key={link.id} className={`bg-white group rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-50/10 transition-all duration-500 relative overflow-hidden flex flex-col h-full ${link.status === 'Disabled' ? 'grayscale-[0.5] opacity-70 border-slate-300' : ''}`}>
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${link.status === 'Enabled' ? 'bg-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${link.status === 'Enabled' ? 'text-emerald-600' : 'text-rose-500'}`}>{link.status}</span>
                        </div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter transition-colors ${link.status === 'Enabled' ? 'text-slate-900 group-hover:text-indigo-600' : 'text-slate-400'}`}>{link.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Warehouse: {link.warehouse}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleToggleStatus(link)}
                            className={`p-2.5 rounded-xl transition-all shadow-sm border ${link.status === 'Enabled' ? 'bg-white text-slate-400 border-slate-100 hover:text-rose-500 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                            title={link.status === 'Enabled' ? 'Disable Access' : 'Enable Access'}
                        >
                            {link.status === 'Enabled' ? <Ban size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button onClick={() => handleDelete(link.id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-2xl flex items-center gap-3 mb-8 relative z-10">
                    <div className="flex-1 min-w-0 pl-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Portal Code</p>
                        <p className="text-sm font-black text-slate-900 tracking-[0.1em] truncate">{link.code}</p>
                    </div>
                    <button onClick={() => handleCopy(link)} className={`px-4 py-3 rounded-xl transition-all active:scale-90 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${copiedId === link.id ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 shadow-sm border border-slate-100'}`}>
                        {copiedId === link.id ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                        {copiedId === link.id ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <div className="flex items-center gap-4 mb-8 text-[11px] font-black text-slate-500 uppercase tracking-widest relative z-10">
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">
                        <Package size={14} />
                        <span>{(link.allowedModels || []).length} Models Active</span>
                    </div>
                    <span className="text-[10px] text-slate-300">Created: {link.createdDate}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10 mt-auto">
                    <button onClick={() => { setActiveLink(link); setVisibilityPane('master'); setVSearch(''); setSelectedMasterIds([]); setSelectedPortalIds([]); setIsManageModelsOpen(true); }} className="flex items-center justify-center gap-2.5 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all">
                        <Settings2 size={16} /> Visibility
                    </button>
                    <button onClick={() => { setActiveLink(link); setSelectedBroadcastIds([]); setBroadcastMessage(''); setIsBroadcastOpen(true); setRecipientSearch(''); }} className="flex items-center justify-center gap-2.5 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/30 transition-all">
                        <Radio size={16} /> Broadcast
                    </button>
                    <button onClick={() => { setActiveLink(link); handleDuplicate(); }} className="flex items-center justify-center gap-2.5 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all">
                        <CopyPlus size={16} /> Duplicate
                    </button>
                    <button onClick={() => { setActiveLink(link); setSimulationMode(true); }} className="flex items-center justify-center gap-2.5 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                        <Smartphone size={16} /> Simulate
                    </button>
                </div>
                <div className="absolute -top-12 -right-12 p-8 opacity-[0.02] text-slate-900 pointer-events-none">
                    <QrCode size={180} />
                </div>
            </div>
        ))}
      </div>

      {isManageModelsOpen && activeLink && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[160] flex flex-col animate-in fade-in duration-300 no-print">
            <div className="bg-white border-b border-slate-200/60 px-10 py-8 flex flex-col gap-8 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Visibility Logic Console</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Active Portal: <span className="text-indigo-600">{activeLink.title}</span></p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsManageModelsOpen(false)}
                        className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all hover:rotate-90 shadow-sm"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <button 
                            onClick={() => setIsManageModelsOpen(false)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-slate-200 active:scale-95 shadow-sm"
                        >
                            <ArrowLeft size={16} strokeWidth={3} /> Return
                        </button>
                        
                        <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 min-w-[340px] shadow-inner">
                            <button 
                                onClick={() => { setVisibilityPane('master'); setVSearch(''); }}
                                className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${visibilityPane === 'master' ? 'bg-white text-indigo-600 shadow-xl ring-1 ring-black/5 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Database size={14} /> Master Catalog
                            </button>
                            <button 
                                onClick={() => { setVisibilityPane('link'); setVSearch(''); }}
                                className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${visibilityPane === 'link' ? 'bg-white text-indigo-600 shadow-xl ring-1 ring-black/5 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Zap size={14} /> Portal Live
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="relative flex-1 group min-w-[300px]">
                            <input 
                                type="text"
                                value={vSearch}
                                onChange={(e) => setVSearch(e.target.value)}
                                placeholder={`Filter catalog by model or brand...`}
                                className="w-full pl-6 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase tracking-tight outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner"
                            />
                            <div className="absolute right-0 top-0 bottom-0 flex items-center px-4 text-slate-300 group-focus-within:text-indigo-500">
                                <Search size={20} />
                            </div>
                        </div>

                        <div className="h-10 w-px bg-slate-200 hidden lg:block mx-2"></div>

                        <button 
                            disabled={visibilityPane === 'master' ? selectedMasterIds.length === 0 : selectedPortalIds.length === 0}
                            onClick={visibilityPane === 'master' ? handleAddToLink : handleRemoveFromLink}
                            className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 active:scale-95 ${
                                (visibilityPane === 'master' ? selectedMasterIds.length > 0 : selectedPortalIds.length > 0)
                                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-700'
                                : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed'
                            }`}
                        >
                            {visibilityPane === 'master' ? <Plus size={16} strokeWidth={4} /> : <MinusCircle size={16} strokeWidth={4} />}
                            {visibilityPane === 'master' ? 'Add To Portal' : 'Hide From Portal'}
                            {(visibilityPane === 'master' ? selectedMasterIds.length > 0 : selectedPortalIds.length > 0) && (
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{visibilityPane === 'master' ? selectedMasterIds.length : selectedPortalIds.length}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50 p-6">
                <div className="h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                    <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/30 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visibilityPane === 'master' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                {visibilityPane === 'master' ? <Database size={16} /> : <Zap size={16} />}
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                                {visibilityPane === 'master' ? `System Catalog Base - (${masterListItems.length} Available)` : `Live Visibility Buffer - (${portalListItems.length} Visible)`}
                            </h4>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Mode</span>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                <input 
                                    type="checkbox" 
                                    checked={visibilityPane === 'master' ? (selectedMasterIds.length === masterListItems.length && masterListItems.length > 0) : (selectedPortalIds.length === portalListItems.length && portalListItems.length > 0)}
                                    onChange={(e) => {
                                        if (visibilityPane === 'master') setSelectedMasterIds(e.target.checked ? masterListItems.map(i => i.id) : []);
                                        else setSelectedPortalIds(e.target.checked ? portalListItems.map(i => i.id) : []);
                                    }}
                                    className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                                />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">Toggle Global</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <VisibilityTableReplica 
                            items={visibilityPane === 'master' ? masterListItems : portalListItems} 
                            selectedIds={visibilityPane === 'master' ? selectedMasterIds : selectedPortalIds}
                            onSelect={id => {
                                if (visibilityPane === 'master') setSelectedMasterIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                                else setSelectedPortalIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="px-10 py-6 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between no-print shrink-0 border-t border-slate-800 gap-6">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1.5">Environment Status</span>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.7)]"></div>
                            <span className="text-[12px] font-black tracking-widest uppercase">Secured Cloud Link Active</span>
                        </div>
                    </div>
                    
                    <div className="w-px h-10 bg-slate-800 hidden md:block"></div>
                    
                    <div className="flex gap-10">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1.5">Selected Units</span>
                            <span className="text-xl font-black tracking-tighter text-indigo-400">{visibilityPane === 'master' ? selectedMasterIds.length : selectedPortalIds.length} <span className="text-[10px] uppercase font-black text-slate-600 ml-1">Models</span></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1.5">Portal Payload</span>
                            <span className="text-xl font-black tracking-tighter text-white">{(activeLink.allowedModels || []).length} <span className="text-[10px] uppercase font-black text-slate-600 ml-1">Public</span></span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={() => setIsManageModelsOpen(false)}
                        className="flex-1 md:flex-none px-16 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all active:scale-95 border border-indigo-400/20"
                    >
                        Sync & Finalize
                    </button>
                </div>
            </div>
        </div>
      )}

      {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Plus size={24} strokeWidth={3} /></div>
                          <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">New Portal</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Generate Access Link</p></div>
                      </div>
                      <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:rotate-90"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleCreateLink} className="p-10 space-y-8">
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Internal Title / Client Name</label><input required type="text" autoFocus placeholder="e.g. SPECIAL AGENT LINK..." value={newLinkData.title} onChange={e => setNewLinkData({...newLinkData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner"/></div>
                      <div><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Assigned Warehouse</label><select value={newLinkData.warehouse} onChange={e => setNewLinkData({...newLinkData, warehouse: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white transition-all cursor-pointer"><option value="Main Warehouse">Main Warehouse</option><option value="APEXFLOW NORTH">APEXFLOW NORTH</option><option value="APEXFLOW SOUTH">APEXFLOW SOUTH</option></select></div>
                      <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Discard</button><button disabled={isSaving || !newLinkData.title} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">{isSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Generate Secure Link'}</button></div>
                  </form>
              </div>
          </div>
      )}

      {isBroadcastOpen && activeLink && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95">
                  <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-50 shrink-0"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100"><Send size={18} strokeWidth={2.5} /></div><div><h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tight">Broadcast Portal</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{activeLink.title}</p></div></div><button onClick={() => setIsBroadcastOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 transition-all flex items-center justify-center"><X size={20} strokeWidth={2.5}/></button></div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white space-y-10">
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><span className="text-blue-500">•</span> Select Broadcast Target <span className="text-rose-500">*</span></p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { setBroadcastType('groups'); setSelectedBroadcastIds([]); setRecipientSearch(''); }} className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 ${broadcastType === 'groups' ? 'bg-blue-50/50 border-blue-600 shadow-xl shadow-blue-500/10' : 'bg-white border-slate-100 hover:border-slate-200'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${broadcastType === 'groups' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}><Users size={24} /></div><div className="text-center"><p className={`text-[12px] font-black uppercase tracking-tight ${broadcastType === 'groups' ? 'text-blue-600' : 'text-slate-600'}`}>Target Groups</p><p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">Blast to lists</p></div></button>
                            <button onClick={() => { setBroadcastType('customers'); setSelectedBroadcastIds([]); setRecipientSearch(''); }} className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 ${broadcastType === 'customers' ? 'bg-indigo-50/50 border-indigo-600 shadow-xl shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-slate-200'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${broadcastType === 'customers' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}><UserCheck size={24} /></div><div className="text-center"><p className={`text-[12px] font-black uppercase tracking-tight ${broadcastType === 'customers' ? 'text-indigo-600' : 'text-slate-600'}`}>Client Registry</p><p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">Specific reaches</p></div></button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1"><p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><span className="text-blue-500">•</span> {broadcastType === 'groups' ? 'Broadcast Groups' : 'Client Registry'} <span className="text-rose-500">*</span></p><div className="flex gap-2"><button onClick={() => handleSelectAllRecipients(filteredRecipients.map(r => r.id))} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-all">Select Filtered</button><button onClick={handleClearAllRecipients} className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-100 px-2 py-1 rounded-md hover:bg-rose-200 transition-all">Clear All</button></div></div>
                        <div className="relative group"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" /><input type="text" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder={`Find ${broadcastType === 'groups' ? 'groups' : 'customers'}...`} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all" /></div>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">{filteredRecipients.length === 0 ? (<div className="py-12 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">No matching records found</div>) : (filteredRecipients.map(item => { const isSelected = selectedBroadcastIds.includes(item.id); return (<button key={item.id} onClick={() => toggleRecipient(item.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${isSelected ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/5' : 'bg-white/50 border-transparent hover:border-slate-200'}`}><div className="flex items-center gap-4 text-left"><div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{broadcastType === 'groups' ? <Users size={18}/> : <User size={18}/>}</div><div><p className={`text-[13px] font-black uppercase tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{item.name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{broadcastType === 'groups' ? `${item.members.length} Members` : item.phone}</p></div></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>{isSelected && <Check size={14} strokeWidth={4}/>}</div></button>); }))}</div>
                        {selectedBroadcastIds.length > 0 && (<div className="flex items-center gap-2 px-3"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Queue Status: {selectedBroadcastIds.length} Recipients Selected</p></div>)}
                    </div>
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} className="text-blue-500" /> Optional Message Context</p>
                        <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Add a custom remark to the broadcast link..." className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-3xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-8 focus:ring-blue-500/5 transition-all min-h-[120px] resize-none placeholder-slate-300 shadow-inner" />
                    </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0"><button onClick={() => setIsBroadcastOpen(false)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95">Discard</button><button onClick={handleSendBroadcast} disabled={selectedBroadcastIds.length === 0} className="flex-1 px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-200 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"><Send size={16} strokeWidth={3}/><span>Initiate Broadcast</span></button></div>
              </div>
          </div>
      )}
    </div>
  );
};

const VisibilityTableReplica: React.FC<{ items: InventoryItem[], selectedIds: string[], onSelect: (id: string) => void, isPortalPane?: boolean }> = ({ items, selectedIds, onSelect, isPortalPane }) => (
    <div className="bg-white">
        <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead className="sticky top-0 z-20">
                <tr className="bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <th className="w-[100px] px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Select
                    </th>
                    <th className="w-[12%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hardware</th>
                    <th className="w-[10%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Quality</th>
                    <th className="w-[12%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dept</th>
                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Model Spec</th>
                    <th className="w-[15%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Unit Rate</th>
                    <th className="w-[12%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">In Stock</th>
                    <th className="w-[15%] px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">System ID</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="py-32 text-center">
                            <Database size={48} className="text-slate-100 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero items detected in this buffer</p>
                        </td>
                    </tr>
                ) : items.map(item => (
                    <tr 
                        key={item.id} 
                        onClick={() => onSelect(item.id)}
                        className={`cursor-pointer transition-all duration-200 group border-b border-slate-50 ${selectedIds.includes(item.id) ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                        <td className="px-8 py-5">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 group-hover:border-indigo-400'}`}>
                                {selectedIds.includes(item.id) && <Check size={14} strokeWidth={4} className="text-white" />}
                            </div>
                        </td>
                        <td className="px-6 py-5">
                            <span className="inline-flex px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm group-hover:shadow-md transition-all">
                                {item.brand}
                            </span>
                        </td>
                        <td className="px-6 py-5">
                            <span className="inline-flex px-3 py-1 bg-white border border-emerald-200 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm group-hover:shadow-md transition-all">
                                {item.quality}
                            </span>
                        </td>
                        <td className="px-6 py-5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate block">
                                {item.category || 'APEXFLOW'}
                            </span>
                        </td>
                        <td className="px-6 py-5">
                            <span className={`text-[13px] font-black uppercase truncate leading-tight block tracking-tight ${selectedIds.includes(item.id) ? 'text-indigo-600' : 'text-slate-800'}`}>
                                {item.model}
                            </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                            <span className="text-[15px] font-black text-emerald-600 tracking-tighter">₹{item.price.toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-[12px] font-black tracking-widest px-3 py-1 rounded-xl border ${item.quantity <= 0 ? 'bg-rose-50 text-rose-500 border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                                    {item.quantity} PCS
                                </span>
                                {item.quantity <= 0 && (
                                    <span className="text-[8px] font-black text-rose-400 uppercase flex items-center gap-1"><AlertTriangle size={8}/> Candidates for Auto-Return</span>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] font-mono">
                                {item.id.toString().toUpperCase()}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

type SimulationStep = 'login' | 'shop' | 'review' | 'success' | 'profile';

const CustomerStoreSimulation: React.FC<{ storeName: string; adminName: string; status: 'Enabled' | 'Disabled'; onClose: () => void; inventory: InventoryItem[]; allCustomers: Customer[] }> = ({ storeName, adminName, status, onClose, inventory, allCustomers }) => {
    // Added showNotification hook to fixed simulation component
    const { showNotification } = useNotification();
    const [step, setStep] = useState<SimulationStep>('login');
    const [mobile, setMobile] = useState('');
    const [pin, setPin] = useState('');
    const [cart, setCart] = useState<Record<string, number>>({});
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [cargoName, setCargoName] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authenticatedCustomer, setAuthenticatedCustomer] = useState<Customer | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [lastOrderId, setLastOrderId] = useState('');
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    // Portal Specific View States
    const [isStatementOpen, setIsStatementOpen] = useState(false);
    const [viewingTransaction, setViewingTransaction] = useState<Order | null>(null);
    const [viewingItems, setViewingItems] = useState<OrderItem[]>([]);

    useEffect(() => {
        fetchOrders().then(setAllOrders);
    }, []);

    // Fix: Define cartItemIds to resolve "Cannot find name 'cartItemIds'" errors
    const cartItemIds = Object.keys(cart);

    const totalQty = useMemo(() => (Object.values(cart) as number[]).reduce((a, b) => a + b, 0), [cart]);
    const totalAmount = useMemo(() => Object.keys(cart).reduce((sum, id) => {
        const item = inventory.find(i => i.id === id);
        return sum + (item ? item.price * (cart[id] || 0) : 0);
    }, 0), [cart, inventory]);

    const categories = useMemo(() => {
        const counts: Record<string, number> = {};
        inventory.forEach(i => { const cat = i.category || 'General'; counts[cat] = (counts[cat] || 0) + 1; });
        return [{ name: 'All', count: inventory.length }, ...Object.keys(counts).sort().map(c => ({ name: c, count: counts[c] }))];
    }, [inventory]);

    const filteredItems = useMemo(() => {
        return inventory.filter(i => {
            const matchesCat = activeCategory === 'All' || i.category === activeCategory;
            const matchesSearch = i.model.toLowerCase().includes(searchTerm.toLowerCase()) || i.brand.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [inventory, activeCategory, searchTerm]);

    const handleSimulationLogin = async () => { 
        if (mobile.length !== 10) return; 
        if (status === 'Disabled') { setAuthError('STORE CURRENTLY OFFLINE'); return; }
        setIsAuthenticating(true); setAuthError(null); 
        try { 
            const customers = await fetchCustomers();
            const matchedCustomer = customers.find(c => { 
                const cleanedPhone = c.phone.replace(/\D/g, ''); 
                return cleanedPhone.endsWith(mobile) && c.password === pin; 
            }); 
            if (matchedCustomer) { 
                if (matchedCustomer.status !== 'Approved') {
                    setAuthError(`ACCESS DENIED: ACCOUNT ${matchedCustomer.status.toUpperCase()}`);
                } else {
                    setAuthenticatedCustomer(matchedCustomer);
                    setStep('shop');
                }
            } else { setAuthError('INVALID MOBILE OR PIN'); }
        } catch (error) { setAuthError('CLOUD SYNC FAILED'); }
        finally { setIsAuthenticating(false); }
    };

    const handlePlaceOrder = async () => { 
        if (!authenticatedCustomer || totalQty === 0 || !cargoName.trim()) return; 
        setIsPlacingOrder(true); 
        const now = new Date(); 
        const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`; 
        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
        
        const newOrder: Order = { 
            id: orderId, 
            customerName: authenticatedCustomer.name, 
            customerSubtext: authenticatedCustomer.city, 
            orderTime: timestamp, 
            warehouse: 'Online Portal', 
            status: 'fresh', 
            invoiceStatus: 'Pending', 
            orderMode: 'Online', 
            cargoName: cargoName.toUpperCase(), 
            totalAmount: totalAmount 
        }; 

        const orderItems: OrderItem[] = Object.keys(cart).map(id => {
            const item = inventory.find(i => i.id === id)!;
            return {
                id: `${orderId}-${id}`,
                brand: item.brand,
                quality: item.quality,
                category: item.category || 'APEXFLOW',
                model: item.model,
                orderQty: cart[id],
                displayPrice: item.price,
                fulfillQty: 0, 
                finalPrice: item.price
            };
        });

        try { 
            await addOrderToDB(newOrder); 
            localStorage.setItem(`apexflow_items_${orderId}`, JSON.stringify(orderItems));
            setTimeout(() => { 
                setIsPlacingOrder(false); 
                setLastOrderId(orderId);
                setStep('success'); 
            }, 1200); 
        } catch (e) { setIsPlacingOrder(false); } 
    };

    // Profile Calculations
    const firmGroup = useMemo(() => {
        if (!authenticatedCustomer || !authenticatedCustomer.firmId) return [authenticatedCustomer];
        return allCustomers.filter(c => c.firmId === authenticatedCustomer.firmId);
    }, [authenticatedCustomer, allCustomers]);

    const firmGroupNames = useMemo(() => firmGroup.filter(c => c !== null).map(c => c!.name), [firmGroup]);

    const customerLedger = useMemo(() => {
        if (!authenticatedCustomer) return [];
        if (!authenticatedCustomer.firmId) {
            return allOrders.filter(o => o.customerName === authenticatedCustomer.name);
        }
        return allOrders.filter(o => firmGroupNames.includes(o.customerName));
    }, [allOrders, authenticatedCustomer, firmGroupNames]);

    const totalSharedBalance = useMemo(() => {
        if (!authenticatedCustomer) return 0;
        if (!authenticatedCustomer.firmId) return authenticatedCustomer.balance;
        return firmGroup.reduce((sum, c) => sum + (c?.balance || 0), 0);
    }, [authenticatedCustomer, firmGroup]);

    const handleViewTransaction = (order: Order) => {
        let items: OrderItem[] = [];
        if (order.status === 'Return') {
            const stored = localStorage.getItem(`apexflow_gr_items_${order.id}`);
            if (stored) {
                const grData = JSON.parse(stored);
                items = grData.map((g: any, idx: number) => ({
                    id: `gr-${idx}`,
                    brand: g.item.brand,
                    quality: g.item.quality,
                    model: g.item.model,
                    orderQty: g.returnQty,
                    fulfillQty: g.returnQty,
                    finalPrice: g.returnPrice,
                    category: g.item.category || 'APEXFLOW'
                }));
            }
        } else if (order.status !== 'Payment') {
            const stored = localStorage.getItem(`apexflow_items_${order.id}`);
            if (stored) items = JSON.parse(stored);
        }
        setViewingItems(items);
        setViewingTransaction(order);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-[420px] h-[860px] bg-[#f8fafc] rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative border-[12px] border-slate-900">
                <div className="h-8 bg-slate-900 flex items-center justify-center shrink-0"><div className="w-28 h-5 bg-black rounded-b-2xl"></div></div>
                
                {step === 'login' && (
                    <div className="flex-1 flex flex-col p-10 bg-white animate-in fade-in duration-500">
                        <div className="mt-12 text-center">
                            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-100"><Layers size={40} /></div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Portal Login</h2>
                            <p className="text-slate-400 font-black text-[10px] uppercase mt-2 tracking-widest italic">Authenticating Secure Connection</p>
                        </div>
                        <div className="mt-12 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile Identity</label>
                                <div className="relative group">
                                    <Smartphone size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${mobile.length === 10 ? 'text-indigo-500' : 'text-slate-300'}`} />
                                    <input type="tel" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="0000000000" className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border outline-none font-bold text-slate-800 transition-all ${authError ? 'border-rose-500' : 'border-slate-100 focus:border-indigo-400'}`} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure PIN Code</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-black text-slate-800 tracking-[0.3em]" />
                                </div>
                            </div>
                            {authError && <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3"><AlertCircle size={16} className="text-rose-500" /><p className="text-[10px] font-black text-rose-600 uppercase">{authError}</p></div>}
                            <button onClick={handleSimulationLogin} disabled={isAuthenticating || mobile.length !== 10} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4">{isAuthenticating ? <Loader2 className="animate-spin" size={18} /> : <><span>Authorize & Enter</span><ArrowRight size={18}/></>}</button>
                        </div>
                    </div>
                )}

                {step === 'shop' && (
                    <div className="flex-1 flex flex-col bg-[#f8fafc] animate-in slide-in-from-right-10 duration-500 overflow-hidden">
                        <div className="bg-white px-6 py-6 border-b border-slate-100 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Welcome, {authenticatedCustomer?.name}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Order Node Enabled</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Profile Visibility Check: Only Owner sees profile */}
                                    {authenticatedCustomer?.type === 'Owner' && (
                                        <button onClick={() => setStep('profile')} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="View Profile"><UserCircle size={18}/></button>
                                    )}
                                    <button onClick={() => setStep('login')} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-rose-500 transition-colors" title="Logout"><LogOut size={18}/></button>
                                </div>
                            </div>
                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="SEARCH MODELS..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" />
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {categories.map(cat => (
                                    <button key={cat.name} onClick={() => setActiveCategory(cat.name)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${activeCategory === cat.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>
                                        {cat.name} ({cat.count})
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-32">
                            {filteredItems.map(item => (
                                <div key={item.id} className="bg-white px-5 py-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-indigo-200">
                                    <div className="min-w-0 pr-4 flex-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[#f97316] uppercase tracking-widest">
                                                {item.brand} • {item.category}
                                            </span>
                                            <span className="text-[13px] font-black text-[#1e293b] uppercase tracking-tight mt-1 leading-tight">
                                                {item.quality} • {item.model}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="text-[15px] font-black text-[#10b981] tracking-tighter">
                                                ₹{item.price.toFixed(1)}
                                            </span>
                                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Rate</p>
                                        </div>
                                        
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                min="0"
                                                value={cart[item.id] || ''}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setCart(prev => {
                                                        if (val <= 0) {
                                                            const { [item.id]: _, ...rest } = prev;
                                                            return rest;
                                                        }
                                                        return { ...prev, [item.id]: val };
                                                    });
                                                }}
                                                placeholder="Qty"
                                                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-center text-[12px] font-black text-slate-800 outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-300 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalQty > 0 && (
                            <div className="absolute bottom-10 left-6 right-6 p-4 bg-white rounded-3xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><ShoppingCart size={20}/></div>
                                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cartItemIds.length}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cartItemIds.length} Items</p>
                                        <p className="text-[12px] font-black text-slate-700 uppercase leading-none">Qty: {totalQty}</p>
                                    </div>
                                </div>
                                <button onClick={() => setStep('review')} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg shadow-indigo-100">Continue</button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'profile' && authenticatedCustomer && (
                    <div className="flex-1 flex flex-col bg-white animate-in slide-in-from-right-10 duration-500 overflow-hidden relative">
                        <div className="px-6 py-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setStep('shop')} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"><ArrowLeft size={18}/></button>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">My Identity</h3>
                            </div>
                            <button onClick={() => setIsStatementOpen(true)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2" title="View Statement">
                                <ReceiptText size={16}/> Statement
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {/* Profile Info Cards */}
                            <div className="space-y-3">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner group">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><UserCircle size={10} className="text-indigo-500" /> Registered Name</p>
                                    <p className="text-[15px] font-black text-slate-800 uppercase tracking-tight">{authenticatedCustomer.name}</p>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Phone size={10} className="text-indigo-500" /> Contact Phone</p>
                                    <p className="text-[15px] font-black text-slate-800">{authenticatedCustomer.phone}</p>
                                </div>
                                {authenticatedCustomer.firmId && (
                                    <div className="p-5 bg-white border border-indigo-100 rounded-3xl shadow-sm space-y-4">
                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Building2 size={12} /> Firm Members ({firmGroup.length})</p>
                                        <div className="space-y-3">
                                            {firmGroup.map(member => (
                                                <div key={member?.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                    <span className="text-[12px] font-black text-slate-700 uppercase">{member?.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{member?.city}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Credit Balance Card */}
                            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                                        {authenticatedCustomer.firmId ? 'Firm Group Credit' : 'Available Credit Balance'}
                                    </p>
                                    <h3 className="text-5xl font-black tracking-tighter italic">₹{totalSharedBalance.toFixed(1)}</h3>
                                    <div className="mt-6 flex items-center gap-2 text-indigo-300 text-[9px] font-black uppercase tracking-widest">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        Real-time Node Linked
                                    </div>
                                </div>
                                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
                            </div>

                            {/* History Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14}/> Ledger History</h4>
                                    <span className="text-[9px] font-black text-slate-300 uppercase">{customerLedger.length} Records</span>
                                </div>
                                <div className="space-y-3 pb-20">
                                    {customerLedger.length > 0 ? customerLedger.map(order => (
                                        <div key={order.id} onClick={() => handleViewTransaction(order)} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer group active:scale-[0.98]">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-[12px] font-black text-slate-800 tracking-tight uppercase truncate">{order.orderTime.split(' ')[0]}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Ref ID: #{order.id.slice(-8)}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className={`text-[14px] font-black tracking-tighter ${order.status === 'Payment' || order.status === 'Return' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {order.status === 'Payment' || order.status === 'Return' ? '+' : '-'}₹{Math.abs(order.totalAmount || 0).toFixed(1)}
                                                </p>
                                                
                                                <div className="mt-1">
                                                    {order.status === 'fresh' ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-600 uppercase tracking-widest">
                                                                NEW
                                                            </span>
                                                            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                <Info size={8} className="text-amber-500" />
                                                                <p className="text-[7px] text-amber-700 font-black uppercase leading-none text-right">
                                                                    Pending deduction from balance
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest inline-block ${
                                                            order.status === 'Payment' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                            order.status === 'Return' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        }`}>
                                                            {order.status === 'Payment' || order.status === 'Return' ? order.status : 'VERIFIED'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.4em]">No recorded activities</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- SIMULATION: STATEMENT VIEW --- */}
                        {isStatementOpen && (
                            <div className="absolute inset-0 bg-white z-[230] flex flex-col animate-in slide-in-from-bottom-5 duration-500 overflow-hidden">
                                <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setIsStatementOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"><ArrowLeft size={18}/></button>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Account Statement</h3>
                                    </div>
                                    <button onClick={() => window.print()} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg transition-all active:scale-95" title="Print Statement">
                                        <Printer size={18}/>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
                                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm font-sans text-slate-900 min-h-full">
                                        <div className="text-center mb-8">
                                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">ApexFlow Management</h1>
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorized Ledger Intelligence</p>
                                        </div>
                                        <div className="flex justify-between items-start mb-8 text-[10px]">
                                            <div className="space-y-1">
                                                <p className="font-black uppercase tracking-widest text-indigo-500 text-[8px]">Client</p>
                                                <p className="font-black text-slate-800 uppercase">{authenticatedCustomer.name}</p>
                                                <p className="text-slate-400 uppercase">{authenticatedCustomer.city}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-black uppercase tracking-widest text-slate-400 text-[8px]">Closing Balance</p>
                                                <p className="text-lg font-black text-emerald-600 tracking-tighter">₹{totalSharedBalance.toFixed(1)}</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-[10px]">
                                                <thead><tr className="border-y border-slate-900 bg-slate-50/50"><th className="py-2 px-1 font-black uppercase tracking-widest">Date</th><th className="py-2 px-1 font-black uppercase tracking-widest text-right">Impact</th></tr></thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {customerLedger.map((o, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-3 px-1">
                                                                <p className="font-black text-slate-800">{o.orderTime.split(' ')[0]}</p>
                                                                <p className="text-[8px] font-black text-slate-400 uppercase">#{o.id.slice(-8)} • {o.status === 'fresh' ? 'NEW' : (o.status === 'Payment' || o.status === 'Return' ? o.status : 'ORDER')}</p>
                                                            </td>
                                                            <td className={`py-3 px-1 text-right font-black ${o.status === 'Payment' || o.status === 'Return' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                {o.status === 'Payment' || o.status === 'Return' ? '+' : '-'}₹{Math.abs(o.totalAmount || 0).toFixed(1)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">End of Current Statement Cycle</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- SIMULATION: TRANSACTION PREVIEW --- */}
                        {viewingTransaction && (
                            <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-md z-[240] flex flex-col animate-in slide-in-from-right-5 duration-500 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col items-center">
                                    <div className="bg-white w-full max-w-[550px] shadow-2xl p-8 md:p-12 border border-slate-200 font-sans text-slate-900 flex flex-col min-h-full my-4">
                                        <div className="text-center mb-10">
                                            <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">ApexFlow Management</h1>
                                            <div className="h-1 w-24 bg-slate-900 mx-auto my-1"></div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Authorized Distribution Channel</p>
                                        </div>

                                        <div className="flex justify-between items-start mb-8 text-[11px] gap-4">
                                            <div className="space-y-1">
                                                <p className="font-black uppercase tracking-widest text-slate-400 text-[8px] mb-0.5">BILL TO</p>
                                                <p className="font-black text-slate-900 uppercase text-sm">{viewingTransaction.customerName}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-black uppercase tracking-widest text-slate-400 text-[8px] mb-0.5">INVOICE META</p>
                                                <p className="font-black text-slate-700 uppercase">Date : <span className="text-slate-900">{viewingTransaction.orderTime.split(' ')[0]}</span></p>
                                                <p className="font-black text-slate-700 uppercase">No : <span className="text-slate-900">{viewingTransaction.orderTime.split(' ')[0]}/{viewingTransaction.id.slice(-8)}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            {viewingTransaction.status !== 'Payment' ? (
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="border-y-2 border-slate-900 bg-white text-[9px] font-black uppercase tracking-widest text-slate-900">
                                                            <th className="py-2.5 text-left w-[55%]">DESCRIPTION</th>
                                                            <th className="py-2.5 text-center w-[10%]">QTY</th>
                                                            <th className="py-2.5 text-center w-[15%]">RATE</th>
                                                            <th className="py-2.5 text-right w-[20%]">TOTAL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {viewingItems.map((item, i) => (
                                                            <tr key={i} className="bg-white text-[10px] font-black uppercase leading-tight text-slate-900">
                                                                <td className="py-3 pr-2">
                                                                    {item.brand} {item.quality} {item.model} {item.category}
                                                                </td>
                                                                <td className="py-3 text-center">{item.fulfillQty || item.orderQty}</td>
                                                                <td className="py-3 text-center">₹{item.finalPrice.toFixed(1)}</td>
                                                                <td className="py-3 text-right">₹{((item.fulfillQty || item.orderQty) * item.finalPrice).toFixed(1)}</td>
                                                            </tr>
                                                        ))}
                                                        {viewingItems.length === 0 && (<tr><td colSpan={4} className="py-10 text-center text-[10px] text-slate-300 uppercase italic">No items identified in this log</td></tr>)}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 border-slate-900 bg-white font-black text-slate-900">
                                                            <td className="py-3 px-1 text-[11px] uppercase tracking-widest">GRAND TOTAL</td>
                                                            <td className="py-3 text-center text-[11px]">{viewingItems.reduce((s, i) => s + (i.fulfillQty || i.orderQty), 0)}</td>
                                                            <td className="py-3"></td>
                                                            <td className="py-3 text-right text-[15px] tracking-tighter text-indigo-600">
                                                                ₹{Math.abs(viewingTransaction.totalAmount || 0).toFixed(1)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            ) : (
                                                <div className="py-10 text-center border-y border-slate-100">
                                                    <p className="text-[12px] font-black text-slate-800 uppercase">Account Credit Voucher</p>
                                                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase italic">Processed at Node: {viewingTransaction.warehouse}</p>
                                                    <p className="text-xl font-black text-emerald-600 mt-4 tracking-tighter">₹{Math.abs(viewingTransaction.totalAmount || 0).toFixed(1)}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center mt-12 space-y-1">
                                            <h3 className="text-[13px] font-black tracking-widest text-slate-900 uppercase">THANK YOU</h3>
                                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">COMPUTER GENERATED DOCUMENT.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-center gap-4 shrink-0 no-print">
                                    <button 
                                        onClick={() => showNotification('Download initialized...', 'info')}
                                        className="flex items-center justify-center gap-2 px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                                    >
                                        <FileText size={16} /> DOWNLOAD
                                    </button>
                                    <button 
                                        onClick={() => window.print()}
                                        className="flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                    >
                                        <Printer size={16} /> PRINT
                                    </button>
                                    <button 
                                        onClick={() => setViewingTransaction(null)}
                                        className="px-10 py-3 bg-white border border-slate-300 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                                    >
                                        CLOSE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'review' && (
                    <div className="flex-1 flex flex-col bg-white animate-in slide-in-from-right-10 duration-500">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-4">
                            <button onClick={() => setStep('shop')} className="p-2 bg-slate-50 text-slate-400 rounded-xl"><ArrowLeft size={18}/></button>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Finalize Order</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="space-y-3">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Truck size={14} className="text-indigo-500"/> Transport Preference <span className="text-rose-500">*</span></p>
                                <input autoFocus type="text" value={cargoName} onChange={e => setCargoName(e.target.value)} placeholder="e.g. BLUE DART / PERSONAL BUS..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black uppercase outline-none focus:bg-white focus:border-indigo-400 shadow-inner" />
                            </div>
                            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-6 space-y-6">
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.keys(cart).map(id => {
                                        const item = inventory.find(i => i.id === id)!;
                                        return (
                                            <div key={id} className="flex justify-between items-center text-[12px] font-black text-slate-700 uppercase">
                                                <span className="truncate max-w-[140px] tracking-tight">{item.model}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-slate-400 font-bold">{cart[id]}x</span>
                                                    <span className="text-indigo-600 font-bold w-16 text-right">₹{(item.price * cart[id]).toFixed(1)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-6 border-t border-slate-200 border-dashed space-y-4">
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Total Units</span><span>{totalQty} Pcs</span></div>
                                    <div className="flex justify-between items-baseline pt-2">
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Bill Amount</span>
                                        <span className="text-4xl font-black text-emerald-600 tracking-tighter">₹{totalAmount.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-600 text-center leading-relaxed uppercase">By placing this order, you authorize the dispatch node to process this shipment immediately.</p>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-50">
                            <button onClick={handlePlaceOrder} disabled={isPlacingOrder || !cargoName.trim()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                {isPlacingOrder ? <Loader2 className="animate-spin" size={20}/> : <><span>Commit Order</span><ArrowRight size={20}/></>}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white animate-in zoom-in-95 duration-500 text-center">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-50 animate-bounce"><Check size={48} strokeWidth={4}/></div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Order Placed</h2>
                        <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest mt-3">Ref ID: #{lastOrderId}</p>
                        <div className="w-full h-px bg-slate-100 my-8"></div>
                        <p className="text-[13px] font-black text-slate-600 leading-relaxed uppercase tracking-tight">Your order has been broadcasted to the warehouse node and will be processed immediately.</p>
                        <button onClick={() => { setStep('shop'); setCart({}); setCargoName(''); }} className="mt-10 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">Back to Store</button>
                    </div>
                )}

                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-slate-900/10 hover:bg-slate-900/20 rounded-full flex items-center justify-center text-slate-900/40 backdrop-blur-sm z-[210] transition-all"><X size={20}/></button>
            </div>
        </div>
    );
};

export default LinksManager;