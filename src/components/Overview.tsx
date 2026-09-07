import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency, formatDate, formatMonthYear, getAdjacentMonth } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { Transaction, Category, ActiveTab } from '../types';

interface OverviewProps {
  summary: {
    income: number;
    expense: number;
    pendingIncome: number;
    pendingExpense: number;
    netBalance: number;
    projectedBalance: number;
    savingsRate: number;
    transactionCount: number;
  };
  allTimeBalance: number;
  selectedMonth: string;
  onSelectMonth?: (month: string) => void;
  monthlyTrends: Array<{
    month: string;
    label: string;
    Receitas: number;
    Despesas: number;
    Saldo: number;
  }>;
  categoryExpenses: Array<{
    categoryId: string;
    name: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
  budgetsWithProgress: Array<{
    id: string;
    categoryId: string;
    monthlyLimit: number;
    spent: number;
    percentage: number;
    remaining: number;
    isOverLimit: boolean;
    category?: Category;
  }>;
  recentTransactions: Transaction[];
  categoryMap: Map<string, Category>;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  summary,
  allTimeBalance,
  selectedMonth,
  onSelectMonth,
  monthlyTrends,
  categoryExpenses,
  budgetsWithProgress,
  recentTransactions,
  categoryMap,
  onNavigateTab,
  onOpenNewTransaction,
}) => {
  // Check for budget alerts (categories over 85% of limit)
  const criticalBudgets = budgetsWithProgress.filter((b) => b.percentage >= 85);

  return (
    <div className="space-y-6">
      {/* Top Banner / Month Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Resumo Financeiro
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-slate-400">Exibindo indicadores para:</span>
            {onSelectMonth ? (
              <div className="inline-flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 shadow-xs">
                <button
                  type="button"
                  id="overview-btn-prev-month"
                  onClick={() => onSelectMonth(getAdjacentMonth(selectedMonth, -1))}
                  title={`Mês anterior (${formatMonthYear(getAdjacentMonth(selectedMonth, -1))})`}
                  aria-label="Mês anterior"
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-2 text-xs sm:text-sm font-semibold text-sky-400">
                  {formatMonthYear(selectedMonth)}
                </span>
                <button
                  type="button"
                  id="overview-btn-next-month"
                  onClick={() => onSelectMonth(getAdjacentMonth(selectedMonth, 1))}
                  title={`Próximo mês (${formatMonthYear(getAdjacentMonth(selectedMonth, 1))})`}
                  aria-label="Próximo mês"
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            ) : (
              <span className="font-semibold text-slate-200 text-sm">
                {formatMonthYear(selectedMonth)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-quick-new-tx"
            onClick={onOpenNewTransaction}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sky-950/40"
          >
            <Plus size={16} />
            <span>Registrar Lançamento</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Geral */}
        <div id="card-saldo-geral" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Líquido ({formatMonthYear(selectedMonth).split(' ')[0]})
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold tracking-tight ${
                summary.netBalance >= 0 ? 'text-sky-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netBalance)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Acumulado histórico:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(allTimeBalance)}</span>
          </div>
        </div>

        {/* Card 2: Receitas (Azul Baleia) */}
        <div id="card-receitas" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Receitas Realizadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/40 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-400 tracking-tight">
              {formatCurrency(summary.income)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            {summary.pendingIncome > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock size={12} />
                {formatCurrency(summary.pendingIncome)} a receber
              </span>
            ) : (
              <span className="text-sky-400/90 font-medium">Todas recebidas</span>
            )}
          </div>
        </div>

        {/* Card 3: Despesas */}
        <div id="card-despesas" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despesas Realizadas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/40 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">
              {formatCurrency(summary.expense)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            {summary.pendingExpense > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock size={12} />
                {formatCurrency(summary.pendingExpense)} pendente
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Nenhuma pendente</span>
            )}
          </div>
        </div>

        {/* Card 4: Economia / Poupança */}
        <div id="card-poupanca" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Taxa de Poupança
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-400 tracking-tight">
              {summary.savingsRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary.savingsRate >= 20 ? (
              <span className="text-sky-400 font-medium">Meta de 20%+ alcançada</span>
            ) : (
              <span className="text-slate-400">Recomendado poupar 20%</span>
            )}
          </div>
        </div>
      </div>

      {/* Critical Budget Warnings Banner */}
      {criticalBudgets.length > 0 && (
        <div id="alert-budgets" className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="font-semibold block text-amber-300">
              Atenção com seus orçamentos definidos
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {criticalBudgets.map((b) => (
                <span
                  key={b.id}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    b.isOverLimit
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  }`}
                >
                  {b.category?.name}: {b.percentage.toFixed(0)}% do teto ({formatCurrency(b.spent)} / {formatCurrency(b.monthlyLimit)})
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('budgets')}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline shrink-0 cursor-pointer self-center"
          >
            Ajustar limites
          </button>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Flow Chart (2 Cols) */}
        <div id="chart-fluxo-caixa" className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Evolução Mensal (Receitas vs Despesas)
              </h2>
              <p className="text-xs text-slate-400">
                Histórico recente dos últimos meses registrados
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            {monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val)]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="Receitas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Sem dados suficientes para o gráfico
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category Donut Chart (1 Col) */}
        <div id="chart-despesas-categoria" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col">
          <div className="mb-2">
            <h2 className="text-base font-bold text-white">
              Despesas por Categoria
            </h2>
            <p className="text-xs text-slate-400">
              Distribuição percentual no período
            </p>
          </div>

          {categoryExpenses.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryExpenses}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Categories Mini Legend */}
              <div className="space-y-2 mt-2 max-h-36 overflow-y-auto no-scrollbar">
                {categoryExpenses.slice(0, 4).map((item) => (
                  <div key={item.categoryId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-300 truncate font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-white">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-slate-400 w-10 text-right">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
              Nenhuma despesa registrada neste período
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Budgets Progress & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budgets Tracker Mini View (1 Col) */}
        <div id="section-orcamentos-resumo" className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Orçamentos do Mês
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhamento dos tetos estipulados
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('budgets')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {budgetsWithProgress.slice(0, 4).map((b) => {
              const isDanger = b.percentage >= 100;
              const isWarning = b.percentage >= 80 && !isDanger;
              const barColor = isDanger
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-sky-500';

              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      {b.category?.name || 'Geral'}
                    </span>
                    <span className="text-slate-400">
                      <strong className="text-white">{formatCurrency(b.spent)}</strong> / {formatCurrency(b.monthlyLimit)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{b.percentage.toFixed(0)}% utilizado</span>
                    <span className={b.remaining < 0 ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                      {b.remaining >= 0 ? `${formatCurrency(b.remaining)} restante` : `${formatCurrency(Math.abs(b.remaining))} excedido`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions (2 Cols) */}
        <div id="section-ultimos-lancamentos" className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Últimos Lançamentos
              </h2>
              <p className="text-xs text-slate-400">
                Movimentações mais recentes cadastradas
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              Ver histórico completo <ChevronRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/50 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: cat?.bgColor || '#1e293b',
                          color: cat?.color || '#94a3b8',
                        }}
                      >
                        <CategoryIcon name={cat?.icon || 'DollarSign'} size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-white block truncate">
                          {tx.description}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{cat?.name || 'Geral'}</span>
                          <span>•</span>
                          <span>{formatDate(tx.date)}</span>
                          {tx.status === 'pending' && (
                            <span className="text-amber-300 font-medium bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.2 rounded text-[10px]">
                              Pendente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold flex items-center justify-end gap-0.5 ${
                          isIncome ? 'text-sky-400' : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight size={14} className="text-sky-400" />
                        ) : (
                          <ArrowDownRight size={14} className="text-rose-400" />
                        )}
                        <span>
                          {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {tx.account}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-slate-400">Nenhum lançamento adicionado ainda.</p>
                <button
                  onClick={onOpenNewTransaction}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sky-950/40"
                >
                  <Plus size={14} />
                  <span>Adicionar Primeiro Lançamento</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
