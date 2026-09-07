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
} from 'lucide-react';
import { ActiveTab } from '../types';
import { formatMonthYear } from '../utils/formatters';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  onOpenNewTransaction: () => void;
  onOpenExportImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onOpenNewTransaction,
  onOpenExportImport,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', label: 'Lançamentos', icon: <ArrowLeftRight size={18} /> },
    { id: 'budgets', label: 'Orçamentos', icon: <PieChartIcon size={18} /> },
    { id: 'goals', label: 'Metas', icon: <Target size={18} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                Controle Financeiro
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Gestão Pessoal Inteligente
              </span>
            </div>
          </div>

          {/* Month Selector & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month Filter Selector */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400">
                <Calendar size={15} />
              </div>
              <select
                id="month-selector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
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

            {/* Backup / Export button */}
            <button
              id="btn-backup-export"
              onClick={onOpenExportImport}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer"
              title="Backup, Exportar e Importar dados"
              aria-label="Backup e Exportação"
            >
              <Download size={16} />
              <span className="hidden md:inline">Backup</span>
            </button>

            {/* New Transaction Button */}
            <button
              id="btn-new-transaction"
              onClick={onOpenNewTransaction}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span className="hidden xs:inline">Nova Transação</span>
              <span className="xs:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-3 border-t border-slate-800 overflow-x-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-xs'
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
  );
};
