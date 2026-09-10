import React, { useMemo } from 'react';
import {
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { Transaction, Category } from '../types';
import { formatCurrency, formatDate, formatMonthYear, paymentMethodLabels } from '../utils/formatters';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  categoryMap: Map<string, Category>;
  selectedMonth: string;
  monthlyTrends: Array<{
    month: string;
    label: string;
    Receitas: number;
    Despesas: number;
    Saldo: number;
  }>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  categoryMap,
  selectedMonth,
  monthlyTrends,
}) => {
  // Filter transactions for the selected month or all
  const relevantTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Expenses only (completed)
  const completedExpenses = useMemo(() => {
    return relevantTransactions.filter((t) => t.type === 'expense' && t.status === 'completed');
  }, [relevantTransactions]);

  const totalExpense = useMemo(() => {
    return completedExpenses.reduce((acc, t) => acc + t.amount, 0);
  }, [completedExpenses]);

  const totalIncome = useMemo(() => {
    return relevantTransactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [relevantTransactions]);

  // Top 5 largest expenses
  const topExpenses = useMemo(() => {
    return [...completedExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [completedExpenses]);

  // Spending by payment method
  const paymentMethodBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    completedExpenses.forEach((t) => {
      map.set(t.paymentMethod, (map.get(t.paymentMethod) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .map(([method, amount]) => ({
        method,
        label: paymentMethodLabels[method] || method,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [completedExpenses, totalExpense]);

  // Category in-depth table
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    completedExpenses.forEach((t) => {
      const current = stats.get(t.categoryId) || { count: 0, total: 0 };
      stats.set(t.categoryId, {
        count: current.count + 1,
        total: current.total + t.amount,
      });
    });

    return Array.from(stats.entries())
      .map(([catId, data]) => {
        const cat = categoryMap.get(catId);
        return {
          catId,
          name: cat?.name || 'Geral',
          color: cat?.color || '#64748b',
          icon: cat?.icon || 'DollarSign',
          count: data.count,
          total: data.total,
          average: data.count > 0 ? data.total / data.count : 0,
          percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [completedExpenses, categoryMap, totalExpense]);

  // Daily expense average
  const daysInMonth = selectedMonth !== 'all' ? 30 : 90;
  const dailyAverageExpense = totalExpense / daysInMonth;

  // Financial Health Score (0 - 100)
  const healthScore = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return 50;
    if (totalIncome === 0) return 20;

    let score = 50;
    const ratio = totalExpense / totalIncome;
    if (ratio < 0.6) score += 35;
    else if (ratio < 0.8) score += 20;
    else if (ratio < 1.0) score += 5;
    else score -= 30;

    // Positive balance bonus
    if (totalIncome > totalExpense) score += 15;

    return Math.max(10, Math.min(100, Math.round(score)));
  }, [totalIncome, totalExpense]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Relatórios & Inteligência Financeira
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Análise aprofundada para o período de{' '}
          <span className="font-semibold text-slate-200">
            {formatMonthYear(selectedMonth)}
          </span>
        </p>
      </div>

      {/* Health Score & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score Card */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Índice de Saúde Financeira
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-white">
                {healthScore}/100
              </span>
              <span
                className={`text-xs font-bold ${
                  healthScore >= 75
                    ? 'text-sky-400'
                    : healthScore >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {healthScore >= 75 ? 'Excelente' : healthScore >= 50 ? 'Estável' : 'Requer Atenção'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Baseado na relação receitas/gastos e taxa de poupança
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
        </div>

        {/* Daily Average */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Média Diária de Gastos
          </span>
          <span className="text-2xl font-bold text-white mt-2 block">
            {formatCurrency(dailyAverageExpense)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Gasto médio diário no período considerado
          </span>
        </div>

        {/* Cash Flow Balance */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Saldo Líquido Gerado
          </span>
          <span
            className={`text-2xl font-bold mt-2 block ${
              totalIncome - totalExpense >= 0 ? 'text-sky-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(totalIncome - totalExpense)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Resultado operacional das entradas e saídas
          </span>
        </div>
      </div>

      {/* Net Balance Area Trend Chart */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">
            Evolução do Saldo Acumulado
          </h2>
          <p className="text-xs text-slate-400">
            Histórico da evolução do saldo acumulado mês a mês
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="saldoGradientDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: number) => [formatCurrency(val), 'Saldo Acumulado']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="Saldo"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#saldoGradientDark)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Expenses & Payment Methods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Biggest Expenses */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">
              Top 5 Maiores Despesas
            </h2>
            <p className="text-xs text-slate-400">
              Lançamentos individuais de maior impacto financeiro
            </p>
          </div>

          <div className="space-y-3">
            {topExpenses.length > 0 ? (
              topExpenses.map((tx, idx) => {
                const cat = categoryMap.get(tx.categoryId);
                const pct = totalExpense > 0 ? (tx.amount / totalExpense) * 100 : 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-bold text-slate-500 text-xs">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-white text-xs sm:text-sm block truncate">
                          {tx.description}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {cat?.name} • {formatDate(tx.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-rose-400 text-xs sm:text-sm block">
                        {formatCurrency(tx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {pct.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                Sem despesas registradas
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">
              Formas de Pagamento Mais Usadas
            </h2>
            <p className="text-xs text-slate-400">
              Onde o dinheiro das suas despesas foi debitado
            </p>
          </div>

          <div className="space-y-3">
            {paymentMethodBreakdown.map((item) => (
              <div key={item.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{formatCurrency(item.amount)}</span>
                    <span className="text-slate-400 w-10 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Deep Breakdown Table */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">
            Detalhamento por Categoria de Despesa
          </h2>
          <p className="text-xs text-slate-400">
            Frequência e valores consolidados de cada setor de consumo
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3 text-center">Nº Lançamentos</th>
                <th className="py-2.5 px-3 text-right">Gasto Médio</th>
                <th className="py-2.5 px-3 text-right">Total Gasto</th>
                <th className="py-2.5 px-3 text-right">% do Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {categoryStats.map((item) => (
                <tr key={item.catId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-400">{item.count}</td>
                  <td className="py-3 px-3 text-right text-slate-400">
                    {formatCurrency(item.average)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-300">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
