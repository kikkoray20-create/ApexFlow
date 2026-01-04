import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { 
    Phone, 
    Edit2, 
    ChevronDown, 
    Lock, 
    X, 
    MapPin, 
    UserCog, 
    Plus, 
    RefreshCw, 
    Search, 
    Loader2, 
    Shield, 
    Users, 
    Smartphone,
    ShieldCheck
} from 'lucide-react';
import { fetchUsers, addUserToDB, updateUserInDB, deleteUserFromDB } from '../services/db.ts';
import { useNotification } from '../context/NotificationContext.tsx';

interface UserManagementProps {
    currentUser?: User; // Passed to get instanceId
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'Picker' as UserRole,
    active: true,
    location: '',
  });

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    // Fetch only users for this Super Admin's instance
    const data = await fetchUsers(currentUser?.instanceId);
    setUsers(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
    showNotification('Team permissions synchronized');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      password: '',
      role: 'Picker',
      active: true,
      location: '',
    });
    setEditingUser(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      phone: user.phone,
      password: user.password || '',
      role: user.role,
      active: user.active,
      location: user.location || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.phone || !formData.password) {
      showNotification('Fill all required identity fields', 'error');
      return;
    }

    try {
        if (editingUser) {
          const updatedUser: User = { ...editingUser, ...formData };
          setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
          showNotification('Operator profile updated');
          setIsModalOpen(false);
          await updateUserInDB(updatedUser);
        } else {
          const newUser: User = {
            id: `u${Date.now()}`, 
            instanceId: currentUser?.instanceId, // INJECT INSTANCE ID
            ...formData
          };
          setUsers(prev => [...prev, newUser]);
          showNotification('New operator enlisted successfully');
          setIsModalOpen(false);
          await addUserToDB(newUser);
        }
    } catch (error) {
        showNotification('Failed to update secure records', 'error');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updatedUser = { ...user, active: newStatus === 'active' };
    setUsers(currentUsers => currentUsers.map(u => u.id === userId ? updatedUser : u));
    await updateUserInDB(updatedUser);
    showNotification(`Operator status: ${newStatus.toUpperCase()}`);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 shrink-0"><UserCog size={28} strokeWidth={2.5} /></div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Team Registry</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Managing Isolated Node Personnel</p>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
            <div className="flex items-center gap-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm"><div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center"><ShieldCheck size={16} /></div><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Enlisted Personnel</p><p className="text-xl font-black text-slate-800 tracking-tighter leading-none">{users.length}</p></div></div>
            <button onClick={openAddModal} className="px-10 py-4 bg-slate-900 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all hover:bg-slate-800 flex items-center gap-2"><Plus size={16} strokeWidth={4} /> Register Operator</button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center no-print">
          <div className="relative flex-1 group w-full"><Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" /><input type="text" placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-8 py-4 bg-slate-50/50 border border-slate-200 rounded-[2.5rem] text-[13px] font-bold uppercase outline-none focus:bg-white focus:ring-8 focus:ring-slate-900/5 transition-all shadow-inner" /></div>
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-4 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-900 shadow-sm transition-all active:rotate-180 duration-700"><RefreshCw size={22} strokeWidth={2.5} className={isRefreshing ? 'animate-spin' : ''} /></button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead><tr className="bg-slate-50/80 border-b border-slate-100"><th className="w-[30%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Identity</th><th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th><th className="w-[20%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th><th className="w-[15%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Deployment</th><th className="w-[10%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th><th className="w-[10%] px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (<tr><td colSpan={6} className="py-40 text-center"><Loader2 className="animate-spin text-slate-400 mx-auto" size={32} /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Syncing Encrypted Profiles...</p></td></tr>) : filteredUsers.length === 0 ? (<tr><td colSpan={6} className="py-40 text-center"><Users size={48} className="text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero operators in this node</p></td></tr>) : (
                filteredUsers.map((user: User) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-5"><div className="flex items-center gap-5"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner ${user.role === 'Super Admin' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{user.name.charAt(0)}</div><div className="min-w-0"><p className="text-[15px] font-black text-slate-800 uppercase tracking-tight truncate leading-none mb-1.5">{user.name}</p><p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">UID: {user.id.substring(0, 8)}</p></div></div></td>
                        <td className="px-10 py-5"><span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${user.role === 'Super Admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}><Shield size={10} /> {user.role}</span></td>
                        <td className="px-10 py-5"><div className="flex items-center text-[13px] font-bold text-slate-600 tracking-tight"><Smartphone size={14} className="mr-2 text-slate-300" /> {user.phone}</div></td>
                        <td className="px-10 py-5"><div className="flex items-center text-[11px] font-black text-slate-400 uppercase tracking-widest truncate"><MapPin size={12} className="mr-2 text-indigo-500" /> {user.location || 'GLOBAL'}</div></td>
                        <td className="px-10 py-5 text-center"><div className="relative inline-block w-28"><select value={user.active ? 'active' : 'inactive'} onChange={(e) => handleStatusChange(user.id, e.target.value)} className={`w-full appearance-none pl-4 pr-10 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer focus:outline-none transition-all shadow-sm ${user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400'}`}><option value="active">Enabled</option><option value="inactive">Revoked</option></select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" /></div></td>
                        <td className="px-10 py-5 text-right"><button onClick={() => openEditModal(user)} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all active:scale-90"><Edit2 size={16} strokeWidth={2.5} /></button></td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">{editingUser ? <ShieldCheck size={24} /> : <Plus size={24} strokeWidth={3} />}</div><div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">{editingUser ? 'Credential Audit' : 'New Personnel'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Node Access Protocol</p></div></div>
                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"><X size={20} /></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Legal Name <span className="text-rose-500">*</span></label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="OPERATOR FULL NAME..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white focus:border-slate-900 transition-all shadow-inner" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Clearance Role</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white"><option value="Picker">Picker</option><option value="Checker">Checker</option><option value="Dispatcher">Dispatcher</option><option value="GR">GR</option></select></div>
                        <div className="space-y-2"><label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Toggle</label><select value={formData.active ? 'true' : 'false'} onChange={(e) => setFormData({...formData, active: e.target.value === 'true'})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold uppercase outline-none focus:bg-white"><option value="true">Enabled</option><option value="false">Revoked</option></select></div>
                    </div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile ID <span className="text-rose-500">*</span></label><div className="relative"><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="10-DIGIT NUMBER..." className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white shadow-inner" /><Smartphone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access PIN <span className="text-rose-500">*</span></label><div className="relative"><input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="SECURE CREDENTIALS..." className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white shadow-inner font-mono tracking-widest" /><Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
                </div>
                <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4"><button onClick={() => setIsModalOpen(false)} className="px-6 py-4 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest">Discard</button><button onClick={handleSaveUser} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">{editingUser ? 'Sync Changes' : 'Initialize Access'}</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;