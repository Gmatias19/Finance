import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Table,
  UploadCloud,
  ShieldCheck,
} from 'lucide-react';
import { SupabaseSyncState, SUPABASE_SQL_SCHEMA } from '../services/supabaseService';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: SupabaseSyncState;
  onRefreshCheck: () => Promise<void>;
  onSyncAllToSupabase: () => Promise<{ success: boolean; message: string }>;
  transactionCount: number;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onRefreshCheck,
  onSyncAllToSupabase,
  transactionCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncAllToSupabase();
      setSyncFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        message: e?.message || 'Erro ao sincronizar dados com o Supabase.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isConnected = syncState.status === 'connected';
  const needsSetup = syncState.status === 'needs_setup';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="modal-supabase-sync"
        className="bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800/40 flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Banco de Dados Supabase
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? 'bg-sky-950 text-sky-400 border-sky-800'
                      : needsSetup
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isConnected ? 'Conectado' : needsSetup ? 'Tabelas Pendentes' : 'Verificando'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                URL:{' '}
                <span className="text-slate-300 font-mono">
                  https://pzcakiubnjlqvncemlrk.supabase.co
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Alert */}
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                syncFeedback.type === 'success'
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-sky-400 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Status da Conexão em Tempo Real
              </span>
              <button
                onClick={() => onRefreshCheck()}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw size={12} className={syncState.status === 'checking' ? 'animate-spin' : ''} />
                <span>Atualizar Status</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { name: 'Transações', key: 'transactions', exists: syncState.tablesFound?.transactions },
                { name: 'Orçamentos', key: 'budgets', exists: syncState.tablesFound?.budgets },
                { name: 'Metas', key: 'goals', exists: syncState.tablesFound?.goals },
                { name: 'Contas', key: 'accounts', exists: syncState.tablesFound?.accounts },
              ].map((table) => (
                <div
                  key={table.key}
                  className={`p-2 rounded-lg border text-center ${
                    table.exists
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Table size={12} />
                    <span className="text-[11px] font-bold">{table.name}</span>
                  </div>
                  <span className="text-[10px] block">
                    {table.exists ? 'Tabela Ativa' : 'Não criada'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              {isConnected
                ? 'Todas as informações novas adicionadas, como transações, receitas e metas, são salvas e persistidas automaticamente no seu banco de dados Supabase.'
                : 'O cliente Supabase está configurado com as suas credenciais! Para que os dados sejam gravados no banco remoto, execute o script SQL abaixo uma única vez no painel do Supabase.'}
            </p>
          </div>

          {/* Quick Setup Instructions if tables need creation */}
          {needsSetup && (
            <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-800/50 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <ShieldCheck size={16} />
                <span>Como criar as tabelas no Supabase em poucos segundos:</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>
                  Acesse o painel do Supabase:{' '}
                  <a
                    href="https://supabase.com/dashboard/project/pzcakiubnjlqvncemlrk/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 underline inline-flex items-center gap-0.5 hover:text-sky-300"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink size={10} />
                  </a>
                </li>
                <li>Clique no botão <strong>"New query"</strong>.</li>
                <li>Clique no botão azul baleia abaixo para <strong>Copiar o Script SQL</strong>.</li>
                <li>Cole no editor do Supabase e clique em <strong>"Run"</strong>.</li>
              </ol>

              {/* Copy SQL Button */}
              <button
                onClick={handleCopySql}
                className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sky-950/40"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Código SQL Copiado com Sucesso!' : 'Copiar Script SQL das Tabelas'}</span>
              </button>
            </div>
          )}

          {/* Sync Local Data to Supabase Button */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-xs sm:text-sm text-white block">
                Sincronizar Todos os Registros Atuais
              </span>
              <span className="text-xs text-slate-400">
                Envia {transactionCount} lançamentos e todas as metas para o Supabase
              </span>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <UploadCloud size={14} />
              )}
              <span>{isSyncing ? 'Enviando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>

          {/* SQL Preview (Collapsible / Readable) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Visualizar Código SQL das Tabelas:
              </span>
              <button
                onClick={handleCopySql}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Copy size={12} />
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto scrollbar-thin">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {syncState.lastSyncedAt
              ? `Última sincronização: ${new Date(syncState.lastSyncedAt).toLocaleTimeString('pt-BR')}`
              : 'Armazenamento híbrido: local e nuvem Supabase'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
