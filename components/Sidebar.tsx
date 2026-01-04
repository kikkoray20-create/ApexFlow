import React, { useMemo, useEffect, useState } from 'react';
import { Layers, ShieldAlert } from 'lucide-react';
import { SIDEBAR_ITEMS } from '../constants.tsx';
import { fetchRolePermissions } from '../services/db.ts';

const Sidebar = ({ currentView, onChangeView, userRole = 'Picker', userId, isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }) => {
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    fetchRolePermissions().then(setPermissions);
  }, []);

  const filteredNavItems = useMemo(() => {
    return SIDEBAR_ITEMS.filter(item => {
        if (userId === 'root-master') return ['orders'].includes(item.id);
        const rolePerms = permissions.find(p => p.role === userRole);
        if (rolePerms) return rolePerms.allowedModules.includes(item.id);
        return userRole === 'Super Admin' || ['orders'].includes(item.id);
    }).map(item => {
        if (userId === 'root-master' && item.id === 'orders') {
            return { ...item, label: 'Root Console', icon: <ShieldAlert size={18} /> };
        }
        return item;
    });
  }, [userRole, userId, permissions]);

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] md:hidden" onClick={onMobileClose} />}
      <aside className={`transition-all duration-300 bg-white border-r border-slate-200 flex flex-col shrink-0 ${isMobileOpen ? 'fixed left-0 top-0 h-screen z-[70] translate-x-0 w-[260px]' : 'relative hidden md:flex h-screen sticky top-0'} ${isCollapsed && !isMobileOpen ? 'md:w-[80px]' : 'md:w-[260px]'}`}>
        <div onClick={onToggleCollapse} className="h-[70px] px-5 flex items-center justify-between border-b border-slate-50 cursor-pointer hover:bg-slate-50/50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${(isCollapsed && !isMobileOpen) ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
            <div className="w-10 h-10 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"><Layers size={22} /></div>
            <span className="font-black text-lg tracking-tighter text-slate-800">ApexFlow</span>
          </div>
          {isCollapsed && !isMobileOpen && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 bg-[#4f46e5] rounded-xl flex items-center justify-center text-white"><Layers size={22} /></div></div>}
        </div>
        <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <nav className="space-y-1">
            {filteredNavItems.map((item) => (
              <button key={item.id} onClick={() => { onChangeView(item.id); onMobileClose(); }} className={`w-full flex items-center px-7 py-3 text-sm font-semibold ${currentView === item.id ? 'sidebar-active' : 'text-slate-500 hover:bg-slate-50'} ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}`}>
                <div className="flex items-center gap-3.5">
                  <span className={currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                  {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;