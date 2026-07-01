import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import { getStoragePublicUrl } from '@/utils/storagePublicUrl';
import {
  LayoutDashboard, Users, UserCheck, Car, DollarSign, Bell,
  ShieldCheck, Code, LogOut, Menu, X, Activity, Wifi, Ticket,
  ChevronDown, TrendingUp, Wallet, UserX, Truck, ClipboardList,
  CreditCard, Megaphone, Settings, MapPin
} from 'lucide-react';

import Img from '@/assets/logo_Com.png';

/* ── Single nav item ─────────────────────────────────────── */
function NavItem({ to, label, icon, onClick, nested, end }: {
  to: string; label: string; icon: React.ReactNode; onClick?: () => void; nested?: boolean; end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200
        ${nested ? 'pl-10 pr-3 py-2' : 'px-3 py-2.5'}
        ${isActive
          ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-marine font-bold border-l-4 border-primary'
          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/* ── Collapsible nav group ───────────────────────────────── */
function NavGroup({ label, icon, children, isOpen, onToggle }: {
  label: string; icon: React.ReactNode;
  children: React.ReactNode; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
          ${isOpen
            ? 'text-marine font-bold bg-primary/10'
            : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
          }`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="space-y-0.5 py-1">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Separator ───────────────────────────────────────────── */
function NavSeparator({ label }: { label?: string }) {
  return (
    <div className="pt-4 pb-1 px-3">
      {label && <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>}
      {!label && <div className="border-t border-gray-200/60" />}
    </div>
  );
}

/* ── Main layout ─────────────────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev: Record<string, boolean>) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  // Auto-open group based on current URL
  useEffect(() => {
    const path = location.pathname;
    const autoOpen: Record<string, boolean> = {};
    if (path.startsWith('/drivers') || path.startsWith('/fleet')) autoOpen.drivers = true;
    if (path.startsWith('/passengers') || path.startsWith('/users') || path.startsWith('/accounts')) autoOpen.users = true;
    if (path.startsWith('/pricing') || path.startsWith('/finance')) autoOpen.finance = true;
    if (path.startsWith('/notifications') || path.startsWith('/promotions')) autoOpen.comms = true;
    if (path.startsWith('/dev/')) autoOpen.dev = true;
    setOpenGroups((prev: Record<string, boolean>) => ({ ...prev, ...autoOpen }));
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isSidebarOpen) setSidebarOpen(false);
  }, [location]);

  const isDev = user?.roles?.includes('developer') || user?.permissions?.includes('view_dev_tools') || user?.role === 'developer' || user?.role === 'admin' || user?.role === 'super-admin';
  const isSuperAdmin = user?.roles?.includes('super-admin') || user?.role === 'super-admin';
  
  const hasPerm = (perm: string) => {
      if (isSuperAdmin) return true;
      if (user?.role === 'admin') return true; // Legacy fallback
      return user?.permissions?.includes(perm);
  };

  const renderNavItems = (onClick?: () => void) => (
    <>
      {/* ── Principal ── */}
      <NavItem to="/overview" label="Vue d'ensemble" icon={<LayoutDashboard size={18} />} onClick={onClick} />
      {hasPerm('view_rides') && (
        <NavItem to="/rides/active" label="Courses actives" icon={<Car size={18} />} onClick={onClick} />
      )}
      <NavItem to="/map" label="Carte stratégique" icon={<MapPin size={18} />} onClick={onClick} />

      <NavSeparator label="Gestion" />

      {/* ── Chauffeurs ── */}
      {hasPerm('view_drivers') && (
      <NavGroup
        label="Chauffeurs"
        icon={<Car size={18} />}
        isOpen={!!openGroups.drivers}
        onToggle={() => toggleGroup('drivers')}
      >
        <NavItem nested to="/drivers/pending" label="En attente" icon={<UserCheck size={16} />} onClick={onClick} />
        <NavItem nested to="/drivers/online" label="Statut en ligne" icon={<Users size={16} />} onClick={onClick} />
        <NavItem nested to="/drivers/stats" label="Statistiques" icon={<TrendingUp size={16} />} onClick={onClick} />
        <NavItem nested to="/drivers/debts" label="Dettes" icon={<Wallet size={16} />} onClick={onClick} />
        <NavItem nested to="/fleet" label="Flotte" icon={<Truck size={16} />} onClick={onClick} />
      </NavGroup>
      )}

      {/* ── Utilisateurs ── */}
      {hasPerm('view_users') && (
      <NavGroup
        label="Utilisateurs"
        icon={<Users size={18} />}
        isOpen={!!openGroups.users}
        onToggle={() => toggleGroup('users')}
      >
        <NavItem nested end to="/passengers" label="Passagers" icon={<Users size={16} />} onClick={onClick} />
        <NavItem nested to="/passengers/crm" label="Segmentation CRM" icon={<TrendingUp size={16} />} onClick={onClick} />
        <NavItem nested to="/users" label="Gestion comptes" icon={<UserX size={16} />} onClick={onClick} />
        <NavItem nested to="/accounts" label="Modération" icon={<ShieldCheck size={16} />} onClick={onClick} />
      </NavGroup>
      )}

      {/* ── Finances ── */}
      {hasPerm('view_finance') && (
      <NavGroup
        label="Finances"
        icon={<DollarSign size={18} />}
        isOpen={!!openGroups.finance}
        onToggle={() => toggleGroup('finance')}
      >
        {hasPerm('manage_pricing') && (
          <NavItem nested to="/pricing" label="Tarification" icon={<ClipboardList size={16} />} onClick={onClick} />
        )}
        <NavItem nested to="/finance" label="Revenus" icon={<CreditCard size={16} />} onClick={onClick} />
      </NavGroup>
      )}

      {/* ── Communication ── */}
      {hasPerm('manage_promotions') && (
        <>
      <NavSeparator label="Communication & Marketing" />
      <NavGroup
        label="Communication & Marketing"
        icon={<Megaphone size={18} />}
        isOpen={!!openGroups.comms}
        onToggle={() => toggleGroup('comms')}
      >
        <NavItem nested to="/notifications" label="Notifications" icon={<Bell size={16} />} onClick={onClick} />
        <NavItem nested to="/promotions" label="Bannières Pubs" icon={<Ticket size={16} />} onClick={onClick} />
        <NavItem nested to="/promo-codes" label="Codes Promos" icon={<DollarSign size={16} />} onClick={onClick} />
      </NavGroup>
      </>
      )}

      {/* ── Développeur (dev role only) ── */}
      {isDev && (
        <>
          <NavSeparator label="Développeur" />
          <NavGroup
            label="Outils Dev"
            icon={<Code size={18} />}
            isOpen={!!openGroups.dev}
            onToggle={() => toggleGroup('dev')}
          >
            <NavItem nested to="/dev/tools" label="Outils développeur" icon={<Code size={16} />} onClick={onClick} />
            <NavItem nested to="/dev/passenger-inbox" label="Inbox app passager" icon={<Bell size={16} />} onClick={onClick} />
            <NavItem nested to="/dev/analytics-product" label="Analytics produit" icon={<TrendingUp size={16} />} onClick={onClick} />
            <NavItem nested to="/dev/metrics" label="Métriques performance" icon={<Activity size={16} />} onClick={onClick} />
            <NavItem nested to="/dev/reconnections" label="Analytics reconnexions" icon={<Wifi size={16} />} onClick={onClick} />
          </NavGroup>
        </>
      )}
    </>
  );

  const sidebarContent = (onClick?: () => void) => (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <nav className="p-3 flex-1">
        <div className="space-y-1">
          {renderNavItems(onClick)}
        </div>
      </nav>
      {/* User section */}
      <div className="p-3 border-t border-gray-200">
        <Link
          to="/profile"
          onClick={onClick}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 mb-2 hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-marine text-sm font-bold group-hover:bg-primary group-hover:text-marine transition-colors overflow-hidden">
            {user?.photo ? (
              <img src={getStoragePublicUrl(user.photo) || ''} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'D'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email || 'Mon profil'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'developer'}</p>
          </div>
          <Settings size={14} className="text-gray-400 group-hover:text-marine transition-colors" />
        </Link>
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-red-500 hover:text-white transition-colors duration-200">
          <LogOut size={16} /><span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Desktop sidebar ── */}
      <aside className="w-64 fixed inset-y-0 left-0 z-20 bg-white border-r border-gray-200 flex-col hidden lg:flex shadow-sm">
        <div className="h-16 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={Img} alt="Kêkênon Logo" className="h-10 w-auto object-contain" />
          </Link>
        </div>
        {sidebarContent()}
      </aside>

      {/* ── Mobile overlay ── */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white flex flex-col transition-transform duration-300 ease-in-out lg:hidden shadow-xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={Img} alt="Kêkênon Logo" className="h-10 w-auto object-contain" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500 hover:text-marine rounded-full">
            <X size={24} />
          </button>
        </div>
        {sidebarContent(() => setSidebarOpen(false))}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-marine">
            <Menu size={24} />
          </button>
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-xl font-semibold text-gray-800"></h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-marine"><Bell size={20} /></button>
            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
