import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Category,
  Budget,
  FinancialGoal,
  FinancialAccount,
  FilterOptions,
} from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TRANSACTIONS,
  DEFAULT_BUDGETS,
  DEFAULT_GOALS,
  DEFAULT_ACCOUNTS,
} from '../data/defaultData';
import { getCurrentYearMonth, formatCurrency, formatDate } from '../utils/formatters';
import {
  checkSupabaseTables,
  fetchSupabaseTransactions,
  upsertSupabaseTransaction,
  deleteSupabaseTransaction,
  upsertSupabaseBudget,
  deleteSupabaseBudget,
  upsertSupabaseGoal,
  deleteSupabaseGoal,
  syncAllDataToSupabase,
  SupabaseSyncState,
} from '../services/supabaseService';

const STORAGE_KEY = 'controle_financeiro_data_v4';

interface StoredData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: FinancialGoal[];
  accounts: FinancialAccount[];
}

export function useFinanceData() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>(DEFAULT_BUDGETS);
  const [goals, setGoals] = useState<FinancialGoal[]>(DEFAULT_GOALS);
  const [accounts, setAccounts] = useState<FinancialAccount[]>(DEFAULT_ACCOUNTS);

  // Supabase sync state
  const [supabaseSync, setSupabaseSync] = useState<SupabaseSyncState>({
    status: 'checking',
    message: 'Verificando conexão com o Supabase...',
  });

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: 'all',
    categoryId: 'all',
    paymentMethod: 'all',
    status: 'all',
    month: getCurrentYearMonth(), // e.g. "2026-09"
    sortBy: 'date-desc',
  });

  // Initialize data from local cache and check Supabase
  useEffect(() => {
    let initialTransactions = DEFAULT_TRANSACTIONS;
    try {
      localStorage.removeItem('controle_financeiro_data_v2');
      localStorage.removeItem('controle_financeiro_data_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredData = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
          initialTransactions = parsed.transactions;
        }
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) setCategories(parsed.categories);
        if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
        if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
        if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
      } else {
        setTransactions(DEFAULT_TRANSACTIONS);
        setCategories(DEFAULT_CATEGORIES);
        setBudgets(DEFAULT_BUDGETS);
        setGoals(DEFAULT_GOALS);
        setAccounts(DEFAULT_ACCOUNTS);
      }
    } catch (e) {
      console.error('Failed to load local finance data', e);
      setTransactions(DEFAULT_TRANSACTIONS);
    } finally {
      setIsLoaded(true);
    }

    // Check Supabase connection and tables asynchronously
    const initSupabase = async () => {
      try {
        const check = await checkSupabaseTables();
        if (!check.available) {
          setSupabaseSync({
            status: 'offline',
            message: check.error || 'Não foi possível conectar ao Supabase.',
          });
          return;
        }

        if (check.needsSetup) {
          setSupabaseSync({
            status: 'needs_setup',
            message: 'Conectado ao Supabase. Crie as tabelas com o script SQL para persistência na nuvem.',
            tablesFound: check.tables,
          });
          return;
        }

        setSupabaseSync({
          status: 'connected',
          message: 'Conectado e sincronizado com o Supabase.',
          lastSyncedAt: new Date().toISOString(),
          tablesFound: check.tables,
        });

        // Load remote transactions if present
        const remoteTx = await fetchSupabaseTransactions();
        if (remoteTx && remoteTx.length > 0) {
          setTransactions(remoteTx);
        }
      } catch (err: any) {
        setSupabaseSync({
          status: 'offline',
          message: err?.message || 'Falha de comunicação com o Supabase.',
        });
      }
    };

    initSupabase();
  }, []);

  // Save changes to localStorage as fallback and local offline cache
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const payload: StoredData = {
        transactions,
        categories,
        budgets,
        goals,
        accounts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [transactions, categories, budgets, goals, accounts, isLoaded]);

  // Re-check Supabase tables and connection
  const refreshSupabaseCheck = useCallback(async () => {
    setSupabaseSync((prev) => ({ ...prev, status: 'checking', message: 'Consultando Supabase...' }));
    const check = await checkSupabaseTables();
    if (!check.available) {
      setSupabaseSync({
        status: 'offline',
        message: check.error || 'Falha de conexão com o Supabase.',
      });
      return;
    }
    if (check.needsSetup) {
      setSupabaseSync({
        status: 'needs_setup',
        message: 'Conectado. Crie as tabelas com o script SQL.',
        tablesFound: check.tables,
      });
      return;
    }
    setSupabaseSync({
      status: 'connected',
      message: 'Conectado e sincronizado com o Supabase.',
      lastSyncedAt: new Date().toISOString(),
      tablesFound: check.tables,
    });
    const remoteTx = await fetchSupabaseTransactions();
    if (remoteTx && remoteTx.length > 0) {
      setTransactions(remoteTx);
    }
  }, []);

  // Batch sync all local data to Supabase
  const syncAllToSupabaseAction = useCallback(async () => {
    setSupabaseSync((prev) => ({
      ...prev,
      status: 'syncing',
      message: 'Enviando todos os dados para o Supabase...',
    }));

    const result = await syncAllDataToSupabase({
      transactions,
      budgets,
      goals,
      accounts,
    });

    if (result.success) {
      setSupabaseSync((prev) => ({
        ...prev,
        status: 'connected',
        message: 'Dados sincronizados com sucesso no Supabase!',
        lastSyncedAt: new Date().toISOString(),
      }));
    } else {
      setSupabaseSync((prev) => ({
        ...prev,
        status: prev.tablesFound?.transactions ? 'connected' : 'needs_setup',
        message: result.message,
      }));
    }
    return result;
  }, [transactions, budgets, goals, accounts]);

  // Unique list of available months in transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(getCurrentYearMonth());
    transactions.forEach((tx) => {
      if (tx.date) {
        monthsSet.add(tx.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Map of categories by ID for instant lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Current month's transactions (for summary metrics)
  const currentMonthTransactions = useMemo(() => {
    if (filters.month === 'all') return transactions;
    return transactions.filter((t) => t.date.startsWith(filters.month));
  }, [transactions, filters.month]);

  // Financial summary for selected month
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    currentMonthTransactions.forEach((t) => {
      if (t.type === 'income') {
        if (t.status === 'completed') income += t.amount;
        else pendingIncome += t.amount;
      } else {
        if (t.status === 'completed') expense += t.amount;
        else pendingExpense += t.amount;
      }
    });

    const netBalance = income - expense;
    const projectedBalance = (income + pendingIncome) - (expense + pendingExpense);
    const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;

    return {
      income,
      expense,
      pendingIncome,
      pendingExpense,
      netBalance,
      projectedBalance,
      savingsRate,
      transactionCount: currentMonthTransactions.length,
    };
  }, [currentMonthTransactions]);

  // Overall all-time balance
  const allTimeBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.status === 'completed') {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, 0);
  }, [transactions]);

  // Filtered transactions for list view
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month filter
      if (filters.month !== 'all' && !t.date.startsWith(filters.month)) {
        return false;
      }
      // Type filter
      if (filters.type !== 'all' && t.type !== filters.type) {
        return false;
      }
      // Category filter
      if (filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) {
        return false;
      }
      // Payment method
      if (filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) {
        return false;
      }
      // Status filter
      if (filters.status !== 'all' && t.status !== filters.status) {
        return false;
      }
      // Search text
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const categoryName = categoryMap.get(t.categoryId)?.name.toLowerCase() || '';
        const descMatches = t.description.toLowerCase().includes(query);
        const notesMatches = t.notes?.toLowerCase().includes(query);
        const accountMatches = t.account.toLowerCase().includes(query);
        if (!descMatches && !notesMatches && !accountMatches && !categoryName.includes(query)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (filters.sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (filters.sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (filters.sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, filters, categoryMap]);

  // Expenses grouped by category (for pie chart and budget analysis)
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .forEach((t) => {
        map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
      });

    return Array.from(map.entries())
      .map(([catId, total]) => {
        const cat = categoryMap.get(catId);
        return {
          categoryId: catId,
          name: cat ? cat.name : 'Outros',
          color: cat ? cat.color : '#64748b',
          amount: total,
          percentage: summary.expense > 0 ? (total / summary.expense) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions, categoryMap, summary.expense]);

  // Monthly flow data for 6 recent months
  const monthlyTrends = useMemo(() => {
    const months: string[] = Array.from(
      new Set<string>(transactions.map((t) => t.date.substring(0, 7)))
    ).sort().slice(-6);

    return months.map((m: string) => {
      let income = 0;
      let expense = 0;
      transactions.forEach((t) => {
        if (t.date.startsWith(m) && t.status === 'completed') {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });
      const [year, month] = m.split('-');
      const label = `${month}/${year.slice(-2)}`;
      return {
        month: m,
        label,
        Receitas: income,
        Despesas: expense,
        Saldo: income - expense,
      };
    });
  }, [transactions]);

  // Budgets health calculation
  const budgetsWithProgress = useMemo(() => {
    return budgets.map((b) => {
      const cat = categoryMap.get(b.categoryId);
      const spent = currentMonthTransactions
        .filter((t) => t.categoryId === b.categoryId && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      const remaining = b.monthlyLimit - spent;

      return {
        ...b,
        category: cat,
        spent,
        percentage,
        remaining,
        isOverLimit: spent > b.monthlyLimit,
      };
    });
  }, [budgets, categoryMap, currentMonthTransactions]);

  // Action methods - saves locally and syncs with Supabase
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    // Asynchronous background persistence to Supabase
    upsertSupabaseTransaction(newTx).catch((err) => {
      console.warn('[Supabase] Erro ao sincronizar nova transação:', err);
    });
    return newTx;
  };

  const updateTransaction = (id: string, txData: Partial<Transaction>) => {
    setTransactions((prev) => {
      const updatedList = prev.map((t) => (t.id === id ? { ...t, ...txData } : t));
      const target = updatedList.find((t) => t.id === id);
      if (target) {
        upsertSupabaseTransaction(target).catch((err) => {
          console.warn('[Supabase] Erro ao atualizar transação:', err);
        });
      }
      return updatedList;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteSupabaseTransaction(id).catch((err) => {
      console.warn('[Supabase] Erro ao deletar transação:', err);
    });
  };

  const toggleTransactionStatus = (id: string) => {
    setTransactions((prev) => {
      const updatedList = prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            status: (t.status === 'completed' ? 'pending' : 'completed') as 'completed' | 'pending',
          };
        }
        return t;
      });
      const target = updatedList.find((t) => t.id === id);
      if (target) {
        upsertSupabaseTransaction(target).catch(console.warn);
      }
      return updatedList;
    });
  };

  const addBudget = (budgetData: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: `b_${Date.now()}`,
    };
    setBudgets((prev) => [...prev, newBudget]);
    upsertSupabaseBudget(newBudget).catch(console.warn);
  };

  const updateBudget = (id: string, budgetData: Partial<Budget>) => {
    setBudgets((prev) => {
      const updatedList = prev.map((b) => (b.id === id ? { ...b, ...budgetData } : b));
      const target = updatedList.find((b) => b.id === id);
      if (target) upsertSupabaseBudget(target).catch(console.warn);
      return updatedList;
    });
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    deleteSupabaseBudget(id).catch(console.warn);
  };

  const addGoal = (goalData: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: `g_${Date.now()}`,
    };
    setGoals((prev) => [...prev, newGoal]);
    upsertSupabaseGoal(newGoal).catch(console.warn);
  };

  const updateGoal = (id: string, goalData: Partial<FinancialGoal>) => {
    setGoals((prev) => {
      const updatedList = prev.map((g) => (g.id === id ? { ...g, ...goalData } : g));
      const target = updatedList.find((g) => g.id === id);
      if (target) upsertSupabaseGoal(target).catch(console.warn);
      return updatedList;
    });
  };

  const depositToGoal = (id: string, amount: number) => {
    setGoals((prev) => {
      const updatedList = prev.map((g) => {
        if (g.id === id) {
          const newAmount = Math.max(0, g.currentAmount + amount);
          const completed = newAmount >= g.targetAmount;
          return {
            ...g,
            currentAmount: newAmount,
            completed,
          };
        }
        return g;
      });
      const target = updatedList.find((g) => g.id === id);
      if (target) upsertSupabaseGoal(target).catch(console.warn);
      return updatedList;
    });
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    deleteSupabaseGoal(id).catch(console.warn);
  };

  // Export transactions as CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Forma de Pagamento', 'Status', 'Conta', 'Observações'];
    const rows = transactions.map((t) => {
      const catName = categoryMap.get(t.categoryId)?.name || 'Outros';
      return [
        formatDate(t.date),
        t.type === 'income' ? 'Receita' : 'Despesa',
        `"${t.description.replace(/"/g, '""')}"`,
        `"${catName.replace(/"/g, '""')}"`,
        t.amount.toFixed(2).replace('.', ','),
        t.paymentMethod,
        t.status === 'completed' ? 'Pago' : 'Pendente',
        `"${t.account.replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `controle_financeiro_${filters.month}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full backup as JSON
  const exportToJSON = () => {
    const data: StoredData = {
      transactions,
      categories,
      budgets,
      goals,
      accounts,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  // Import JSON backup
  const importFromJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        return { success: false, message: 'Arquivo JSON inválido: nenhuma transação encontrada.' };
      }
      setTransactions(parsed.transactions);
      if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        setCategories(parsed.categories);
      }
      if (Array.isArray(parsed.budgets)) {
        setBudgets(parsed.budgets);
      }
      if (Array.isArray(parsed.goals)) {
        setGoals(parsed.goals);
      }
      return { success: true, message: 'Dados restaurados com sucesso!' };
    } catch (err) {
      return { success: false, message: 'Erro ao processar arquivo JSON. Verifique o formato.' };
    }
  };

  // Reset to default sample state
  const resetToDefaults = () => {
    setTransactions(DEFAULT_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setBudgets(DEFAULT_BUDGETS);
    setGoals(DEFAULT_GOALS);
    setAccounts(DEFAULT_ACCOUNTS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
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
  };
}
