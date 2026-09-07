import React, { useRef, useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImportJSON: (jsonString: string) => { success: boolean; message: string };
  onResetToDefaults: () => void;
  transactionCount: number;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onExportCSV,
  onExportJSON,
  onImportJSON,
  onResetToDefaults,
  transactionCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = onImportJSON(content);
        if (result.success) {
          setFeedback({ type: 'success', message: result.message });
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      }
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Erro ao ler arquivo selecionado.' });
    };
    reader.readAsText(file);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    onResetToDefaults();
    setFeedback({ type: 'success', message: 'Dados restaurados com os exemplos iniciais!' });
    setConfirmReset(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-backup-export"
        className="bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Dados, Backup e Exportação
            </h2>
            <p className="text-xs text-slate-400">
              Controle a portabilidade e a segurança das suas finanças
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Exportar Seus Registros
            </span>

            {/* CSV Export */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">
                    Exportar Planilha CSV
                  </span>
                  <span className="text-xs text-slate-400">
                    Compatível com Excel, Google Sheets e Calc ({transactionCount} lançamentos)
                  </span>
                </div>
              </div>
              <button
                onClick={onExportCSV}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download size={14} />
                <span>Baixar CSV</span>
              </button>
            </div>

            {/* JSON Backup Export */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 flex items-center justify-center shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">
                    Backup Completo (JSON)
                  </span>
                  <span className="text-xs text-slate-400">
                    Salva todas as transações, metas e orçamentos
                  </span>
                </div>
              </div>
              <button
                onClick={onExportJSON}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download size={14} />
                <span>Baixar Backup</span>
              </button>
            </div>
          </div>

          {/* Import Option */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Restaurar Backup Anterior
            </span>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-950/80 text-violet-400 border border-violet-800/40 flex items-center justify-center shrink-0">
                  <Upload size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">
                    Carregar Arquivo .json
                  </span>
                  <span className="text-xs text-slate-400">
                    Substitui o estado atual pelo backup salvo
                  </span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Upload size={14} />
                <span>Selecionar</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Reset Defaults */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Configurações Iniciais
            </span>

            {confirmReset ? (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl space-y-2">
                <p className="text-xs text-rose-300 font-medium">
                  Tem certeza? Isso restaurará as categorias e transações padrão de exemplo.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Sim, Restaurar Exemplos
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restaurar Dados de Exemplo Iniciais</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
