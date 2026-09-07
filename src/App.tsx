import { useState } from 'react';
import { useFinanceData } from './hooks/useFinanceData';
import { ActiveTab, Transaction } from './types';
import { Navbar } from './components/Navbar';
import { Overview } from './components/Overview';
import { TransactionsList } from './components/TransactionsList';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { ExportImportModal } from './components/ExportImportModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';

export default function App() {
  const {
    isLoaded,
    transactions,
    categories,
    budgets,
    goals,
    accounts,
    filters,
    setFilters,
    availableMonths,
    categoryMap,
    summary,
    allTimeBalance,
    filteredTransactions,
    categoryExpenses,
    monthlyTrends,
    budgetsWithProgress,
    supabaseSync,
    refreshSupabaseCheck,
    syncAllToSupabaseAction,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionStatus,
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    depositToGoal,
    deleteGoal,
    exportToCSV,
    exportToJSON,
    importFromJSON,
    resetToDefaults,
  } = useFinanceData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const handleOpenNewTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  const handleSelectedMonthChange = (month: string) => {
    setFilters((prev) => ({ ...prev, month }));
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando Finance...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Top Sticky Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMonth={filters.month}
        setSelectedMonth={handleSelectedMonthChange}
        availableMonths={availableMonths}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenExportImport={() => setIsExportImportModalOpen(true)}
        supabaseSync={supabaseSync}
        onOpenSupabaseSync={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <Overview
            summary={summary}
            allTimeBalance={allTimeBalance}
            selectedMonth={filters.month}
            onSelectMonth={handleSelectedMonthChange}
            monthlyTrends={monthlyTrends}
            categoryExpenses={categoryExpenses}
            budgetsWithProgress={budgetsWithProgress}
            recentTransactions={filteredTransactions}
            categoryMap={categoryMap}
            onNavigateTab={setActiveTab}
            onOpenNewTransaction={handleOpenNewTransaction}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsList
            transactions={filteredTransactions}
            allTransactions={transactions}
            categories={categories}
            categoryMap={categoryMap}
            filters={filters}
            setFilters={setFilters}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={deleteTransaction}
            onToggleStatus={toggleTransactionStatus}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsView
            budgetsWithProgress={budgetsWithProgress}
            categories={categories}
            selectedMonth={filters.month}
            onAddBudget={addBudget}
            onUpdateBudget={updateBudget}
            onDeleteBudget={deleteBudget}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            goals={goals}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onDepositToGoal={depositToGoal}
            onDeleteGoal={deleteGoal}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            categories={categories}
            categoryMap={categoryMap}
            selectedMonth={filters.month}
            monthlyTrends={monthlyTrends}
          />
        )}
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={addTransaction}
        onUpdate={updateTransaction}
        editingTransaction={editingTransaction}
        categories={categories}
        accounts={accounts}
      />

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        onExportCSV={exportToCSV}
        onExportJSON={exportToJSON}
        onImportJSON={importFromJSON}
        onResetToDefaults={resetToDefaults}
        transactionCount={transactions.length}
      />

      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        syncState={supabaseSync}
        onRefreshCheck={refreshSupabaseCheck}
        onSyncAllToSupabase={syncAllToSupabaseAction}
        transactionCount={transactions.length}
      />
    </div>
  );
}
