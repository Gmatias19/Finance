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
import { supabase } from '../utils/supabase/client';
import {
  checkSupabaseTables,
  fetchSupabaseTransactions,
  fetchSupabaseBudgets,
  fetchSupabaseGoals,
  upsertSupabaseTransaction,
  upsertSupabaseTransactionsBatch,
  deleteSupabaseTransaction,
  upsertSupabaseBudget,
  deleteSupabaseBudget,
  upsertSupabaseGoal,
  deleteSupabaseGoal,
  syncAllDataToSupabase,
  mapRowToTransaction,
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
  const [liveStatus, setLiveStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');

  // Supabase sync state (optional auxiliary cloud backup)
  const [supabaseSync, setSupabaseSync] = useState<SupabaseSyncState>({
    status: 'checking',
    message: 'Sincronização em tempo real ativa.',
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

  // Fetch data from authoritative server
  const fetchServerData = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch('/api/finance-data');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transactions)) {
          // If server already has transactions or it's not initial, adopt server state
          if (data.transactions.length > 0 || !isInitial) {
            setTransactions(data.transactions);
          } else if (isInitial) {
            // First time migration: check if user had local offline data
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              try {
                const parsed: StoredData = JSON.parse(saved);
                if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                  setTransactions(parsed.transactions);
                  // Upload to server so all users share it
                  fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transactions: parsed.transactions,
                      budgets: parsed.budgets || [],
                      goals: parsed.goals || [],
                      accounts: parsed.accounts || DEFAULT_ACCOUNTS,
                      categories: parsed.categories || DEFAULT_CATEGORIES,
                    }),
                  }).catch(console.warn);
                }
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
        if (Array.isArray(data.budgets)) setBudgets(data.budgets);
        if (Array.isArray(data.goals)) setGoals(data.goals);
        if (Array.isArray(data.accounts) && data.accounts.length > 0) setAccounts(data.accounts);
        if (Array.isArray(data.categories) && data.categories.length > 0) setCategories(data.categories);
      }
    } catch (err) {
      console.warn('[Realtime Sync] Servidor indisponível, usando cache local:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Initialize data from Supabase and subscribe to real-time events
  useEffect(() => {
    // 1. Initial local cache check for zero-latency paint
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredData = JSON.parse(saved);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) setCategories(parsed.categories);
        if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
        if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
        if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
      }
    } catch (e) {
      console.error('Failed to load local finance data', e);
    }

    // 2. Fetch authoritative data from Supabase (primary cloud database)
    const loadFromSupabase = async () => {
      try {
        const [sbTxs, sbBudgets, sbGoals] = await Promise.all([
          fetchSupabaseTransactions(),
          fetchSupabaseBudgets(),
          fetchSupabaseGoals(),
        ]);

        if (sbTxs !== null) {
          setSupabaseSync({
            status: 'connected',
            message: 'Conectado ao Supabase (Tempo Real Ativo)',
            lastSyncedAt: new Date().toISOString(),
          });

          if (sbTxs.length > 0) {
            setTransactions(sbTxs);
          } else {
            // First time migration: if Supabase table is empty, auto-seed local/default data
            const saved = localStorage.getItem(STORAGE_KEY);
            let toSeed = DEFAULT_TRANSACTIONS;
            if (saved) {
              try {
                const parsed: StoredData = JSON.parse(saved);
                if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                  toSeed = parsed.transactions;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            setTransactions(toSeed);
            upsertSupabaseTransactionsBatch(toSeed).catch(console.warn);
          }

          if (sbBudgets && sbBudgets.length > 0) setBudgets(sbBudgets);
          if (sbGoals && sbGoals.length > 0) setGoals(sbGoals);

          setIsLoaded(true);
          return true;
        }
      } catch (err) {
        console.warn('[Supabase Init] Erro ao carregar dados do Supabase:', err);
      }
      return false;
    };

    loadFromSupabase().then((ok) => {
      if (!ok) {
        // Fallback to local server if Supabase is offline or tables missing
        fetchServerData(true);
      }
    });

    // 3. Connect to Supabase Realtime channel for instant multi-user synchronization
    const supabaseChannel = supabase
      .channel('supabase-realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload: any) => {
          console.log('[Supabase Realtime] Transações alteradas:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTx = mapRowToTransaction(payload.new);
            setTransactions((prev) => {
              if (prev.some((t) => t.id === newTx.id)) {
                return prev.map((t) => (t.id === newTx.id ? newTx : t));
              }
              return [newTx, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedTx = mapRowToTransaction(payload.new);
            setTransactions((prev) =>
              prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setTransactions((prev) => prev.filter((t) => t.id !== deletedId));
            } else {
              fetchSupabaseTransactions().then((txs) => {
                if (txs) setTransactions(txs);
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        async () => {
          const bList = await fetchSupabaseBudgets();
          if (bList) setBudgets(bList);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        async () => {
          const gList = await fetchSupabaseGoals();
          if (gList) setGoals(gList);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setLiveStatus('connected');
          setSupabaseSync((prev) => ({
            ...prev,
            status: 'connected',
            message: 'Supabase Conectado em Tempo Real',
            lastSyncedAt: new Date().toISOString(),
          }));
        }
      });

    // 4. Also keep WebSocket connection to local server for backwards compatibility
    let ws: WebSocket | null = null;
    let pingInterval: any = null;
    let reconnectTimeout: any = null;
    let isCleanedUp = false;

    const connectWebSocket = () => {
      if (isCleanedUp) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'FULL_SYNC' && msg.data) {
              if (Array.isArray(msg.data.transactions)) setTransactions(msg.data.transactions);
              if (Array.isArray(msg.data.budgets)) setBudgets(msg.data.budgets);
              if (Array.isArray(msg.data.goals)) setGoals(msg.data.goals);
            }
          } catch (e) {
            console.warn('[Realtime] Erro ao interpretar payload:', e);
          }
        };

        ws.onclose = () => {
          clearInterval(pingInterval);
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(connectWebSocket, 4000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        }
      }
    };

    connectWebSocket();

    // 5. Background refresh when tab gains focus or every 8s
    const refreshAllData = async () => {
      const txs = await fetchSupabaseTransactions();
      if (txs) setTransactions(txs);
      const bList = await fetchSupabaseBudgets();
      if (bList) setBudgets(bList);
      const gList = await fetchSupabaseGoals();
      if (gList) setGoals(gList);
      fetchServerData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    }, 8000);

    return () => {
      isCleanedUp = true;
      clearInterval(pingInterval);
      clearInterval(pollTimer);
      clearTimeout(reconnectTimeout);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      if (ws) ws.close();
      supabase.removeChannel(supabaseChannel);
    };
  }, [fetchServerData]);

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
    if (filters.month && filters.month !== 'all') {
      monthsSet.add(filters.month);
    }
    transactions.forEach((tx) => {
      if (tx.date) {
        monthsSet.add(tx.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions, filters.month]);

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

  // Action methods - saves locally, persists to central server and broadcasts to all users in realtime
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    // 1. Optimistic instant local update
    setTransactions((prev) => [newTx, ...prev]);

    // 2. Persist to central server & broadcast to all connected users
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch((err) => {
      console.warn('[Sync] Erro ao sincronizar nova transação no servidor:', err);
    });

    // 3. Asynchronous background persistence to Supabase (if available)
    upsertSupabaseTransaction(newTx).catch((err) => {
      console.warn('[Supabase] Erro ao sincronizar nova transação:', err);
    });

    return newTx;
  };

  const addTransactionsBatch = (txsData: Array<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const createdItems: Transaction[] = txsData.map((txData, idx) => ({
      ...txData,
      id: `tx_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    // 1. Optimistic local update
    setTransactions((prev) => [...createdItems, ...prev]);

    // 2. Central server persist & broadcast
    fetch('/api/transactions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createdItems),
    }).catch((err) => {
      console.warn('[Sync] Erro ao sincronizar lote de transações:', err);
    });

    // 3. Supabase batch sync
    upsertSupabaseTransactionsBatch(createdItems).catch((err) => {
      console.warn('[Supabase] Erro ao sincronizar lote:', err);
    });

    return createdItems;
  };

  const updateTransaction = (id: string, txData: Partial<Transaction>) => {
    setTransactions((prev) => {
      const updatedList = prev.map((t) => (t.id === id ? { ...t, ...txData } : t));
      const target = updatedList.find((t) => t.id === id);
      if (target) {
        // Send to central server
        fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch((err) => {
          console.warn('[Sync] Erro ao atualizar transação no servidor:', err);
        });

        // Supabase sync
        upsertSupabaseTransaction(target).catch((err) => {
          console.warn('[Supabase] Erro ao atualizar transação:', err);
        });
      }
      return updatedList;
    });
  };

  const updateRecurringGroup = (
    groupId: string,
    fromDate: string,
    updates: Partial<Transaction>,
    currentId: string
  ) => {
    setTransactions((prev) => {
      const affectedIds: string[] = [];
      const updatedList = prev.map((t) => {
        // Always apply updates to the current edited transaction
        if (t.id === currentId) {
          affectedIds.push(t.id);
          return { ...t, ...updates };
        }
        // For other recurring items in this group: ONLY update if status is 'pending' (do not touch paid/received!)
        if (t.recurringGroupId === groupId && t.status === 'pending' && t.date >= fromDate) {
          affectedIds.push(t.id);
          return {
            ...t,
            amount: updates.amount !== undefined ? updates.amount : t.amount,
            type: updates.type !== undefined ? updates.type : t.type,
            categoryId: updates.categoryId !== undefined ? updates.categoryId : t.categoryId,
            paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : t.paymentMethod,
            account: updates.account !== undefined ? updates.account : t.account,
            description: updates.description !== undefined ? updates.description : t.description,
            notes: updates.notes !== undefined ? updates.notes : t.notes,
          };
        }
        return t;
      });

      // Central server batch update
      fetch('/api/transactions/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: affectedIds,
          updates: {
            amount: updates.amount,
            type: updates.type,
            categoryId: updates.categoryId,
            paymentMethod: updates.paymentMethod,
            account: updates.account,
            description: updates.description,
            notes: updates.notes,
          },
        }),
      }).catch(console.warn);

      // Supabase batch sync
      const affectedTxs = updatedList.filter((t) => affectedIds.includes(t.id));
      upsertSupabaseTransactionsBatch(affectedTxs).catch(console.warn);

      return updatedList;
    });
  };

  const updateInstallmentGroup = (
    groupId: string,
    fromNumber: number,
    updates: Partial<Transaction>,
    currentId: string
  ) => {
    setTransactions((prev) => {
      const affectedIds: string[] = [];
      const updatedList = prev.map((t) => {
        // Update current transaction
        if (t.id === currentId) {
          affectedIds.push(t.id);
          return { ...t, ...updates };
        }
        // For other installments: ONLY update if status is 'pending' and installmentNumber >= fromNumber (never touch completed!)
        if (
          t.installmentGroupId === groupId &&
          t.status === 'pending' &&
          (t.installmentNumber || 0) >= fromNumber
        ) {
          affectedIds.push(t.id);
          let updatedDesc = t.description;
          if (updates.description) {
            const baseCleanDesc = updates.description.replace(/\s*\d+\/\d+$/, '');
            updatedDesc = `${baseCleanDesc} ${t.installmentNumber}/${t.installmentTotal}`;
          }
          return {
            ...t,
            amount: updates.amount !== undefined ? updates.amount : t.amount,
            type: updates.type !== undefined ? updates.type : t.type,
            categoryId: updates.categoryId !== undefined ? updates.categoryId : t.categoryId,
            paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : t.paymentMethod,
            account: updates.account !== undefined ? updates.account : t.account,
            description: updatedDesc,
            notes: updates.notes !== undefined ? updates.notes : t.notes,
          };
        }
        return t;
      });

      const affectedTxs = updatedList.filter((t) => affectedIds.includes(t.id));
      upsertSupabaseTransactionsBatch(affectedTxs).catch(console.warn);

      affectedTxs.forEach((tx) => {
        fetch(`/api/transactions/${tx.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx),
        }).catch(console.warn);
      });

      return updatedList;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Send to central server
    fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.warn('[Sync] Erro ao deletar transação no servidor:', err);
    });

    // Supabase sync
    deleteSupabaseTransaction(id).catch((err) => {
      console.warn('[Supabase] Erro ao deletar transação:', err);
    });
  };

  const toggleTransactionStatus = (id: string) => {
    setTransactions((prev) => {
      let target: Transaction | undefined;
      const updatedList = prev.map((t) => {
        if (t.id === id) {
          target = {
            ...t,
            status: (t.status === 'completed' ? 'pending' : 'completed') as 'completed' | 'pending',
          };
          return target;
        }
        return t;
      });

      if (target) {
        fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch(console.warn);

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

    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBudget),
    }).catch(console.warn);

    upsertSupabaseBudget(newBudget).catch(console.warn);
  };

  const updateBudget = (id: string, budgetData: Partial<Budget>) => {
    setBudgets((prev) => {
      const updatedList = prev.map((b) => (b.id === id ? { ...b, ...budgetData } : b));
      const target = updatedList.find((b) => b.id === id);
      if (target) {
        fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch(console.warn);
        upsertSupabaseBudget(target).catch(console.warn);
      }
      return updatedList;
    });
  };

  const deleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    fetch(`/api/budgets/${id}`, { method: 'DELETE' }).catch(console.warn);
    deleteSupabaseBudget(id).catch(console.warn);
  };

  const addGoal = (goalData: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: `g_${Date.now()}`,
    };
    setGoals((prev) => [...prev, newGoal]);

    fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal),
    }).catch(console.warn);

    upsertSupabaseGoal(newGoal).catch(console.warn);
  };

  const updateGoal = (id: string, goalData: Partial<FinancialGoal>) => {
    setGoals((prev) => {
      const updatedList = prev.map((g) => (g.id === id ? { ...g, ...goalData } : g));
      const target = updatedList.find((g) => g.id === id);
      if (target) {
        fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch(console.warn);
        upsertSupabaseGoal(target).catch(console.warn);
      }
      return updatedList;
    });
  };

  const depositToGoal = (id: string, amount: number) => {
    setGoals((prev) => {
      let target: FinancialGoal | undefined;
      const updatedList = prev.map((g) => {
        if (g.id === id) {
          const newAmount = Math.max(0, g.currentAmount + amount);
          const completed = newAmount >= g.targetAmount;
          target = {
            ...g,
            currentAmount: newAmount,
            completed,
          };
          return target;
        }
        return g;
      });

      if (target) {
        fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target),
        }).catch(console.warn);
        upsertSupabaseGoal(target).catch(console.warn);
      }
      return updatedList;
    });
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    fetch(`/api/goals/${id}`, { method: 'DELETE' }).catch(console.warn);
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
      if (Array.isArray(parsed.accounts)) {
        setAccounts(parsed.accounts);
      }

      // Propagate to central server
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: parsed.transactions,
          categories: parsed.categories,
          budgets: parsed.budgets,
          goals: parsed.goals,
          accounts: parsed.accounts,
        }),
      }).catch(console.warn);

      return { success: true, message: 'Dados restaurados e sincronizados com sucesso!' };
    } catch {
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

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: DEFAULT_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES,
        budgets: DEFAULT_BUDGETS,
        goals: DEFAULT_GOALS,
        accounts: DEFAULT_ACCOUNTS,
      }),
    }).catch(console.warn);
  };

  return {
    isLoaded,
    liveStatus,
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
    addTransactionsBatch,
    updateTransaction,
    updateRecurringGroup,
    updateInstallmentGroup,
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
