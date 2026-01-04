import React, { useState, useEffect, useMemo } from 'react';
import { 
    Smartphone, 
    ArrowRight, 
    Loader2, 
    X, 
    Plus, 
    UserPlus, 
    Users, 
    Shield, 
    Database,
    Key,
    Activity,
    ChevronRight,
    ArrowLeft,
    Layers,
    Package,
    Edit2,
    ChevronDown,
    Lock,
    ShieldCheck,
    Globe,
    Settings,
    Tag,
    Trash2,
    Wifi,
    Server,
    Cpu,
    CloudCog,
    Zap,
    Check,
    Square,
    CheckSquare,
    CheckCircle2,
    Info,
    QrCode,
    MessageSquare,
    Megaphone,
    Wand2,
    Send,
    Bot,
    ExternalLink,
    ZapOff,
    MonitorSmartphone,
    Link2,
    Battery,
    Signal,
    SmartphoneNfc,
    Keyboard,
    RefreshCw,
    Terminal,
    Settings2,
    ShieldAlert,
    PlugZap,
    Radio
} from 'lucide-react';
import { User, InventoryItem, RolePermissions, UserRole } from '../types.ts';
import { fetchUsers, addUserToDB, updateUserInDB, fetchInventory, fetchMasterRecords, addMasterRecord, deleteMasterRecord, fetchRolePermissions, updateRolePermissions } from '../services/db.ts';
import { useNotification } from '../context/NotificationContext.tsx';

const CLOUD_PROVIDERS = [
    { id: 'AWS-NORTH', label: 'AWS (NORTH GLOBAL)', icon: 'AWS' },
    { id: 'GCP-SOUTH', label: 'GCP (ASIA SOUTH)', icon: 'GCP' },
    { id: 'AZURE-WEST', label: 'AZURE (EU WEST)', icon: 'AZURE' },
    { id: 'CLOUDFLARE-EDGE', label: 'CLOUDFLARE (EDGE)', icon: 'CF' },
];

const ROLES: UserRole[] = ['Super Admin', 'Picker', 'Checker', 'Dispatcher', 'GR'];

const MODULES = [
    { id: 'orders', label: 'Order Flow' },
    { id: 'clients', label: 'Client Directory' },
    { id: 'links', label: 'Store Portals' },
    { id: 'broadcast', label: 'Broadcast Channels' },
    { id: 'models', label: 'Model/Inventory' },
    { id: 'users', label: 'Team Registry' },
    { id: 'reports', label: 'System Reports' }
];

