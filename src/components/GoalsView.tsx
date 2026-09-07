import React, { useState } from 'react';
import {
  Plus,
  Target,
  Trophy,
  ArrowUpRight,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Goal } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'currentAmount' | 'completed'>) => void;
  onUpdateGoal: (id: string, goal: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onDepositToGoal: (id: string, amount: number) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDepositToGoal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Segurança');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Quick deposit modal
  const [depositModalGoal, setDepositModalGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('100');

  // Summary statistics
  const totalSavedInGoals = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const totalTargetInGoals = goals.reduce((acc, g) => acc + g.targetAmount, 0);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    // Default target 1 year ahead
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setTargetDate(nextYear.toISOString().split('T')[0]);
    setCategory('Segurança');
    setNotes('');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setTargetDate(goal.targetDate);
    setCategory(goal.category);
    setNotes(goal.notes || '');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título da meta.');
      return;
    }

    const numTarget = parseFloat(targetAmount.replace(',', '.'));
    if (isNaN(numTarget) || numTarget <= 0) {
      setError('Informe um valor alvo válido.');
      return;
    }

    const numCurrent = parseFloat(currentAmount.replace(',', '.')) || 0;

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        title,
        targetAmount: numTarget,
        currentAmount: numCurrent,
        targetDate,
        category,
        notes,
        completed: numCurrent >= numTarget,
      });
    } else {
      onAddGoal({
        title,
        targetAmount: numTarget,
        targetDate,
        category,
        notes,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleConfirmDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalGoal) return;
    const amountNum = parseFloat(depositAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return;

    const willComplete = depositModalGoal.currentAmount + amountNum >= depositModalGoal.targetAmount;
    onDepositToGoal(depositModalGoal.id, amountNum);

    if (willComplete) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setDepositModalGoal(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Metas e Objetivos Financeiros
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Acompanhe a realização dos seus sonhos e reservas de segurança
          </p>
        </div>
        <button
          id="btn-add-goal"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Criar Nova Meta</span>
        </button>
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Total Acumulado em Metas
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-2 block">
            {formatCurrency(totalSavedInGoals)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Patrimônio alocado para objetivos futuros
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Valor Alvo Consolidado
          </span>
          <span className="text-2xl font-bold text-white mt-2 block">
            {formatCurrency(totalTargetInGoals)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            Soma dos alvos de todas as metas ativas
          </span>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Progresso Geral
          </span>
          <span className="text-2xl font-bold text-indigo-400 mt-2 block">
            {totalTargetInGoals > 0
              ? ((totalSavedInGoals / totalTargetInGoals) * 100).toFixed(1)
              : '0'}%
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {goals.filter((g) => g.completed).length} de {goals.length} metas concluídas
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const isDone = goal.completed || progress >= 100;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <div
              key={goal.id}
              id={`goal-card-${goal.id}`}
              className={`bg-slate-900 rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isDone ? 'border-emerald-800/80 bg-emerald-950/20' : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: isDone ? 'rgba(6, 78, 59, 0.6)' : 'rgba(30, 58, 138, 0.6)',
                        color: isDone ? '#34d399' : '#60a5fa',
                      }}
                    >
                      {isDone ? <Trophy size={20} /> : <Target size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">
                        {goal.title}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded mt-0.5">
                        {goal.category}
                      </span>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar meta"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir meta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Values */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-medium">Acumulado</span>
                    <span className="text-xs text-slate-400 font-medium">Alvo</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xl font-bold text-white">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                      {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isDone ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="font-semibold text-slate-200">{progress.toFixed(0)}% concluído</span>
                      <span>
                        {isDone ? 'Meta Atingida!' : `Falta ${formatCurrency(remaining)}`}
                      </span>
                    </div>
                  </div>

                  {/* Target Date & Notes */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-500" />
                      <span>Até {formatDate(goal.targetDate)}</span>
                    </div>
                    {isDone && (
                      <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                        <Sparkles size={12} /> Concluída!
                      </span>
                    )}
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-400 mt-2 bg-slate-950 p-2 rounded-lg italic border border-slate-800">
                      {goal.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Deposit Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setDepositModalGoal(goal);
                    setDepositAmount('100');
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowUpRight size={15} />
                  <span>Aportar Valor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Aportar Valor */}
      {depositModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-800 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Aportar na Meta
                </h3>
                <span className="text-xs text-slate-400">{depositModalGoal.title}</span>
              </div>
              <button
                onClick={() => setDepositModalGoal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor do Aporte (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                    R$
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    autoFocus
                    placeholder="100,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-base font-bold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-2">
                {[50, 100, 250, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDepositAmount(val.toString())}
                    className="flex-1 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    +R${val}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDepositModalGoal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Goal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {editingGoal ? 'Editar Meta Financeira' : 'Criar Nova Meta Financeira'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título da Meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reserva de Emergência, Viagem para Europa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor Alvo (R$) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Ex: 10000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor Já Salvo (R$)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prazo / Data Alvo
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria do Sonho
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Segurança">Segurança / Reserva</option>
                    <option value="Lazer">Lazer & Viagens</option>
                    <option value="Bens">Veículo ou Imóvel</option>
                    <option value="Trabalho">Equipamento / Trabalho</option>
                    <option value="Outros">Outro Objetivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas ou Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes, motivo da meta ou estratégia de economia..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingGoal ? 'Atualizar Meta' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
