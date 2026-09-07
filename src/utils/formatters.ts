// Format currency to Brazilian Real (BRL)
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format short date (e.g. "07/09/2026")
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
};

// Format date with full month (e.g. "7 de Setembro de 2026")
export const formatDateLong = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

// Format month and year label (e.g. "Setembro de 2026")
export const formatMonthYear = (yearMonthString: string): string => {
  if (!yearMonthString || yearMonthString === 'all') return 'Todos os Períodos';
  const [year, month] = yearMonthString.split('-').map(Number);
  if (!year || !month) return yearMonthString;
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Format short month (e.g. "Set/26")
export const formatShortMonth = (yearMonthString: string): string => {
  if (!yearMonthString) return '';
  const [year, month] = yearMonthString.split('-').map(Number);
  if (!year || !month) return yearMonthString;
  const date = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date);
  return `${monthName.replace('.', '')}/${year.toString().slice(-2)}`;
};

// Get today as YYYY-MM-DD
export const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get current year and month as YYYY-MM
export const getCurrentYearMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Calculate previous or next month (delta: -1 for previous, +1 for next)
export const getAdjacentMonth = (yearMonthString: string, delta: number): string => {
  let base = yearMonthString;
  if (!base || base === 'all') {
    base = getCurrentYearMonth();
  }
  const [year, month] = base.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Human payment method names
export const paymentMethodLabels: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  bank_transfer: 'Transferência Bancária',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  other: 'Outro',
};
