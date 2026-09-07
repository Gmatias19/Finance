import React from 'react';
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  Target,
  BarChart3,
  Plus,
  Download,
  Calendar,
  Database,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { formatMonthYear } from '../utils/formatters';
import { SupabaseSyncState } from '../services/supabaseService';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  onOpenNewTransaction: () => void;
  onOpenExportImport: () => void;
  supabaseSync: SupabaseSyncState;
  onOpenSupabaseSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onOpenNewTransaction,
  onOpenExportImport,
  supabaseSync,
  onOpenSupabaseSync,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', label: 'Lançamentos', icon: <ArrowLeftRight size={18} /> },
    { id: 'budgets', label: 'Orçamentos', icon: <PieChartIcon size={18} /> },
    { id: 'goals', label: 'Metas', icon: <Target size={18} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} /> },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Logo & Brand (Azul Baleia) */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-950/50">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm sm:text-lg tracking-tight text-white block leading-tight">
                  Controle Financeiro
                </span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium hidden xs:block">
                  Gestão Pessoal Inteligente
                </span>
              </div>
            </div>

            {/* Quick Actions & Selectors */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Month Selector */}
              <div className="relative flex items-center">
                <div className="absolute left-2.5 pointer-events-none text-slate-400">
                  <Calendar size={14} />
                </div>
                <select
                  id="month-selector"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-7 pr-6 sm:pl-8 sm:pr-7 py-1.5 text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                  aria-label="Selecionar mês de referência"
                >
                  <option value="all">Todo o Histórico</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-slate-200">
                      {formatMonthYear(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supabase Status Button */}
              <button
                id="btn-supabase-status"
                onClick={onOpenSupabaseSync}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Banco de Dados Supabase (Nuvem)"
                aria-label="Status Supabase"
              >
                <Database
                  size={15}
                  className={
                    supabaseSync.status === 'connected'
                      ? 'text-sky-400'
                      : supabaseSync.status === 'needs_setup'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }
                />
                <span className="hidden md:inline">Supabase</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseSync.status === 'connected'
                      ? 'bg-sky-400 animate-pulse'
                      : supabaseSync.status === 'needs_setup'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
              </button>

              {/* Backup Button */}
              <button
                id="btn-backup-export"
                onClick={onOpenExportImport}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Backup e Exportação"
                aria-label="Backup"
              >
                <Download size={15} />
                <span className="hidden lg:inline">Backup</span>
              </button>

              {/* New Transaction Button (Azul Baleia) */}
              <button
                id="btn-new-transaction"
                onClick={onOpenNewTransaction}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-1 shadow-sm shadow-sky-950/40 transition-all cursor-pointer"
              >
                <Plus size={16} className="stroke-[2.5]" />
                <span className="hidden sm:inline">Nova Transação</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>

          {/* Desktop Sub-nav Tabs (Azul Baleia) */}
          <nav className="hidden sm:flex space-x-2 border-t border-slate-800 py-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Azul Baleia) */}
      <nav
        id="mobile-bottom-nav"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-1 py-1 shadow-2xl flex items-center justify-around"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
                isActive
                  ? 'text-sky-400 font-bold bg-slate-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={isActive ? 'scale-110 transition-transform' : ''}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
