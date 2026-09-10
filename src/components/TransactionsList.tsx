import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Repeat,
  FileText,
  SlidersHorizontal,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Transaction, Category, FilterOptions } from '../types';
import { formatCurrency, formatDate, paymentMethodLabels } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsListProps {
  transactions: Transaction[];
  allTransactions?: Transaction[];
  categories: Category[];
  categoryMap: Map<string, Category>;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  allTransactions = [],
  categories,
  categoryMap,
  filters,
  setFilters,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onToggleStatus,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Month-scoped transactions for badge counting
  const monthScopedTransactions = useMemo(() => {
    const list = allTransactions && allTransactions.length > 0 ? allTransactions : transactions;
    return list.filter((t) => {
      if (filters.month !== 'all' && !t.date.startsWith(filters.month) && !t.isCarriedOver) {
        return false;
      }
      return true;
    });
  }, [allTransactions, transactions, filters.month]);

  // Carried-over overdue pending debts
  const carriedOverDebts = useMemo(() => {
    return transactions.filter((t) => t.isCarriedOver);
  }, [transactions]);
  const carriedOverCount = carriedOverDebts.length;
  const carriedOverTotal = useMemo(() => {
    return carriedOverDebts.reduce((sum, t) => sum + t.amount, 0);
  }, [carriedOverDebts]);

  // Counts for the tabs
  const completedCount = useMemo(() => {
    return monthScopedTransactions.filter((t) => t.status === 'completed').length;
  }, [monthScopedTransactions]);

  const pendingCount = useMemo(() => {
    return monthScopedTransactions.filter((t) => t.status === 'pending').length;
  }, [monthScopedTransactions]);

  const totalCount = monthScopedTransactions.length;

  // Totals for completed in current filtered view
  const completedIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const completedExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  // Totals for pending in current filtered view
  const pendingIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const pendingExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      type: 'all',
      categoryId: 'all',
      paymentMethod: 'all',
    }));
  };

  const handleTabChange = (status: 'completed' | 'pending' | 'all') => {
    setFilters((prev) => ({ ...prev, status }));
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.type !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.paymentMethod !== 'all';

  const activeStatusTab = filters.status; // 'completed' | 'pending' | 'all'

  return (
    <div className="space-y-4">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Lançamentos Financeiros
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sincronização em Tempo Real
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Qualquer lançamento ou alteração reflete imediatamente para todos os usuários conectados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-add-transaction"
            onClick={onOpenNewTransaction}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shadow-sky-950/40"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Primary Status Tabs (Separated into Concluído vs Pendente vs Todos) */}
      <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Aba 1: Concluídos */}
          <button
            id="tab-status-completed"
            onClick={() => handleTabChange('completed')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeStatusTab === 'completed'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <CheckCircle2 size={16} className={activeStatusTab === 'completed' ? 'text-sky-400' : 'text-slate-500'} />
            <span>Concluídos</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeStatusTab === 'completed'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {completedCount}
            </span>
          </button>

          {/* Aba 2: Pendentes */}
          <button
            id="tab-status-pending"
            onClick={() => handleTabChange('pending')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeStatusTab === 'pending'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Clock size={16} className={activeStatusTab === 'pending' ? 'text-amber-400' : 'text-slate-500'} />
            <span>Pendentes</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeStatusTab === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : pendingCount > 0
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          {/* Aba 3: Todos */}
          <button
            id="tab-status-all"
            onClick={() => handleTabChange('all')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeStatusTab === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <span>Todos os Lançamentos</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                activeStatusTab === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <Search size={18} />
            </div>
            <input
              id="input-search-transactions"
              type="text"
              placeholder="Buscar por descrição, conta ou observação..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-500"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Type Chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, type: 'all' }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filters.type === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, type: 'income' }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filters.type === 'income'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, type: 'expense' }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filters.type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despesas
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-3 py-2 text-xs font-medium rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-sky-950/60 border-sky-700/80 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            )}
          </button>
        </div>

        {/* Expandable Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Categoria</label>
              <select
                id="filter-category"
                value={filters.categoryId}
                onChange={(e) => setFilters((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Forma de Pagamento</label>
              <select
                id="filter-payment"
                value={filters.paymentMethod}
                onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="all">Todas as Formas</option>
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Order / Sort */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Ordenar por</label>
              <select
                id="filter-sort"
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="date-desc">Mais Recentes Primeiro</option>
                <option value="date-asc">Mais Antigas Primeiro</option>
                <option value="amount-desc">Maior Valor</option>
                <option value="amount-asc">Menor Valor</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Limpar filtros avançados
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtered Summary Bar tailored to Active Tab */}
      <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-400">
          Exibindo <strong className="text-white font-bold">{transactions.length}</strong>{' '}
          {activeStatusTab === 'completed'
            ? 'lançamentos concluídos'
            : activeStatusTab === 'pending'
            ? 'lançamentos pendentes'
            : 'lançamentos no total'}
        </div>

        {activeStatusTab === 'completed' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-400">Recebido: </span>
              <span className="font-semibold text-sky-400">{formatCurrency(completedIncome)}</span>
            </div>
            <div>
              <span className="text-slate-400">Pago: </span>
              <span className="font-semibold text-rose-400">{formatCurrency(completedExpense)}</span>
            </div>
            <div>
              <span className="text-slate-400">Saldo Realizado: </span>
              <span
                className={`font-bold ${
                  completedIncome - completedExpense >= 0 ? 'text-sky-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(completedIncome - completedExpense)}
              </span>
            </div>
          </div>
        )}

        {activeStatusTab === 'pending' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-400">A Receber: </span>
              <span className="font-semibold text-sky-400">{formatCurrency(pendingIncome)}</span>
            </div>
            <div>
              <span className="text-slate-400">A Pagar: </span>
              <span className="font-semibold text-rose-400">{formatCurrency(pendingExpense)}</span>
            </div>
            <div>
              <span className="text-slate-400">Impacto Previsto: </span>
              <span
                className={`font-bold ${
                  pendingIncome - pendingExpense >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(pendingIncome - pendingExpense)}
              </span>
            </div>
          </div>
        )}

        {activeStatusTab === 'all' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-400">Receitas: </span>
              <span className="font-semibold text-sky-400">
                {formatCurrency(completedIncome + pendingIncome)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Despesas: </span>
              <span className="font-semibold text-rose-400">
                {formatCurrency(completedExpense + pendingExpense)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Balanço: </span>
              <span
                className={`font-bold ${
                  completedIncome + pendingIncome - (completedExpense + pendingExpense) >= 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}
              >
                {formatCurrency(completedIncome + pendingIncome - (completedExpense + pendingExpense))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Special contextual helper for Pending tab */}
      {activeStatusTab === 'pending' && transactions.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <span>
            Estes lançamentos ainda não foram compensados. Clique no botão de confirmação ao lado de cada item para marcá-lo como pago ou recebido.
          </span>
        </div>
      )}

      {/* Special contextual helper for Carried Over Debts */}
      {carriedOverCount > 0 && (
        <div id="banner-carried-over" className="p-3.5 bg-amber-950/30 border border-amber-800/70 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span className="truncate sm:text-clip">
              <strong>{carriedOverCount} pendência(s) do mês anterior</strong> vencida(s) foram trazidas para este mês mantendo suas informações originais.
            </span>
          </div>
          <span className="font-bold shrink-0 text-amber-300 bg-amber-900/60 px-2 py-1 rounded-md border border-amber-700/60">
            Total: {formatCurrency(carriedOverTotal)}
          </span>
        </div>
      )}

      {/* Transactions Table / List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xs overflow-hidden">
        {transactions.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {transactions.map((tx) => {
              const cat = categoryMap.get(tx.categoryId);
              const isIncome = tx.type === 'income';
              const isCompleted = tx.status === 'completed';

              return (
                <div
                  key={tx.id}
                  id={`transaction-${tx.id}`}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors ${
                    tx.isCarriedOver ? 'border-l-4 border-l-amber-500 bg-amber-950/15' : ''
                  }`}
                >
                  {/* Left: Icon, Description, Category, Date, Account */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Category Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0"
                      style={{
                        backgroundColor: cat?.bgColor || '#1e293b',
                        color: cat?.color || '#94a3b8',
                      }}
                    >
                      <CategoryIcon name={cat?.icon || 'DollarSign'} size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base truncate">
                          {tx.description}
                        </span>
                        {tx.isCarriedOver && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-800/90 px-2 py-0.5 rounded shadow-xs">
                            <AlertTriangle size={10} className="text-amber-400" /> Dívida vencida do mês anterior
                          </span>
                        )}
                        {tx.isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                            <Repeat size={10} /> Fixo
                          </span>
                        )}
                        {tx.isInstallment && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.5 rounded">
                            Parcela {tx.installmentNumber}/{tx.installmentTotal}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-1">
                        <span className="font-medium text-slate-300">
                          {cat?.name || 'Geral'}
                        </span>
                        <span>•</span>
                        <span className={tx.isCarriedOver ? 'text-amber-300 font-semibold' : ''}>
                          {tx.isCarriedOver ? 'Vencimento original' : 'Vencimento'}: {formatDate(tx.date)}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">{tx.account}</span>
                      </div>

                      {tx.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic flex items-center gap-1">
                          <FileText size={12} className="shrink-0 text-slate-500" />
                          <span className="truncate">{tx.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount, Status toggle, and Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {/* Status Pill (Clickable to toggle) */}
                    <button
                      onClick={() => onToggleStatus(tx.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-sky-950/80 text-sky-400 border border-sky-800/80 hover:bg-sky-900/60'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900/60 shadow-xs'
                      }`}
                      title={
                        isCompleted
                          ? isIncome
                            ? 'Alternar para A Receber'
                            : 'Alternar para Pendente'
                          : isIncome
                          ? 'Alternar para Recebido'
                          : 'Alternar para Pago'
                      }
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={13} className="text-sky-400" />
                          <span>{isIncome ? 'Recebido' : 'Pago'}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-amber-400" />
                          <span>{isIncome ? 'A Receber' : 'Pendente'}</span>
                        </>
                      )}
                    </button>

                    {/* Amount */}
                    <div className="text-right min-w-[110px]">
                      <div
                        className={`text-base font-bold flex items-center justify-end gap-0.5 ${
                          isIncome ? 'text-sky-400' : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight size={16} className="text-sky-400 stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight size={16} className="text-rose-400 stroke-[2.5]" />
                        )}
                        <span>
                          {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons (Edit, Delete) with touch friendly sizes */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Editar lançamento"
                        aria-label="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir lançamento"
                        aria-label="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
              {activeStatusTab === 'pending' ? <Clock size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <h3 className="font-semibold text-slate-200 text-base">
              {activeStatusTab === 'pending'
                ? 'Nenhum lançamento pendente!'
                : activeStatusTab === 'completed'
                ? 'Nenhum lançamento concluído neste período'
                : 'Nenhum lançamento encontrado'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeStatusTab === 'pending'
                ? 'Todas as suas contas e recebimentos estão em dia.'
                : 'Não encontramos nenhuma transação com os filtros aplicados ou para este mês.'}
            </p>
            <button
              onClick={onOpenNewTransaction}
              className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors shadow-sky-950/40"
            >
              <Plus size={14} />
              Criar transação
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