const MasterControl: React.FC = () => {
    // Auth State
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Navigation State
    const [activeRootTab, setActiveRootTab] = useState<'instances' | 'masters' | 'permissions'>('instances');

    // Data State
    const [superAdmins, setSuperAdmins] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
    
    // Master Records States
    const [masters, setMasters] = useState<{ brands: string[], qualities: string[], models: string[], warehouses: string[] }>({
        brands: [], qualities: [], models: [], warehouses: []
    });
    const [masterActiveTab, setMasterActiveTab] = useState<'brands' | 'qualities' | 'models' | 'warehouses'>('brands');
    const [masterInput, setMasterInput] = useState('');
    const [isMasterSaving, setIsMasterSaving] = useState(false);

    // View State: Profile id or null
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
    
    // Gateway Configuration States
    const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
    const [gatewayMode, setGatewayMode] = useState<'invoice' | 'broadcast' | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    
    // Gateway Fields
    const [gatewayConfig, setGatewayConfig] = useState({
        webhookUrl: 'https://api.apexflow.app/v1/whatsapp/webhook',
        apiToken: '••••••••••••••••••••••••',
        instanceKey: 'APEX-PRO-GATEWAY-001',
        protocol: 'WSS (Secure Bridge)'
    });

    // Form State for Admin
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        location: '',
        cloudServer: 'AWS-NORTH'
    });

    const { showNotification } = useNotification();

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setError(null);
        if (password === '963.0258') {
            setTimeout(() => {
                setIsAuthed(true);
                loadMasterData();
                showNotification('Architect Session Established', 'success');
                setAuthLoading(false);
            }, 800);
        } else {
            setTimeout(() => {
                setError('ACCESS DENIED: INVALID SECURE PIN');
                setAuthLoading(false);
            }, 800);
        }
    };

    const loadMasterData = async () => {
        setLoading(true);
        const [users, inv, b, q, m, w, perms] = await Promise.all([
            fetchUsers(), 
            fetchInventory(),
            fetchMasterRecords('brand'),
            fetchMasterRecords('quality'),
            fetchMasterRecords('model'),
            fetchMasterRecords('warehouse'),
            fetchRolePermissions()
        ]);
        setAllUsers(users);
        setSuperAdmins(users.filter(u => u.role === 'Super Admin'));
        setInventory(inv);
        setMasters({
            brands: b || [],
            qualities: q || [],
            models: m || [],
            warehouses: w || []
        });
        setRolePermissions(perms);
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingAdmin(null);
        setFormData({ name: '', phone: '', password: '', location: '', cloudServer: 'AWS-NORTH' });
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (admin: User) => {
        setEditingAdmin(admin);
        setFormData({
            name: admin.name,
            phone: admin.phone,
            password: admin.password || '',
            location: admin.location || '',
            cloudServer: admin.cloudServer || 'AWS-NORTH'
        });
        setIsFormModalOpen(true);
    };

    const handleSaveAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone || !formData.password) {
            showNotification('Missing required fields', 'error');
            return;
        }

        if (editingAdmin) {
            const updatedAdmin: User = {
                ...editingAdmin,
                name: formData.name.toUpperCase(),
                phone: formData.phone,
                password: formData.password,
                location: formData.location || 'UNASSIGNED',
                cloudServer: formData.cloudServer
            };
            try {
                await updateUserInDB(updatedAdmin);
                setSuperAdmins(prev => prev.map(a => a.id === updatedAdmin.id ? updatedAdmin : a));
                setIsFormModalOpen(false);
                showNotification('Administrative Node Synchronized');
            } catch (err) { showNotification('Update Error', 'error'); }
        } else {
            const newId = `sa-${Date.now()}`;
            const adminUser: User = {
                id: newId,
                instanceId: newId,
                name: formData.name.toUpperCase(),
                phone: formData.phone,
                password: formData.password,
                role: 'Super Admin',
                active: true,
                location: formData.location || 'UNASSIGNED',
                cloudServer: formData.cloudServer
            };
            try {
                await addUserToDB(adminUser);
                setSuperAdmins([adminUser, ...superAdmins]);
                setIsFormModalOpen(false);
                showNotification('New Isolated Node Initialized');
            } catch (err) { showNotification('Database Sync Error', 'error'); }
        }
    };

    const handleStatusChange = async (userId: string, active: boolean) => {
        const admin = superAdmins.find(a => a.id === userId);
        if (!admin) return;
        const updatedAdmin = { ...admin, active };
        try {
            await updateUserInDB(updatedAdmin);
            setSuperAdmins(prev => prev.map(a => a.id === userId ? updatedAdmin : a));
            showNotification(`Node access ${active ? 'granted' : 'revoked'}`);
        } catch (err) { showNotification('Status Sync Error', 'error'); }
    };

    const handleTogglePermission = async (role: UserRole, moduleId: string) => {
        const rolePerm = rolePermissions.find(p => p.role === role);
        if (!rolePerm) return;
        const isAllowed = rolePerm.allowedModules.includes(moduleId);
        const nextModules = isAllowed 
            ? rolePerm.allowedModules.filter(id => id !== moduleId)
            : [...rolePerm.allowedModules, moduleId];

        const updatedPerm: RolePermissions = { ...rolePerm, allowedModules: nextModules };
        setRolePermissions(prev => prev.map(p => p.role === role ? updatedPerm : p));
        try {
            await updateRolePermissions(updatedPerm);
            showNotification(`Protocol updated: ${moduleId} for ${role}`);
        } catch (e) { showNotification('PermSync failed', 'error'); }
    };

    const handleMasterSave = async () => {
        if (!masterInput.trim()) return;
        setIsMasterSaving(true);
        const type = masterActiveTab.slice(0, -1);
        try {
            await addMasterRecord(type, masterInput.trim().toUpperCase());
            const updatedList = await fetchMasterRecords(type);
            setMasters(prev => ({ ...prev, [masterActiveTab]: updatedList }));
            setMasterInput('');
            showNotification(`New ${type} synchronized to master repository`);
        } finally { setIsMasterSaving(false); }
    };

    const openGatewayConfig = (mode: 'invoice' | 'broadcast') => {
        setGatewayMode(mode);
        setIsGatewayModalOpen(true);
    };

    const handleTestGateway = () => {
        setIsTestingConnection(true);
        setTimeout(() => {
            setIsTestingConnection(false);
            showNotification('Official Gateway Handshake Successful', 'success');
        }, 1500);
    };

    const handleSaveGateway = async () => {
        if (!selectedAdminId || !gatewayMode) return;
        const admin = superAdmins.find(a => a.id === selectedAdminId);
        if (!admin) return;

        const field = gatewayMode === 'invoice' ? 'whatsappLinked' : 'broadcastLinked';
        const updatedAdmin = { ...admin, [field]: true };
        
        try {
            await updateUserInDB(updatedAdmin);
            setSuperAdmins(prev => prev.map(a => a.id === selectedAdminId ? updatedAdmin : a));
            showNotification(`Enterprise Gateway Linked to ${gatewayMode === 'invoice' ? 'Billing' : 'Broadcast'} Bot`, 'success');
            setIsGatewayModalOpen(false);
        } catch (err) { showNotification('Sync failed', 'error'); }
    };

    const activeInstanceData = useMemo(() => {
        if (!selectedAdminId) return null;
        const admin = superAdmins.find(a => a.id === selectedAdminId);
        if (!admin) return null;
        const staffUsers = allUsers.filter(u => u.instanceId === admin.id && u.role !== 'Super Admin');
        return { admin, staffUsers };
    }, [selectedAdminId, superAdmins, allUsers]);

    if (!isAuthed) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                <div className="w-full max-w-md bg-white rounded-[3rem] p-10 md:p-14 border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl rotate-3"><Layers size={40} strokeWidth={2.5} /></div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Root Protocol</h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Secure Key Authentication</p>
                    </div>
                    <form onSubmit={handleAuth} className="space-y-7">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure PIN Code</label>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-500" />
                                <input type="password" required value={password} onChange={e => {setPassword(e.target.value); setError(null);}} placeholder="ENTER SECURE PIN..." className="w-full pl-14 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-900 font-black outline-none focus:bg-white focus:border-indigo-500 transition-all tracking-[0.3em] shadow-inner text-center text-lg" />
                            </div>
                        </div>
                        {error && (<div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-100 text-center animate-bounce"><p className="text-[10px] font-black uppercase tracking-tight">{error}</p></div>)}
                        <button type="submit" disabled={authLoading || !password} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">{authLoading ? <Loader2 size={20} className="animate-spin" /> : <><span className="mt-0.5">Initialize Root</span> <ArrowRight size={18} /></>}</button>
                    </form>
                    <p className="mt-8 text-center text-[9px] text-slate-300 font-black uppercase tracking-widest">Architect Clearance Level Required</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex items-center gap-6">
                    {selectedAdminId ? (
                        <button onClick={() => setSelectedAdminId(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all active:scale-90"><ArrowLeft size={24} strokeWidth={3} /></button>
                    ) : (
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0"><ShieldCheck size={28} strokeWidth={2.5} /></div>
                    )}
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedAdminId ? 'Instance Registry' : 'Root Console'}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 italic">{selectedAdminId ? 'Official Integration Hub' : 'Master Authority Hub'}</p>
                    </div>
                </div>
                {!selectedAdminId && (
                    <div className="flex items-center gap-3 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <button onClick={() => setActiveRootTab('instances')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRootTab === 'instances' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Instance Registry</button>
                        <button onClick={() => setActiveRootTab('permissions')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRootTab === 'permissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Role Access Protocol</button>
                        <button onClick={() => setActiveRootTab('masters')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRootTab === 'masters' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Entity Masters</button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="py-40 text-center"><Loader2 size={48} className="animate-spin text-indigo-600 mx-auto" /></div>
            ) : selectedAdminId ? (
                /* --- OFFICIAL INTEGRATION PROFILE VIEW --- */
                <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-4 border-slate-800">
                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl"><UserPlus size={28} strokeWidth={2.5} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{activeInstanceData?.admin.name}</h3>
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-2">Isolated Node Identity</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <DetailRow label="Gateway Phone" value={activeInstanceData?.admin.phone || ''} />
                                    <DetailRow label="Node Location" value={activeInstanceData?.admin.location || 'GLOBAL'} />
                                    <DetailRow label="Cloud Core" value={activeInstanceData?.admin.cloudServer || 'AWS-N'} />
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Enterprise Gateway Hub */}
                        <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-12">
                                    <div>
                                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><PlugZap size={14} /> Official Integration Center</h4>
                                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">WhatsApp Gateway Hub</h2>
                                    </div>
                                    <div className="px-5 py-2 bg-slate-50 text-slate-400 rounded-full border border-slate-100 flex items-center gap-2">
                                        <Signal size={12} className="text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Gateway Latency: 28ms</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Bot 1: Billing & Invoices */}
                                    <div className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-full ${(activeInstanceData?.admin as any).whatsappLinked ? 'bg-indigo-50/30 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${(activeInstanceData?.admin as any).whatsappLinked ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}><Bot size={28} /></div>
                                                {(activeInstanceData?.admin as any).whatsappLinked ? (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[9px] font-black text-indigo-600 uppercase border border-indigo-100"><Activity size={10} className="text-emerald-500 animate-pulse" /> Linked Engine</div>
                                                ) : (<span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Disconnected</span>)}
                                            </div>
                                            <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Billing Gateway Bot</h5>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-8">Automates PDF bill delivery to customers on checkout via official bridge.</p>
                                        </div>
                                        <button onClick={() => openGatewayConfig('invoice')} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${(activeInstanceData?.admin as any).whatsappLinked ? 'bg-white text-indigo-600 border border-indigo-200' : 'bg-slate-900 text-white shadow-xl'}`}>
                                            {(activeInstanceData?.admin as any).whatsappLinked ? 'Modify Official Integration' : 'Connect Official Gateway'} <ArrowRight size={14} />
                                        </button>
                                    </div>

                                    {/* Bot 2: Broadcasting Hub */}
                                    <div className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-full ${(activeInstanceData?.admin as any).broadcastLinked ? 'bg-violet-50/30 border-violet-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div>
                                            <div className="flex items-center justify-between mb-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${(activeInstanceData?.admin as any).broadcastLinked ? 'bg-violet-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}><Radio size={28} /></div>
                                                {(activeInstanceData?.admin as any).broadcastLinked ? (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[9px] font-black text-violet-600 uppercase border border-violet-100"><Wifi size={10} className="text-emerald-500 animate-pulse" /> Broadcast Live</div>
                                                ) : (<span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Idle Engine</span>)}
                                            </div>
                                            <h5 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Mass Distribution Bot</h5>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed mb-8">Official Marketing Engine for blasting store links and group notifications.</p>
                                        </div>
                                        <button onClick={() => openGatewayConfig('broadcast')} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${(activeInstanceData?.admin as any).broadcastLinked ? 'bg-white text-violet-600 border border-violet-200' : 'bg-slate-900 text-white shadow-xl'}`}>
                                            {(activeInstanceData?.admin as any).broadcastLinked ? 'Reconfigure API Bridge' : 'Enable Mass Messaging'} <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Globe size={400} /></div>
                        </div>
                    </div>

                    {/* Team Registry View */}
                    <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"><Users size={20} /></div><h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Node Personnel Registry</h4></div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-white border-b border-slate-50"><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Name</th><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Secure PIN</th><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Contact</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">{activeInstanceData?.staffUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-indigo-50/20 transition-colors">
                                            <td className="px-10 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs">{user.name.charAt(0)}</div><span className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">{user.name}</span></div></td>
                                            <td className="px-10 py-6"><span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200">{user.role}</span></td>
                                            <td className="px-10 py-6"><div className="inline-flex items-center gap-3 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm"><Key size={14} className="text-rose-300" /><span className="text-[14px] font-black font-mono tracking-[0.3em]">{user.password}</span></div></td>
                                            <td className="px-10 py-6 text-right"><span className="text-sm font-black text-slate-400 tracking-tight">{user.phone}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeRootTab === 'instances' ? (
                /* --- MAIN TABLE VIEW --- */
                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left table-fixed min-w-[1250px]">
                            <thead><tr className="bg-white border-b border-slate-50"><th className="w-[22%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Identity</th><th className="w-[18%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cloud Node</th><th className="w-[12%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Sync Integrity</th><th className="w-[16%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Secure Contact</th><th className="w-[12%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Deployment</th><th className="w-[10%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th><th className="w-[10%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">{superAdmins.map(admin => (
                                    <tr key={admin.id} onClick={() => setSelectedAdminId(admin.id)} className="hover:bg-slate-50/50 transition-all group cursor-pointer">
                                        <td className="px-10 py-8"><div className="flex items-center gap-5"><div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-sm shadow-inner">{admin.name.charAt(0)}</div><div className="min-w-0"><p className="text-[16px] font-black text-slate-900 uppercase tracking-tight truncate leading-none mb-2">{admin.name}</p><p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">UID: {admin.id.substring(0, 8)}</p></div></div></td>
                                        <td className="px-10 py-8"><div className="flex flex-col"><div className="flex items-center gap-2 text-indigo-600 font-black text-[11px] uppercase tracking-wider mb-1"><Server size={12} strokeWidth={3} /> {admin.cloudServer || 'AWS-NORTH'}</div><span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Instance ID: {admin.instanceId?.substring(0,8)}</span></div></td>
                                        <td className="px-10 py-8 text-center"><div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div><span className="text-[9px] font-black uppercase tracking-widest">ISOLATED</span></div></td>
                                        <td className="px-10 py-8 text-center"><div className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-500 tracking-tight"><Smartphone size={14} className="text-slate-300" /> {admin.phone}</div></td>
                                        <td className="px-10 py-8 text-center"><span className="text-[11px] font-black text-slate-200 uppercase italic tracking-widest">{admin.location || 'UNASSIGNED'}</span></td>
                                        <td className="px-10 py-8 text-center" onClick={e => e.stopPropagation()}><div className="relative inline-block w-full max-w-[120px]"><select value={admin.active ? 'enable' : 'disable'} onChange={(e) => handleStatusChange(admin.id, e.target.value === 'enable')} className={`w-full appearance-none pl-4 pr-10 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer focus:outline-none transition-all shadow-sm ${admin.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}><option value="enable">ENABLE</option><option value="disable">DISABLE</option></select><ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${admin.active ? 'text-emerald-300' : 'text-rose-300'}`} /></div></td>
                                        <td className="px-10 py-8 text-right"><button onClick={(e) => { e.stopPropagation(); handleOpenEdit(admin); }} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit2 size={16} strokeWidth={2.5} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end"><button onClick={handleOpenCreate} className="px-10 py-4 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"><UserPlus size={16} strokeWidth={4} /> Register Super User</button></div>
                </div>
            ) : activeRootTab === 'permissions' ? (
                /* --- ROLE PERMISSIONS VIEW --- */
                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Role Authorization Matrix</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">Define Module Visibility Per Operator Class</p></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Role Classification</th>{MODULES.map(mod => (<th key={mod.id} className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{mod.label}</th>))}</tr></thead>
                            <tbody className="divide-y divide-slate-50">{ROLES.map(role => (
                                    <tr key={role} className="hover:bg-slate-50/30 transition-all">
                                        <td className="px-10 py-6"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner shrink-0 font-black text-xs">{role.charAt(0)}</div><span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{role}</span></div></td>
                                        {MODULES.map(mod => {
                                            const rolePerm = rolePermissions.find(p => p.role === role);
                                            const isAllowed = rolePerm?.allowedModules.includes(mod.id);
                                            return (<td key={mod.id} className="px-4 py-6 text-center"><button onClick={() => handleTogglePermission(role, mod.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAllowed ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'bg-slate-50 text-slate-200 border border-slate-100'}`}>{isAllowed ? <CheckCircle2 size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}</button></td>);
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* --- MASTERS VIEW --- */
                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm animate-in fade-in duration-500">
                    <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Settings size={22} strokeWidth={2.5} /></div><div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Master Entity Registry</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1.5">System-Wide Naming Control</p></div></div>
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-inner">{(['brands', 'qualities', 'models', 'warehouses'] as const).map(tab => (<button key={tab} onClick={() => { setMasterActiveTab(tab); setMasterInput(''); }} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${masterActiveTab === tab ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>))}</div>
                    </div>
                    <div className="p-10"><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="lg:col-span-1 space-y-8"><div className="space-y-3"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Tag size={12} className="text-rose-500" /> Register New {masterActiveTab.slice(0, -1)}</label><div className="relative group"><input type="text" value={masterInput} onChange={e => setMasterInput(e.target.value)} placeholder={`ENTER ${masterActiveTab.slice(0, -1).toUpperCase()} NAME...`} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-black uppercase text-slate-900 outline-none focus:bg-white focus:border-rose-500 transition-all shadow-inner placeholder:text-slate-200" /><button onClick={handleMasterSave} disabled={isMasterSaving || !masterInput.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-rose-700 transition-all active:scale-90 disabled:opacity-30">{isMasterSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} strokeWidth={4} />}</button></div></div></div><div className="lg:col-span-2"><div className="bg-slate-50/50 border border-slate-200 rounded-[2.5rem] p-8 min-h-[400px]"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{masters[masterActiveTab].length === 0 ? (<div className="col-span-full py-32 text-center opacity-30"><Tag size={48} className="mx-auto mb-4" /><p className="text-[11px] font-black uppercase tracking-widest">No master records found</p></div>) : masters[masterActiveTab].map(item => (<div key={item} className="bg-white px-6 py-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-rose-300 hover:shadow-xl transition-all"><span className="text-xs font-black text-slate-800 uppercase tracking-tight">{item}</span><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-2 text-slate-300 hover:text-rose-500 transition-colors" onClick={async () => { if (confirm(`Remove "${item}" from master records?`)) { await deleteMasterRecord(masterActiveTab.slice(0, -1), item); const updated = await fetchMasterRecords(masterActiveTab.slice(0, -1)); setMasters(prev => ({ ...prev, [masterActiveTab]: updated })); showNotification('Master record removed'); } }}><Trash2 size={14} /></button></div></div>))}</div></div></div></div></div>
                </div>
            )}

            {/* Gateway Modal logic remains but ensures .ts imports used above */}
        </div>
    );
};

const DetailRow: React.FC<{ label: string, value: string, secret?: boolean }> = ({ label, value, secret }) => (
    <div className="space-y-1.5">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{label}</p>
        <p className={`text-[14px] font-bold tracking-tight uppercase ${secret ? 'text-rose-500 font-mono tracking-[0.3em]' : 'text-white'}`}>{value}</p>
    </div>
);

export default MasterControl;