export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 
  | 'pix' 
  | 'credit_card' 
  | 'debit_card' 
  | 'bank_transfer' 
  | 'cash' 
  | 'boleto'
  | 'other';

export interface Category {
  id: string;
  name: string;
  type: TransactionType | 'both';
  icon: string;
  color: string;
  bgColor: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string; // YYYY-MM-DD (Data de Vencimento)
  paymentMethod: PaymentMethod;
  account: string;
  status: 'completed' | 'pending';
  isRecurring?: boolean;
  recurringGroupId?: string;
  isInstallment?: boolean;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  notes?: string;
  createdAt: string;
  isCarriedOver?: boolean;
  originalDueDate?: string;
  carriedOverFromMonth?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  period: string; // '2026-09' or general monthly
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  icon?: string;
  color?: string;
  notes?: string;
  completed?: boolean;
}

export type Goal = FinancialGoal;

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit' | 'wallet';
  balance: number;
  institution: string;
  color: string;
}

export interface FilterOptions {
  search: string;
  type: 'all' | 'income' | 'expense';
  categoryId: string;
  paymentMethod: string;
  status: 'all' | 'completed' | 'pending';
  month: string; // 'all' or 'YYYY-MM'
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

export type ActiveTab = 'overview' | 'transactions' | 'budgets' | 'goals' | 'reports';
