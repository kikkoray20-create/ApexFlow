import React, { useState } from 'react';
import { User as UserType } from '../types.ts';
import { Lock, Smartphone, ShieldCheck, Layers, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fetchUsers } from '../services/db.ts';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
        setError('PLEASE ENTER 10-DIGIT MOBILE');
        return;
    }

    setLoading(true);
    setError(null);

    // Root Master Access
    if (password === '78963.@' && mobile === '7737421738') {
        setTimeout(() => {
            onLogin({ 
                id: 'root-master', 
                name: 'MASTER ARCHITECT', 
                role: 'Super Admin', 
                phone: mobile, 
                active: true, 
                location: 'SYSTEM CORE' 
            });
        }, 1000);
        return;
    }

    try {
        const users = await fetchUsers();
        const matchedUser = users.find(u => {
            const cleanedDBPhone = u.phone.replace(/\D/g, '');
            return cleanedDBPhone.endsWith(mobile) && u.password === password;
        });
        
        setTimeout(() => {
            if (matchedUser) {
                if (!matchedUser.active) {
                    setError('ACCESS REVOKED');
                } else {
                    onLogin(matchedUser);
                }
            } else {
                setError('INVALID CREDENTIALS');
            }
            setLoading(false);
        }, 800);
    } catch (err) {
        setError('CLOUD SYNC FAILED');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] bg-white rounded-[3.5rem] shadow-xl p-10 md:p-14 border border-slate-100 animate-fade-in">
        <div className="mb-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl">
                <Layers size={40} strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Login</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">Order Management Console</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile ID</label>
                <div className="relative">
                    <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                        type="tel" 
                        value={mobile} 
                        onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        placeholder="MOBILE ID" 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 bg-slate-50 font-black focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Pin Code</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="PIN CODE" 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 bg-slate-50 font-black focus:bg-white focus:border-indigo-500 outline-none transition-all" 
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-100 text-xs font-black uppercase text-center flex items-center justify-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : <>Access Console <ArrowRight size={18} /></>}
            </button>
        </form>
        
        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Architect Security Protocol Active</p>
        </div>
      </div>
    </div>
  );
};

export default Login;