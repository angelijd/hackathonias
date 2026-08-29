import React, { useState } from 'react';
import heroImg from '../assets/hero-illustration.png';

interface Props {
  darkMode: boolean;
  selectedTestType: 'critical_thinking' | 'creativity' | null;
  setSelectedTestType: React.Dispatch<React.SetStateAction<'critical_thinking' | 'creativity' | null>>;
  onBack: () => void;
  onProceed: () => void;
}

export const Screen2bTestSelection: React.FC<Props> = ({
  darkMode,
  selectedTestType,
  setSelectedTestType,
  onBack,
  onProceed,
}) => {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedTestType) {
      setWarningMessage('Por favor, escolha qual laboratório deseja realizar hoje.');
      return;
    }
    onProceed();
  };

  return (
    <div className="relative w-full max-w-[1340px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-12 z-10 flex flex-col justify-between">
      {/* Top Section */}
      <div className="relative flex flex-col lg:flex-row items-start justify-between gap-6 mb-6">
        <div className="pt-2 max-w-[620px]">
          <p className="text-[12px] sm:text-[13px] font-extrabold tracking-[0.08em] text-[#0B45D8] dark:text-[#3B82F6] uppercase mb-2">
            ÚLTIMO PASSO
          </p>
          <h1 className="text-[30px] sm:text-[38px] lg:text-[44px] font-extrabold leading-[1.12] tracking-[-0.02em]">
            <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
              Qual jornada você quer{' '}
            </span>
            <span className="text-[#FBB800]">explorar</span>
            <br />
            <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
              hoje?
            </span>
          </h1>
        </div>

        {/* Top Right Decorative */}
        <div className="relative w-full lg:w-auto flex justify-center lg:justify-end lg:pr-8">
          <div className="relative w-[230px] sm:w-[270px] lg:w-[310px] pointer-events-none">
            <svg
              className="absolute -top-3 -left-12 w-28 h-20 text-[#0B7CFB]/40 hidden sm:block pointer-events-none"
              viewBox="0 0 120 80"
              fill="none"
            >
              <path
                d="M10 60 C 40 20, 70 50, 100 20"
                stroke="#0B7CFB"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <path
                d="M95 18 L115 15 L108 32 L102 24 Z"
                fill="#0B7CFB"
              />
            </svg>
            <img
              src={heroImg}
              alt="Ilustração 3D"
              className="w-full h-auto object-contain animate-illo-float drop-shadow-[0_16px_30px_rgba(4,20,43,0.12)] select-none"
              loading="lazy"
              
            />
          </div>
        </div>
      </div>

      {/* Main Elevated Card Container */}
      <div
        className={`w-full rounded-[24px] sm:rounded-[28px] p-6 sm:p-9 shadow-[0_18px_45px_rgba(4,20,43,0.06)] border transition-all duration-300 ${
          darkMode
            ? 'bg-[#0B1426] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
            : 'bg-white border-slate-200/90'
        }`}
      >
        {warningMessage && (
          <div className="mb-6 p-3.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
              <span className="text-base">⚠️</span>
              <span>{warningMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningMessage(null)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:opacity-75 cursor-pointer px-2 py-1"
            >
              Entendido
            </button>
          </div>
        )}

        <div className="mb-8 sm:mb-9">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <h2 className="text-[15px] sm:text-[17px] font-extrabold tracking-tight">
              <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
                Escolha o laboratório:{' '}
              </span>
              <span className="text-[#FBB800] font-bold">
                (apenas 1)
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => {
                setSelectedTestType('critical_thinking');
                setWarningMessage(null);
              }}
              className={`relative flex flex-col items-start gap-4 p-6 sm:p-8 rounded-[20px] border text-left transition-all duration-150 select-none cursor-pointer group ${
                selectedTestType === 'critical_thinking'
                  ? darkMode
                    ? 'border-[#05B85B] bg-emerald-950/60 text-white shadow-md ring-2 ring-[#05B85B]/50 scale-[1.02]'
                    : 'border-[#05B85B] bg-emerald-50/80 text-[#04142B] shadow-md ring-2 ring-[#05B85B]/40 scale-[1.02]'
                  : darkMode
                  ? 'border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  : 'border-slate-200/90 bg-white text-[#0B1226] hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[32px] sm:text-[40px] shrink-0 transition-transform duration-150 group-hover:scale-110">
                  🧠
                </span>
                {selectedTestType === 'critical_thinking' && (
                  <span className="w-6 h-6 rounded-full bg-[#05B85B] text-white flex items-center justify-center text-[14px] font-black shrink-0">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <span className="block text-[18px] sm:text-[20px] font-extrabold tracking-tight mt-2">
                  Pensamento Crítico
                </span>
                <span className="block text-[14px] sm:text-[15px] font-medium opacity-80 mt-2 leading-relaxed">
                  Resolva dilemas éticos e analise situações usando lógica, argumentação e tomada de decisão imparcial.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTestType('creativity');
                setWarningMessage(null);
              }}
              className={`relative flex flex-col items-start gap-4 p-6 sm:p-8 rounded-[20px] border text-left transition-all duration-150 select-none cursor-pointer group ${
                selectedTestType === 'creativity'
                  ? darkMode
                    ? 'border-[#0B7CFB] bg-blue-950/60 text-white shadow-md ring-2 ring-[#0B7CFB]/50 scale-[1.02]'
                    : 'border-[#0B7CFB] bg-blue-50/80 text-[#04142B] shadow-md ring-2 ring-[#0B7CFB]/40 scale-[1.02]'
                  : darkMode
                  ? 'border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  : 'border-slate-200/90 bg-white text-[#0B1226] hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[32px] sm:text-[40px] shrink-0 transition-transform duration-150 group-hover:scale-110">
                  💡
                </span>
                {selectedTestType === 'creativity' && (
                  <span className="w-6 h-6 rounded-full bg-[#0B7CFB] text-white flex items-center justify-center text-[14px] font-black shrink-0">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <span className="block text-[18px] sm:text-[20px] font-extrabold tracking-tight mt-2">
                  Criatividade
                </span>
                <span className="block text-[14px] sm:text-[15px] font-medium opacity-80 mt-2 leading-relaxed">
                  Desperte o pensamento divergente, reclassifique elementos e encontre soluções originais para o mundo real.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl border text-[14px] font-extrabold transition-all cursor-pointer ${
              darkMode
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 text-[#0B45D8] hover:bg-slate-100/70 hover:border-slate-300'
            }`}
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0640C6] hover:bg-[#05329C] active:scale-[0.985] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(6,64,198,0.3)] hover:shadow-[0_12px_28px_rgba(6,64,198,0.4)] transition-all cursor-pointer"
          >
            <span>Começar o teste</span>
            <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
