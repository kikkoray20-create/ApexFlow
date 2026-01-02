import React, { useState, useRef, useEffect } from 'react';
import { Home, User as UserIcon, Bell, Settings, ChevronRight, Menu, LogOut, Radio, Send, Volume2 } from 'lucide-react';
import { User } from '../types';
import { fetchUsers } from '../services/db';

interface HeaderProps {
  currentUser: User;
  title: string;
  onMenuClick: () => void;
  showAllTransactions?: boolean;
  onToggleAllTransactions?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  title, 
  onMenuClick, 
  showAllTransactions, 
  onToggleAllTransactions,
  onLogout 
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [operators, setOperators] = useState<User[]>([]);
  const settingsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    // Standard notification alert sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load operators for the notification list
  useEffect(() => {
    if (isNotifOpen) {
        fetchUsers().then(users => {
            // Filter out Super Admins if needed, or show all staff
            setOperators(users.filter(u => u.active));
        });
    }
  }, [isNotifOpen]);

  const handlePingOperator = (opName: string) => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }
    // Simulate a ping notification logic
    console.log(`Pinging ${opName}: Check your order pipeline!`);
  };

  // Roles that should not see notification and settings icons
  const isRestrictedRole = ['Picker', 'Checker', 'Dispatcher', 'GR'].includes(currentUser.role);

  // Logic to convert view IDs to professional display names
  const getDisplayTitle = (id: string) => {
    if (id === 'orders') return 'ORDER DASHBOARD';
    return id.replace('_', ' ').toUpperCase();
  };

  const displayTitle = getDisplayTitle(title);

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200 -mx-6 md:-mx-10 mb-6 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 md:px-10 h-[64px] flex items-center justify-between">
        {/* Left Side: Mobile Menu + Navigation Strip */}
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 md:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black tracking-[0.1em] md:tracking-[0.2em] text-slate-400">
            <Home size={14} className="text-indigo-500 shrink-0" />
            <ChevronRight size={12} className="opacity-30 shrink-0" />
            <span className="hover:text-indigo-600 cursor-pointer transition-colors whitespace-nowrap">CONSOLE</span>
            <ChevronRight size={12} className="opacity-30 shrink-0" />
            <span className="text-slate-900 truncate max-w-[100px] md:max-w-none">{displayTitle}</span>
          </div>
        </div>

        {/* Right Side: Utilities & Profile */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Utilities Container */}
          {!isRestrictedRole && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 mr-2">
              
              {/* Notification / Ping Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className={`p-1.5 rounded-lg transition-all relative ${isNotifOpen ? 'bg-rose-100 text-rose-600 ring-4 ring-rose-50' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                    <Bell size={18} className={isNotifOpen ? 'animate-bounce' : ''} />
                    {!isNotifOpen && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-50"></span>}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-100/50 py-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="px-5 py-2 mb-3 border-b border-slate-50 flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Signal Hub</p>
                      <Radio size={12} className="text-rose-500 animate-pulse" />
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {operators.length === 0 ? (
                            <div className="px-5 py-8 text-center text-slate-300">
                                <p className="text-[10px] font-black uppercase">No active operators</p>
                            </div>
                        ) : (
                            operators.map(op => (
                                <button 
                                    key={op.id}
                                    onClick={() => handlePingOperator(op.name)}
                                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px]">
                                            {op.name.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black text-slate-700 uppercase leading-none">{op.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{op.role}</p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg">
                                            <Volume2 size={10} strokeWidth={3} />
                                            <span className="text-[8px] font-black uppercase tracking-tighter">Signal</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="mt-3 mx-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-[9px] font-bold text-indigo-600 leading-tight uppercase text-center italic">
                            Click a name to send an audible alert for new orders.
                        </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative" ref={settingsRef}>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-1.5 rounded-lg transition-all ${isSettingsOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                  <Settings size={18} />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-indigo-100/50 py-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="px-5 py-2 mb-3 border-b border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard Console</p>
                    </div>
                    
                    {/* Super Admin Filter Toggle */}
                    <div className="px-5 space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-black text-slate-700 uppercase leading-none">Financial Ledger</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Payments & Returns</span>
                          </div>
                          <button 
                              onClick={onToggleAllTransactions}
                              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center px-1 ${showAllTransactions ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${showAllTransactions ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                      </div>

                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100/50">
                          <p className="text-[9px] font-bold text-indigo-600 leading-relaxed uppercase">
                             {showAllTransactions 
                               ? "Dashboard is displaying all Orders, Payments, and Returns records."
                               : "Dashboard is showing physical Order history only."}
                          </p>
                      </div>
                    </div>

                    {currentUser.role !== 'Super Admin' && (
                      <div className="mt-4 mx-5 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-[9px] font-black text-amber-700 uppercase leading-tight">Privileged view locked. Contact Super Admin for ledger access.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 py-1 group">
            <div className="text-right hidden lg:block">
              <p className="text-[11px] font-black text-slate-900 leading-none transition-colors group-hover:text-indigo-600">
                {currentUser.name.toUpperCase()}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                {currentUser.role}
              </p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform shrink-0">
              <UserIcon size={18} strokeWidth={2.5} />
            </div>

            {/* EXIT / LOGOUT BUTTON */}
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <button 
                onClick={onLogout}
                className="p-2 md:p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95 group/exit flex items-center gap-2"
                title="Terminate Session"
            >
                <LogOut size={18} strokeWidth={3} className="rotate-180" />
                <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;