import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, Category, FinancialAccount } from '../types';
import { getTodayString, paymentMethodLabels, addMonthsToDate, isSavingsAccount } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onSaveBatch?: (txs: Array<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  onUpdate?: (id: string, tx: Partial<Transaction>) => void;
  onUpdateRecurringGroup?: (
    groupId: string,
    fromDate: string,
    updates: Partial<Transaction>,
    currentId: string
  ) => void;
  onUpdateInstallmentGroup?: (
    groupId: string,
    fromNumber: number,
    updates: Partial<Transaction>,
    currentId: string
  ) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  accounts: FinancialAccount[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  onUpdate,
  onUpdateRecurringGroup,
  onUpdateInstallmentGroup,
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
  const [account, setAccount] = useState('Nubank');
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Confirmation state for editing recurring or installment sequence
  const [showGroupEditPrompt, setShowGroupEditPrompt] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Omit<Transaction, 'id' | 'createdAt'> | null>(null);

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
      setAccount(isSavingsAccount(editingTransaction.account, accounts) ? 'Poupança' : 'Conta corrente');
      setStatus(editingTransaction.status);
      setIsRecurring(!!editingTransaction.isRecurring);
      setIsInstallment(!!editingTransaction.isInstallment);
      setInstallmentCount(editingTransaction.installmentTotal || 2);
      setNotes(editingTransaction.notes || '');
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setDate(getTodayString());
      setCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
      setPaymentMethod('pix');
      setAccount('Conta corrente');
      setStatus('completed');
      setIsRecurring(false);
      setIsInstallment(false);
      setInstallmentCount(2);
      setNotes('');
    }
    setError('');
    setShowGroupEditPrompt(false);
    setPendingPayload(null);
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
      isInstallment,
      notes: notes.trim() || undefined,
    };

    // If editing a transaction that is part of a recurring or installment group:
    if (
      editingTransaction &&
      ((editingTransaction.recurringGroupId && onUpdateRecurringGroup) ||
        (editingTransaction.installmentGroupId && onUpdateInstallmentGroup))
    ) {
      setPendingPayload(txPayload);
      setShowGroupEditPrompt(true);
      return;
    }

    // Direct update of single transaction
    if (editingTransaction && onUpdate) {
      onUpdate(editingTransaction.id, txPayload);
      onClose();
      return;
    }

    // Creating NEW transactions:
    // Case 1: Lançamento Fixo (reflete despesa/receita como Pendente para os próximos 24 meses seguintes)
    if (isRecurring) {
      const recGroupId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const batchList: Array<Omit<Transaction, 'id' | 'createdAt'>> = [];

      // 1st occurrence (current month / selected date)
      batchList.push({
        ...txPayload,
        isRecurring: true,
        recurringGroupId: recGroupId,
      });

      // Generate future occurrences up to 24 months following the first month
      for (let offset = 1; offset <= 24; offset++) {
        const nextDate = addMonthsToDate(date, offset);

        batchList.push({
          ...txPayload,
          date: nextDate,
          status: 'pending', // Refletir como Pendente para os próximos meses
          isRecurring: true,
          recurringGroupId: recGroupId,
        });
      }

      if (onSaveBatch) {
        onSaveBatch(batchList);
      } else {
        batchList.forEach((item) => onSave(item));
      }
      onClose();
      return;
    }

    // Case 2: Lançamento Parcelado
    if (isInstallment && installmentCount >= 2) {
      const instGroupId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const parcelAmount = Number((numericAmount / installmentCount).toFixed(2));
      const cleanDesc = description.trim().replace(/\s*\d+\/\d+$/, '');
      const batchList: Array<Omit<Transaction, 'id' | 'createdAt'>> = [];

      for (let i = 1; i <= installmentCount; i++) {
        const parcelDate = i === 1 ? date : addMonthsToDate(date, i - 1);
        const parcelStatus = i === 1 ? status : 'pending';

        batchList.push({
          ...txPayload,
          description: `${cleanDesc} ${i}/${installmentCount}`,
          amount: parcelAmount,
          date: parcelDate,
          status: parcelStatus,
          isInstallment: true,
          installmentGroupId: instGroupId,
          installmentNumber: i,
          installmentTotal: installmentCount,
        });
      }

      if (onSaveBatch) {
        onSaveBatch(batchList);
      } else {
        batchList.forEach((item) => onSave(item));
      }
      onClose();
      return;
    }

    // Standard single transaction
    onSave(txPayload);
    onClose();
  };

  // Handle choice for recurring or installment group updates
  const handleApplyOnlyThis = () => {
    if (editingTransaction && pendingPayload && onUpdate) {
      onUpdate(editingTransaction.id, pendingPayload);
    }
    setShowGroupEditPrompt(false);
    onClose();
  };

  const handleApplyToAllPending = () => {
    if (!editingTransaction || !pendingPayload) return;

    if (editingTransaction.recurringGroupId && onUpdateRecurringGroup) {
      onUpdateRecurringGroup(
        editingTransaction.recurringGroupId,
        editingTransaction.date,
        pendingPayload,
        editingTransaction.id
      );
    } else if (editingTransaction.installmentGroupId && onUpdateInstallmentGroup) {
      onUpdateInstallmentGroup(
        editingTransaction.installmentGroupId,
        editingTransaction.installmentNumber || 1,
        pendingPayload,
        editingTransaction.id
      );
    } else if (onUpdate) {
      onUpdate(editingTransaction.id, pendingPayload);
    }

    setShowGroupEditPrompt(false);
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

        {/* Form Body or Group Edit Prompt */}
        {showGroupEditPrompt && editingTransaction ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>
                  {editingTransaction.recurringGroupId
                    ? 'Lançamento Fixo Recorrente'
                    : 'Lançamento Parcelado'}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {editingTransaction.recurringGroupId
                  ? 'Este lançamento faz parte de uma sequência fixa. Como deseja aplicar as alterações realizadas?'
                  : `Esta é a parcela ${editingTransaction.installmentNumber}/${editingTransaction.installmentTotal} de uma compra parcelada. Como deseja aplicar as alterações?`}
              </p>
              <p className="text-[11px] text-amber-400/90 mt-2 font-medium">
                Atenção: os lançamentos que já foram pagos ou recebidos não serão alterados.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplyToAllPending}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all shadow-xs cursor-pointer text-center"
              >
                {editingTransaction.recurringGroupId
                  ? 'Neste e em todos os pendentes futuros'
                  : 'Nesta e em todas as parcelas pendentes futuras'}
              </button>
              <button
                type="button"
                onClick={handleApplyOnlyThis}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer text-center"
              >
                {editingTransaction.recurringGroupId
                  ? 'Somente este lançamento'
                  : 'Somente esta parcela'}
              </button>
              <button
                type="button"
                onClick={() => setShowGroupEditPrompt(false)}
                className="w-full py-2 px-4 text-xs font-medium text-slate-400 hover:text-slate-300 rounded-xl transition-all cursor-pointer text-center"
              >
                Voltar à edição
              </button>
            </div>
          </div>
        ) : (
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
                  <span>Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    type === 'income'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  <span>Receita</span>
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
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              />
            </div>

            {/* Amount & Due Date (Data de Vencimento) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor *
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
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data de Vencimento *
                </label>
                <input
                  id="input-tx-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
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
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
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
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                >
                  {Object.entries(paymentMethodLabels).map(([key, label]) => (
                    <option key={key} value={key} className="bg-slate-900">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account & Status (Dependent on operation type: Despesa vs Receita) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Conta
                </label>
                <select
                  id="select-tx-account"
                  value={isSavingsAccount(account, accounts) ? 'Poupança' : 'Conta corrente'}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                >
                  <option value="Conta corrente" className="bg-slate-900">Conta corrente</option>
                  <option value="Poupança" className="bg-slate-900">Poupança</option>
                </select>
                {isSavingsAccount(account, accounts) && (
                  <p className="text-[11px] text-emerald-400 mt-1.5 leading-relaxed font-medium bg-emerald-950/40 border border-emerald-800/50 p-2 rounded-lg">
                    🌱 Movimentação interna na Poupança: altera somente o saldo da poupança sem afetar o saldo acumulado geral nem receitas/despesas realizadas gerais.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status da Transação
                </label>
                <select
                  id="select-tx-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'completed' | 'pending')}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                >
                  {type === 'expense' ? (
                    <>
                      <option value="completed" className="bg-slate-900">Pago</option>
                      <option value="pending" className="bg-slate-900">Pendente</option>
                    </>
                  ) : (
                    <>
                      <option value="completed" className="bg-slate-900">Recebido</option>
                      <option value="pending" className="bg-slate-900">A Receber</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Lançamento Fixo and Lançamento Parcelado (available for new transactions) */}
            {!editingTransaction && (
              <div className="space-y-3 pt-1">
                {/* Lançamento Fixo Toggle */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={14} className="text-sky-400" />
                    <span className="text-xs font-bold text-white">
                      Lançamento Fixo
                    </span>
                  </div>
                  <input
                    id="switch-tx-recurring"
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRecurring(checked);
                      if (checked) setIsInstallment(false);
                    }}
                    className="w-4 h-4 text-sky-500 rounded border-slate-700 focus:ring-sky-500 cursor-pointer accent-sky-600"
                  />
                </div>

                {/* Lançamento Parcelado Toggle */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-white">
                          Lançamento Parcelado
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Divide o valor em parcelas mensais consecutivas
                      </span>
                    </div>
                    <input
                      id="switch-tx-installment"
                      type="checkbox"
                      checked={isInstallment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsInstallment(checked);
                        if (checked) setIsRecurring(false);
                      }}
                      className="w-4 h-4 mt-0.5 text-indigo-500 rounded border-slate-700 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {isInstallment && (
                    <div className="pt-2 border-t border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Quantidade de Parcelas
                        </label>
                        <input
                          id="input-tx-installments"
                          type="number"
                          min={2}
                          max={120}
                          value={installmentCount}
                          onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
                          className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-xs text-slate-400">Valor estimado por parcela:</span>
                        <span className="text-sm font-bold text-indigo-400 mt-0.5">
                          {amount && parseFloat(amount.replace(',', '.')) > 0
                            ? (parseFloat(amount.replace(',', '.')) / installmentCount).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : 'R$ 0,00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações Adicionais
              </label>
              <textarea
                id="input-tx-notes"
                rows={2}
                placeholder="Anotações, código ou detalhes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors resize-none"
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
                className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sky-950/40"
              >
                <Check size={16} />
                <span>Salvar Lançamento</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
