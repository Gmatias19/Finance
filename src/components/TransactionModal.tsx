import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Check, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, Category, FinancialAccount } from '../types';
import { getTodayString, paymentMethodLabels } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdate?: (id: string, tx: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  accounts: FinancialAccount[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editingTransaction,
  categories,
  accounts,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [account, setAccount] = useState('Nubank (Conta Principal)');
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Available categories based on selected type
  const availableCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setCategoryId(editingTransaction.categoryId);
      setPaymentMethod(editingTransaction.paymentMethod);
      setAccount(editingTransaction.account);
      setStatus(editingTransaction.status);
      setIsRecurring(!!editingTransaction.isRecurring);
      setNotes(editingTransaction.notes || '');
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setDate(getTodayString());
      setCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
      setPaymentMethod('pix');
      setAccount(accounts[0]?.name || 'Conta Principal');
      setStatus('completed');
      setIsRecurring(false);
      setNotes('');
    }
    setError('');
  }, [editingTransaction, isOpen, categories, accounts]);

  // Update category when type changes if current category is incompatible
  useEffect(() => {
    if (!editingTransaction) {
      const firstMatching = categories.find((c) => c.type === type || c.type === 'both');
      if (firstMatching) setCategoryId(firstMatching.id);
    }
  }, [type, categories, editingTransaction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Por favor, informe a descrição do lançamento.');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Por favor, informe um valor monetário válido maior que zero.');
      return;
    }

    if (!categoryId) {
      setError('Por favor, selecione uma categoria.');
      return;
    }

    const txPayload: Omit<Transaction, 'id' | 'createdAt'> = {
      description: description.trim(),
      amount: numericAmount,
      type,
      categoryId,
      date,
      paymentMethod,
      account,
      status,
      isRecurring,
      notes: notes.trim() || undefined,
    };

    if (editingTransaction && onUpdate) {
      onUpdate(editingTransaction.id, txPayload);
    } else {
      onSave(txPayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-transaction"
        className="bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle: Despesa vs Receita */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight size={16} />
                <span>Despesa (Saída)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight size={16} />
                <span>Receita (Entrada)</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrição do Lançamento *
            </label>
            <input
              id="input-tx-description"
              type="text"
              required
              placeholder="Ex: Supermercado Semanal, Salário Mensal, Gasolina..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Amount & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                  R$
                </span>
                <input
                  id="input-tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data do Lançamento *
              </label>
              <input
                id="input-tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoria *
              </label>
              <select
                id="select-tx-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                id="select-tx-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <option key={key} value={key} className="bg-slate-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Conta / Carteira
              </label>
              <select
                id="select-tx-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.name} className="bg-slate-900">
                    {acc.name}
                  </option>
                ))}
                <option value="Outro" className="bg-slate-900">Outra Carteira / Conta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status da Transação
              </label>
              <select
                id="select-tx-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <option value="completed" className="bg-slate-900">Concluído / Já Pago ou Recebido</option>
                <option value="pending" className="bg-slate-900">Pendente / Agendado</option>
              </select>
            </div>
          </div>

          {/* Recurring Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">
                Lançamento Fixo / Recorrente
              </span>
              <span className="text-[11px] text-slate-400">
                Ocorre com frequência mensal (ex: aluguel, assinatura, salário)
              </span>
            </div>
            <input
              id="switch-tx-recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-emerald-500 rounded border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações Adicionais (opcional)
            </label>
            <textarea
              id="input-tx-notes"
              rows={2}
              placeholder="Anotações, número de parcelas, código ou detalhes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-transaction"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Salvar Lançamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
