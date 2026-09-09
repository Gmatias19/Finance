import { supabase } from '../utils/supabase/client';
import { Transaction, Budget, FinancialGoal, FinancialAccount } from '../types';

export interface SupabaseSyncState {
  status: 'checking' | 'connected' | 'needs_setup' | 'offline' | 'error';
  message: string;
  lastSyncedAt?: string;
  tablesFound?: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    accounts: boolean;
  };
}

// SQL Schema for the user to run in Supabase SQL Editor if tables don't exist yet
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCRIPT SQL COMPLETO: CONTROLE FINANCEIRO (FINANCE) - SUPABASE
-- Execute este script no "SQL Editor" do seu painel Supabase (https://supabase.com/dashboard)
-- Este script cria todas as tabelas, campos editáveis, políticas de segurança (RLS)
-- e habilita o Realtime para sincronização em tempo real entre todos os usuários.
-- ==============================================================================

-- 1. TABELA DE TRANSAÇÕES (RECEITAS E DESPESAS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id TEXT NOT NULL,
  date TEXT NOT NULL, -- Formato: YYYY-MM-DD
  payment_method TEXT NOT NULL, -- ex: pix, credit, debit, cash, transfer, other
  account TEXT NOT NULL, -- ex: Conta Corrente, Carteira, Nubank
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_group_id TEXT,
  is_installment BOOLEAN DEFAULT false,
  installment_group_id TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrações automáticas caso a tabela já tenha sido criada anteriormente:
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recurring_group_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_group_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_total INTEGER;

-- 2. TABELA DE ORÇAMENTOS MENSAIS
CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE METAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(12, 2) DEFAULT 0,
  target_date TEXT NOT NULL, -- Formato: YYYY-MM-DD
  category TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE CONTAS E CARTEIRAS
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- ex: checking, savings, investment, cash, credit
  balance NUMERIC(12, 2) DEFAULT 0,
  institution TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL,
  bg_color TEXT,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ÍNDICES PARA ALTA PERFORMANCE NAS CONSULTAS
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON public.budgets(category_id);

-- 7. REPLICA IDENTITY FULL (Necessário para broadcast completo de UPDATE e DELETE no Realtime)
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;

-- 8. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- Permite leitura, inserção, atualização e exclusão públicas para os usuários do app
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total em transacoes" ON public.transactions;
CREATE POLICY "Permitir acesso total em transacoes" ON public.transactions
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total em orcamentos" ON public.budgets;
CREATE POLICY "Permitir acesso total em orcamentos" ON public.budgets
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total em metas" ON public.goals;
CREATE POLICY "Permitir acesso total em metas" ON public.goals
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total em contas" ON public.accounts;
CREATE POLICY "Permitir acesso total em contas" ON public.accounts
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir acesso total em categorias" ON public.categories;
CREATE POLICY "Permitir acesso total em categorias" ON public.categories
  FOR ALL USING (true) WITH CHECK (true);

-- 9. HABILITAR PUBLICAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- Faz com que qualquer inserção, alteração ou exclusão seja transmitida instantaneamente a todos os usuários conectados
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
`;

/**
 * Check if the database tables exist in Supabase
 */
export async function checkSupabaseTables(): Promise<{
  available: boolean;
  needsSetup: boolean;
  tables: { transactions: boolean; budgets: boolean; goals: boolean; accounts: boolean };
  error?: string;
}> {
  try {
    const results = await Promise.allSettled([
      supabase.from('transactions').select('id').limit(1),
      supabase.from('budgets').select('id').limit(1),
      supabase.from('goals').select('id').limit(1),
      supabase.from('accounts').select('id').limit(1),
    ]);

    const txRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const bgRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const glRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const acRes = results[3].status === 'fulfilled' ? results[3].value : null;

    const txExists = !txRes?.error || txRes.error.code !== 'PGRST205';
    const bgExists = !bgRes?.error || bgRes.error.code !== 'PGRST205';
    const glExists = !glRes?.error || glRes.error.code !== 'PGRST205';
    const acExists = !acRes?.error || acRes.error.code !== 'PGRST205';

    const tables = {
      transactions: txExists,
      budgets: bgExists,
      goals: glExists,
      accounts: acExists,
    };

    const anyMissing = !txExists || !bgExists || !glExists;

    return {
      available: true,
      needsSetup: anyMissing,
      tables,
    };
  } catch (err: any) {
    return {
      available: false,
      needsSetup: true,
      tables: { transactions: false, budgets: false, goals: false, accounts: false },
      error: err?.message || 'Falha ao conectar com o Supabase',
    };
  }
}

export function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id || row.categoryId,
    date: row.date,
    paymentMethod: row.payment_method || row.paymentMethod,
    account: row.account,
    status: row.status || 'completed',
    isRecurring: !!row.is_recurring,
    recurringGroupId: row.recurring_group_id || undefined,
    isInstallment: !!row.is_installment,
    installmentGroupId: row.installment_group_id || undefined,
    installmentNumber: row.installment_number || undefined,
    installmentTotal: row.installment_total || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

/**
 * Load all transactions from Supabase
 */
export async function fetchSupabaseTransactions(): Promise<Transaction[] | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('[Supabase] Falha ao carregar transações:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map(mapRowToTransaction);
  } catch (e) {
    console.warn('[Supabase] Erro de rede ao buscar transações:', e);
    return null;
  }
}

/**
 * Insert or update batch of transactions in Supabase
 */
export async function upsertSupabaseTransactionsBatch(txs: Transaction[]): Promise<boolean> {
  try {
    const rows = txs.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.categoryId,
      date: tx.date,
      payment_method: tx.paymentMethod,
      account: tx.account,
      status: tx.status,
      is_recurring: !!tx.isRecurring,
      recurring_group_id: tx.recurringGroupId || null,
      is_installment: !!tx.isInstallment,
      installment_group_id: tx.installmentGroupId || null,
      installment_number: tx.installmentNumber || null,
      installment_total: tx.installmentTotal || null,
      notes: tx.notes || null,
      created_at: tx.createdAt || new Date().toISOString(),
    }));

    const { error } = await supabase.from('transactions').upsert(rows);
    if (error) {
      console.warn('[Supabase] Falha ao salvar lote de transações:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Erro ao sincronizar lote de transações:', err);
    return false;
  }
}

/**
 * Insert or update a single transaction in Supabase
 */
export async function upsertSupabaseTransaction(tx: Transaction): Promise<boolean> {
  try {
    const row = {
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.categoryId,
      date: tx.date,
      payment_method: tx.paymentMethod,
      account: tx.account,
      status: tx.status,
      is_recurring: !!tx.isRecurring,
      recurring_group_id: tx.recurringGroupId || null,
      is_installment: !!tx.isInstallment,
      installment_group_id: tx.installmentGroupId || null,
      installment_number: tx.installmentNumber || null,
      installment_total: tx.installmentTotal || null,
      notes: tx.notes || null,
      created_at: tx.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('transactions').upsert(row);
    if (error) {
      console.warn('[Supabase] Falha ao salvar transação:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Erro ao sincronizar transação:', err);
    return false;
  }
}

/**
 * Delete a transaction from Supabase
 */
export async function deleteSupabaseTransaction(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Falha ao excluir transação:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Erro ao excluir transação:', err);
    return false;
  }
}

/**
 * Fetch all budgets from Supabase
 */
export async function fetchSupabaseBudgets(): Promise<Budget[] | null> {
  try {
    const { data, error } = await supabase.from('budgets').select('*');
    if (error) {
      console.warn('[Supabase] Falha ao carregar orçamentos:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((b: any) => ({
      id: b.id,
      categoryId: b.category_id || b.categoryId,
      monthlyLimit: Number(b.monthly_limit || b.monthlyLimit),
      period: b.period || 'general',
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch all goals from Supabase
 */
export async function fetchSupabaseGoals(): Promise<FinancialGoal[] | null> {
  try {
    const { data, error } = await supabase.from('goals').select('*');
    if (error) {
      console.warn('[Supabase] Falha ao carregar metas:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((g: any) => ({
      id: g.id,
      title: g.title,
      targetAmount: Number(g.target_amount || g.targetAmount),
      currentAmount: Number(g.current_amount || g.currentAmount),
      targetDate: g.target_date || g.targetDate,
      category: g.category,
      icon: g.icon || undefined,
      color: g.color || undefined,
      notes: g.notes || undefined,
      completed: !!g.completed,
    }));
  } catch {
    return null;
  }
}

/**
 * Upsert Budget in Supabase
 */
export async function upsertSupabaseBudget(budget: Budget): Promise<boolean> {
  try {
    const row = {
      id: budget.id,
      category_id: budget.categoryId,
      monthly_limit: budget.monthlyLimit,
      period: budget.period || 'general',
    };
    const { error } = await supabase.from('budgets').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete Budget in Supabase
 */
export async function deleteSupabaseBudget(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Upsert Goal in Supabase
 */
export async function upsertSupabaseGoal(goal: FinancialGoal): Promise<boolean> {
  try {
    const row = {
      id: goal.id,
      title: goal.title,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      category: goal.category,
      icon: goal.icon || null,
      color: goal.color || null,
      notes: goal.notes || null,
      completed: !!goal.completed,
    };
    const { error } = await supabase.from('goals').upsert(row);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete Goal in Supabase
 */
export async function deleteSupabaseGoal(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync all local data to Supabase in batch
 */
export async function syncAllDataToSupabase(payload: {
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  accounts: FinancialAccount[];
}): Promise<{ success: boolean; message: string }> {
  try {
    // Check tables first
    const check = await checkSupabaseTables();
    if (check.needsSetup) {
      return {
        success: false,
        message:
          'As tabelas ainda não existem no seu banco Supabase. Copie e execute o script SQL no painel do Supabase.',
      };
    }

    // Upsert transactions
    if (payload.transactions.length > 0) {
      const txRows = payload.transactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category_id: tx.categoryId,
        date: tx.date,
        payment_method: tx.paymentMethod,
        account: tx.account,
        status: tx.status,
        is_recurring: !!tx.isRecurring,
        notes: tx.notes || null,
        created_at: tx.createdAt || new Date().toISOString(),
      }));
      const { error: txErr } = await supabase.from('transactions').upsert(txRows);
      if (txErr) throw new Error(`Transações: ${txErr.message}`);
    }

    // Upsert budgets
    if (payload.budgets.length > 0) {
      const budgetRows = payload.budgets.map((b) => ({
        id: b.id,
        category_id: b.categoryId,
        monthly_limit: b.monthlyLimit,
        period: b.period || 'general',
      }));
      await supabase.from('budgets').upsert(budgetRows);
    }

    // Upsert goals
    if (payload.goals.length > 0) {
      const goalRows = payload.goals.map((g) => ({
        id: g.id,
        title: g.title,
        target_amount: g.targetAmount,
        current_amount: g.currentAmount,
        target_date: g.targetDate,
        category: g.category,
        icon: g.icon || null,
        color: g.color || null,
        notes: g.notes || null,
        completed: !!g.completed,
      }));
      await supabase.from('goals').upsert(goalRows);
    }

    return {
      success: true,
      message: 'Todos os lançamentos, orçamentos e metas foram sincronizados com sucesso no Supabase!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao sincronizar: ${err?.message || 'Falha de comunicação'}`,
    };
  }
}
