import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Delete, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';

interface KeypadPair {
  id: string;
  first: number;
  second: number;
}

interface AuthLockScreenProps {
  onUnlock: () => void;
}

const TARGET_PIN = [1, 8, 1, 0];
const PIN_LENGTH = 4;

function generateRandomPairs(): KeypadPair[] {
  // Digits 0 to 9
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Fisher-Yates shuffle
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = digits[i];
    digits[i] = digits[j];
    digits[j] = temp;
  }

  // Group into 5 pairs
  const pairs: KeypadPair[] = [];
  for (let i = 0; i < 10; i += 2) {
    const a = digits[i];
    const b = digits[i + 1];
    pairs.push({
      id: `pair-${a}-${b}`,
      first: Math.min(a, b),
      second: Math.max(a, b),
    });
  }

  // Shuffle positions of the 5 buttons
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pairs[i];
    pairs[i] = pairs[j];
    pairs[j] = temp;
  }

  return pairs;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({ onUnlock }) => {
  const [pairs, setPairs] = useState<KeypadPair[]>(() => generateRandomPairs());
  const [enteredSteps, setEnteredSteps] = useState<KeypadPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleShuffle = useCallback(() => {
    setPairs(generateRandomPairs());
  }, []);

  const handleClear = useCallback(() => {
    setEnteredSteps([]);
    setError(null);
  }, []);

  const handleBackspace = useCallback(() => {
    setEnteredSteps((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleButtonPress = useCallback((pair: KeypadPair) => {
    if (isSuccess || enteredSteps.length >= PIN_LENGTH) return;

    setError(null);
    const nextSteps = [...enteredSteps, pair];
    setEnteredSteps(nextSteps);

    // If reached 4 digits, validate against target PIN [1, 8, 1, 0]
    if (nextSteps.length === PIN_LENGTH) {
      const isValid = nextSteps.every((selectedPair, index) => {
        const expectedDigit = TARGET_PIN[index];
        return selectedPair.first === expectedDigit || selectedPair.second === expectedDigit;
      });

      if (isValid) {
        setIsSuccess(true);
        setTimeout(() => {
          onUnlock();
        }, 450);
      } else {
        setIsShaking(true);
        setError('Senha incorreta. O teclado foi reembaralhado por segurança.');
        setTimeout(() => {
          setIsShaking(false);
          setEnteredSteps([]);
          setPairs(generateRandomPairs());
        }, 650);
      }
    }
  }, [enteredSteps, isSuccess, onUnlock]);

  // Physical keyboard listener for convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;

      if (e.key >= '0' && e.key <= '9') {
        const digit = parseInt(e.key, 10);
        const matchingPair = pairs.find((p) => p.first === digit || p.second === digit);
        if (matchingPair) {
          handleButtonPress(matchingPair);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pairs, handleButtonPress, handleBackspace, handleClear, isSuccess]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      {/* Background radial glow */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40" 
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.12), transparent 60%)'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col items-center backdrop-blur-xl">
          {/* Top Brand & Security Icon */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-950/50">
              <ShieldCheck size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Finance</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
              Segurança
            </span>
          </div>

          {/* Title & Icon status */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-3 shadow-inner">
              {isSuccess ? (
                <Unlock size={26} className="text-emerald-400 animate-bounce" />
              ) : (
                <Lock size={26} />
              )}
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Acesso ao Painel Finance
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Digite sua senha de 4 dígitos utilizando o teclado virtual aleatório abaixo.
            </p>
          </div>

          {/* PIN Indicators (4 Dots) */}
          <div 
            id="pin-indicator-container"
            className={`flex items-center justify-center gap-3.5 mb-6 ${
              isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''
            }`}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const isFilled = index < enteredSteps.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                    isSuccess
                      ? 'bg-emerald-400 border-emerald-400 shadow-md shadow-emerald-500/50 scale-110'
                      : isFilled
                      ? 'bg-sky-400 border-sky-400 shadow-md shadow-sky-500/50 scale-110'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Feedback error message */}
          {error && (
            <div 
              id="pin-error-message"
              className="w-full mb-4 p-2.5 bg-rose-950/50 border border-rose-800/70 rounded-xl flex items-center justify-center gap-2 text-rose-300 text-xs text-center"
            >
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Virtual Keypad with Random Digit Pairs */}
          <div className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {pairs.map((pair, idx) => (
                <button
                  key={pair.id}
                  id={`keypad-btn-${idx}`}
                  type="button"
                  onClick={() => handleButtonPress(pair)}
                  disabled={isSuccess || enteredSteps.length >= PIN_LENGTH}
                  className="group relative bg-slate-800/90 hover:bg-slate-750 active:bg-sky-950/60 border border-slate-700/80 hover:border-sky-500/60 active:border-sky-500 rounded-2xl py-3.5 px-3 flex items-center justify-center transition-all duration-150 cursor-pointer shadow-sm hover:shadow-sky-950/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="text-lg font-bold text-white group-hover:text-sky-300 tracking-wide">
                    {pair.first}
                  </span>
                  <span className="text-xs font-medium text-slate-400 mx-1.5 uppercase tracking-wider">
                    ou
                  </span>
                  <span className="text-lg font-bold text-white group-hover:text-sky-300 tracking-wide">
                    {pair.second}
                  </span>
                </button>
              ))}

              {/* Backspace Button */}
              <button
                id="btn-keypad-backspace"
                type="button"
                onClick={handleBackspace}
                disabled={enteredSteps.length === 0 || isSuccess}
                title="Apagar último dígito"
                className="bg-slate-800/50 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/60 hover:border-slate-600 rounded-2xl py-3.5 px-3 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-95"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Delete size={16} />
                  <span>Apagar</span>
                </div>
              </button>
            </div>

            {/* Bottom Actions: Clear & Shuffle */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <button
                id="btn-keypad-clear"
                type="button"
                onClick={handleClear}
                disabled={enteredSteps.length === 0 || isSuccess}
                className="hover:text-slate-200 transition-colors disabled:opacity-40 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800/60"
              >
                Limpar campos
              </button>

              <button
                id="btn-keypad-shuffle"
                type="button"
                onClick={handleShuffle}
                disabled={isSuccess}
                title="Reorganizar números do teclado"
                className="flex items-center gap-1.5 hover:text-sky-400 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-800/60"
              >
                <RotateCcw size={13} />
                <span>Embaralhar teclas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Ambiente protegido por teclado virtual dinâmico antifurto.
        </p>
      </div>
    </div>
  );
};
