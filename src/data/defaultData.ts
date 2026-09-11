import { Category, Transaction, Budget, FinancialGoal, FinancialAccount } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Despesas
  {
    id: 'cat_alimentacao',
    name: 'Alimentação',
    type: 'expense',
    icon: 'Utensils',
    color: '#f97316', // Laranja
    bgColor: '#fff7ed',
  },
  {
    id: 'cat_moradia',
    name: 'Moradia & Contas',
    type: 'expense',
    icon: 'Home',
    color: '#0284c7', // Azul Baleia
    bgColor: '#f0f9ff',
  },
  {
    id: 'cat_transporte',
    name: 'Transporte',
    type: 'expense',
    icon: 'Car',
    color: '#6366f1', // Índigo
    bgColor: '#eef2ff',
  },
  {
    id: 'cat_lazer',
    name: 'Lazer & Entretenimento',
    type: 'expense',
    icon: 'PartyPopper',
    color: '#ec4899', // Rosa
    bgColor: '#fdf2f8',
  },
  {
    id: 'cat_saude',
    name: 'Saúde & Bem-estar',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#ef4444', // Vermelho
    bgColor: '#fef2f2',
  },
  {
    id: 'cat_educacao',
    name: 'Educação',
    type: 'expense',
    icon: 'GraduationCap',
    color: '#06b6d4', // Ciano Oceânico
    bgColor: '#ecfeff',
  },
  {
    id: 'cat_compras',
    name: 'Compras & Vestuário',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#eab308', // Amarelo
    bgColor: '#fefce8',
  },
  {
    id: 'cat_servicos',
    name: 'Assinaturas & Serviços',
    type: 'expense',
    icon: 'Tv',
    color: '#8b5cf6', // Violeta
    bgColor: '#f5f3ff',
  },
  {
    id: 'cat_despesa_outros',
    name: 'Outras Despesas',
    type: 'expense',
    icon: 'MoreHorizontal',
    color: '#64748b', // Ardósia
    bgColor: '#f8fafc',
  },

  // Receitas (Azul Baleia e nuances oceânicas)
  {
    id: 'cat_salario',
    name: 'Salário & Pró-labore',
    type: 'income',
    icon: 'Briefcase',
    color: '#0284c7', // Azul Baleia
    bgColor: '#f0f9ff',
  },
  {
    id: 'cat_freelance',
    name: 'Freelance & Serviços',
    type: 'income',
    icon: 'Laptop',
    color: '#0ea5e9', // Azul Céu Oceânico
    bgColor: '#f0f9ff',
  },
  {
    id: 'cat_investimentos',
    name: 'Rendimentos & Dividendos',
    type: 'income',
    icon: 'TrendingUp',
    color: '#0369a1', // Azul Baleia Profundo
    bgColor: '#f0f9ff',
  },
  {
    id: 'cat_receita_outros',
    name: 'Outras Receitas',
    type: 'income',
    icon: 'Coins',
    color: '#38bdf8', // Azul Baleia Claro
    bgColor: '#f0f9ff',
  },
];

// Contas com saldos zerados
export const DEFAULT_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc_corrente',
    name: 'Conta corrente',
    type: 'checking',
    balance: 0.00,
    institution: 'Conta corrente',
    color: '#0284c7', // Azul Baleia
  },
  {
    id: 'acc_poupanca',
    name: 'Poupança',
    type: 'savings',
    balance: 0.00,
    institution: 'Poupança',
    color: '#10b981', // Verde Esmeralda
  },
];

// Registros zerados conforme solicitado pelo usuário
export const DEFAULT_BUDGETS: Budget[] = [];

export const DEFAULT_GOALS: FinancialGoal[] = [];

export const DEFAULT_TRANSACTIONS: Transaction[] = [];
