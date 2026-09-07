import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  HelpCircle,
  X,
  Check,
} from 'lucide-react';
import { Budget, Category } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface BudgetsViewProps {
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
  categories: Category[];
  selectedMonth: string;
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onUpdateBudget: (id: string, budget: Partial<Budget>) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgetsWithProgress,
  categories,
  selectedMonth,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ id: string; categoryId: string; limit: number } | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState('');

  // Expense categories
  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  // Total budgeted and spent
  const totalBudgeted = budgetsWithProgress.reduce((acc, b) => acc + b.monthlyLimit, 0);
  const totalSpentInBudgets = budgetsWithProgress.reduce((acc, b) => acc + b.spent, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0;

  const handleOpenAdd = () => {
    // Pick the first expense category without a budget
    const existingCatIds = new Set(budgetsWithProgress.map((b) => b.categoryId));
    const available = expenseCategories.find((c) => !existingCatIds.has(c.id));
    setCategoryId(available ? available.id : expenseCategories[0]?.id || '');
    setLimit('');
    setEditingBudget(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: { id: string; categoryId: string; monthlyLimit: number }) => {
    setEditingBudget({ id: b.id, categoryId: b.categoryId, limit: b.monthlyLimit });
    setCategoryId(b.categoryId);
    setLimit(b.monthlyLimit.toString());
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseFloat(limit.replace(',', '.'));
    if (isNaN(numLimit) || numLimit <= 0) {
      setError('Informe um valor de limite mensal válido.');
      return;
    }

    if (editingBudget) {
      onUpdateBudget(editingBudget.id, {
        categoryId,
        monthlyLimit: numLimit,
      });
    } else {
      onAddBudget({
        categoryId,
        monthlyLimit: numLimit,
        period: selectedMonth,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Orçamentos Mensais
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Defina tetos de gastos para manter sua disciplina financeira sob controle
          </p>
        </div>
        <button
          id="btn-add-budget"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-sky-950/40"
        >
          <Plus size={16} />
          <span>Definir Novo Teto</span>
        </button>
      </div>

      {/* Overview Stat Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Orçado no Mês
          </span>
          <span className="text-2xl font-bold text-white mt-2 block">
            {formatCurrency(totalBudgeted)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Soma dos limites de todas as categorias
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Consumido
          </span>
          <span className="text-2xl font-bold text-white mt-2 block">
            {formatCurrency(totalSpentInBudgets)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {overallPercentage.toFixed(1)}% do total planejado utilizado
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Saldo Disponível para Gastar
          </span>
          <span
            className={`text-2xl font-bold mt-2 block ${
              totalBudgeted - totalSpentInBudgets >= 0 ? 'text-sky-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(totalBudgeted - totalSpentInBudgets)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Margem restante para fechar o mês no azul
          </span>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetsWithProgress.map((budget) => {
          const isDanger = budget.percentage >= 100;
          const isWarning = budget.percentage >= 80 && !isDanger;
          const barColor = isDanger
            ? 'bg-rose-500'
            : isWarning
            ? 'bg-amber-500'
            : 'bg-sky-500';

          return (
            <div
              key={budget.id}
              id={`budget-card-${budget.id}`}
              className={`bg-slate-900 p-5 rounded-2xl border shadow-xs transition-all ${
                isDanger ? 'border-rose-800/80 bg-rose-950/20' : 'border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: budget.category?.bgColor || '#1e293b',
                      color: budget.category?.color || '#94a3b8',
                    }}
                  >
                    <CategoryIcon name={budget.category?.icon || 'DollarSign'} size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {budget.category?.name || 'Categoria'}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Teto: {formatCurrency(budget.monthlyLimit)} / mês
                    </span>
                  </div>
                </div>

                {/* Edit / Delete */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(budget)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Editar teto"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteBudget(budget.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    title="Remover orçamento"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">
                    Gasto: <strong className="text-white">{formatCurrency(budget.spent)}</strong>
                  </span>
                  <span className={isDanger ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400' : 'text-slate-400'}>
                    {budget.percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(100, budget.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 text-[11px]">
                    {budget.isOverLimit ? 'Orçamento estourado' : 'Dentro do limite'}
                  </span>
                  <span
                    className={`font-semibold ${
                      budget.remaining < 0 ? 'text-rose-400' : 'text-sky-400'
                    }`}
                  >
                    {budget.remaining >= 0
                      ? `Resta ${formatCurrency(budget.remaining)}`
                      : `Excedeu ${formatCurrency(Math.abs(budget.remaining))}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational Rule 50/30/20 Section */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
          <HelpCircle size={18} />
          <span>Dica de Gestão: A Regra 50-30-20</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Uma das metodologias mais consagradas de planejamento financeiro divide suas receitas líquidas em três blocos:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-sky-400 block mb-1">50% Essenciais</span>
            <p className="text-[11px] text-slate-300">
              Moradia, alimentação, contas básicas, saúde e transporte.
            </p>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-indigo-400 block mb-1">30% Estilo de Vida</span>
            <p className="text-[11px] text-slate-300">
              Lazer, restaurantes, passeios, compras e assinaturas de streaming.
            </p>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-amber-400 block mb-1">20% Futuro / Metas</span>
            <p className="text-[11px] text-slate-300">
              Reserva de emergência, investimentos de longo prazo e quitação de dívidas.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingBudget ? 'Editar Teto de Gastos' : 'Definir Teto para Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria de Despesa
                </label>
                <select
                  id="budget-select-cat"
                  value={categoryId}
                  disabled={!!editingBudget}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Limite Mensal Máximo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                    R$
                  </span>
                  <input
                    id="budget-input-limit"
                    type="number"
                    step="10"
                    min="1"
                    required
                    placeholder="Ex: 1500"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shadow-sky-950/40"
                >
                  <Check size={16} />
                  <span>Salvar Orçamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
