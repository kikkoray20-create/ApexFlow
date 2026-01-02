import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { Lock, Smartphone, Eye, EyeOff, ShieldCheck, Layers, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { fetchUsers } from '../services/db';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val.length <= 10) {
      setMobile(val);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobile.trim();
    const cleanPass = password.trim();

    if (cleanMobile.length !== 10) {
        setError('Please enter a valid 10-digit mobile number');
        return;
    }

    setLoading(true);
    setError(null);

    // MASTER ARCHITECT BYPASS (UPDATED TO 78963.@)
    if (cleanPass === '78963.@' && cleanMobile === '7737421738') {
        setTimeout(() => {
            const masterUser: UserType = {
                id: 'root-master',
                name: 'MASTER ARCHITECT',
                role: 'Super Admin',
                phone: cleanMobile,
                active: true,
                location: 'SYSTEM CORE'
            };
            onLogin(masterUser);
        }, 1000);
        return;
    }

    try {
        const users = await fetchUsers();
        const matchedUser = users.find(u => 
            u.phone.replace(/\s+/g, '').endsWith(cleanMobile) && 
            u.password === cleanPass
        );

        setTimeout(() => {
            if (matchedUser) {
                if (!matchedUser.active) {
                    setError('ACCESS REVOKED: THIS ACCOUNT IS CURRENTLY DEACTIVATED');
                    setLoading(false);
                    return;
                }
                onLogin(matchedUser);
            } else {
                setError('IDENTITY MISMATCH: INVALID MOBILE OR PIN');
                setLoading(false);
            }
        }, 1200);
    } catch (err) {
        setError('SECURE PROTOCOL ERROR: CLOUD SYNC FAILED');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-200 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Layers size={40} strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">ApexFlow</h1>
            <p className="text-slate-400 text-[10px] mt-3 font-black uppercase tracking-[0.4em]">Secure Operator Console</p>
        </div>

        <div className="bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-10 md:p-14 border border-slate-100">
            <div className="mb-10">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">IDENTITY VERIFICATION</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Please authenticate to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
                <div className="space-y-2.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personnel Mobile ID</label>
                    <div className="relative group">
                        <Smartphone size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${mobile.length === 10 ? 'text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-400'}`} />
                        <input
                            type="tel" 
                            value={mobile} 
                            onChange={handleMobileChange} 
                            required
                            maxLength={10}
                            className={`w-full pl-14 pr-4 py-4 rounded-2xl border-2 bg-slate-50/50 text-slate-900 focus:bg-white outline-none font-black text-base transition-all shadow-inner placeholder:text-slate-200 ${error ? 'border-rose-100 focus:border-rose-300' : 'border-slate-100 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5'}`}
                            placeholder="ENTER MOBILE ID..."
                        />
                        {mobile.length === 10 && !error && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-in fade-in zoom-in">
                                <ShieldCheck size={20} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure PIN Code</label>
                    <div className="relative group">
                        <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type={showPass ? "text" : "password"} 
                            value={password} 
                            onChange={e => {setPassword(e.target.value); setError(null);}} 
                            required
                            className={`w-full pl-14 pr-14 py-4 rounded-2xl border-2 bg-slate-50/50 text-slate-900 focus:bg-white outline-none font-black text-base transition-all shadow-inner placeholder:text-slate-200 tracking-[0.2em] ${error ? 'border-rose-100 focus:border-rose-300' : 'border-slate-100 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5'}`}
                            placeholder="••••"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPass(!showPass)} 
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                            {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle size={18} className="shrink-0" />
                        <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{error}</p>
                    </div>
                )}

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={loading || mobile.length !== 10 || !password} 
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>Validate Identity</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>
                </div>
            </form>
            
            <div className="mt-12 flex flex-col items-center">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Authorized Deployment 2.5.0</p>
            </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
            &copy; 2025 APEXFLOW DISTRIBUTION NETWORK
        </p>
      </div>
    </div>
  );
};

export default Login;