import React, { useMemo } from 'react';
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart as PieChartIcon,
  Target,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { formatMonthYear, formatShortMonth, getAdjacentMonth } from '../utils/formatters';
import { SupabaseSyncState } from '../services/supabaseService';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  onOpenNewTransaction?: () => void;
  onOpenExportImport?: () => void;
  supabaseSync?: SupabaseSyncState;
  onOpenSupabaseSync?: () => void;
  onLock?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onLock,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'transactions', label: 'Lançamentos', icon: <ArrowLeftRight size={18} /> },
    { id: 'budgets', label: 'Orçamentos', icon: <PieChartIcon size={18} /> },
    { id: 'goals', label: 'Metas', icon: <Target size={18} /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={18} /> },
  ];

  const handlePrevMonth = () => {
    setSelectedMonth(getAdjacentMonth(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(getAdjacentMonth(selectedMonth, 1));
  };

  // Guarantee the active selected month is present in the select options
  const allRenderedMonths = useMemo(() => {
    const set = new Set(availableMonths);
    if (selectedMonth && selectedMonth !== 'all') {
      set.add(selectedMonth);
    }
    return Array.from(set).sort().reverse();
  }, [availableMonths, selectedMonth]);

  const prevMonthLabel = formatShortMonth(getAdjacentMonth(selectedMonth, -1));
  const nextMonthLabel = formatShortMonth(getAdjacentMonth(selectedMonth, 1));

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
              <div className="flex items-center">
                <span className="font-bold text-base sm:text-xl tracking-tight text-white block leading-tight">
                  Finance
                </span>
              </div>
            </div>

            {/* Quick Actions & Selectors */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Month Selector with Left and Right Arrows */}
              <div className="flex items-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl p-0.5 shadow-xs transition-colors">
                {/* Seta Esquerda: Mês Anterior */}
                <button
                  type="button"
                  id="btn-prev-month"
                  onClick={handlePrevMonth}
                  title={`Mês anterior: ${prevMonthLabel}`}
                  aria-label={`Mês anterior: ${prevMonthLabel}`}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700/80 active:bg-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Seletor Central do Mês */}
                <div className="relative flex items-center">
                  <div className="absolute left-2 pointer-events-none text-sky-400">
                    <Calendar size={13} />
                  </div>
                  <select
                    id="month-selector"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-6.5 pr-2 sm:pl-7 sm:pr-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold bg-transparent text-slate-200 cursor-pointer focus:outline-none border-none hover:text-white transition-colors text-center"
                    aria-label="Selecionar mês de referência"
                  >
                    <option value="all" className="bg-slate-900 text-slate-200">
                      Todos
                    </option>
                    {allRenderedMonths.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-slate-200">
                        {formatShortMonth(m)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seta Direita: Próximo Mês */}
                <button
                  type="button"
                  id="btn-next-month"
                  onClick={handleNextMonth}
                  title={`Próximo mês: ${nextMonthLabel}`}
                  aria-label={`Próximo mês: ${nextMonthLabel}`}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-700/80 active:bg-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Lock Button */}
              {onLock && (
                <button
                  type="button"
                  id="btn-lock-screen"
                  onClick={onLock}
                  title="Bloquear painel"
                  aria-label="Bloquear painel"
                  className="p-1.5 sm:px-2.5 sm:py-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-rose-900/60 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  <Lock size={15} />
                  <span className="hidden sm:inline">Bloquear</span>
                </button>
              )}
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
