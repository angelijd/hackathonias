import React, { useState } from 'react';
import { INTEREST_OPTIONS, EXPECTATION_OPTIONS } from '../data/preferencesData';
import heroImg from '../assets/hero-illustration.png';

interface Props {
  darkMode: boolean;
  selectedInterests: string[];
  setSelectedInterests: React.Dispatch<React.SetStateAction<string[]>>;
  interestDetails: Record<string, string>;
  setInterestDetails: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedExpectation: string | null;
  setSelectedExpectation: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTestType: 'critical_thinking' | 'creativity' | null;
  setSelectedTestType: React.Dispatch<React.SetStateAction<'critical_thinking' | 'creativity' | null>>;
  onBack: () => void;
  onProceed: () => void;
}

export const Screen2Preferences: React.FC<Props> = ({
  darkMode,
  selectedInterests,
  setSelectedInterests,
  interestDetails,
  setInterestDetails,
  selectedExpectation,
  setSelectedExpectation,
  selectedTestType,
  setSelectedTestType,
  onBack,
  onProceed,
}) => {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Handle Interest Chip Click (Limit: 1)
  const handleToggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      // Unselect
      setSelectedInterests([]);
      setWarningMessage(null);
    } else {
      if (selectedInterests.length > 0 && !selectedInterests.includes(id)) {
        setShakingId(id);
        setTimeout(() => {
          setShakingId(null);
        }, 500);
      }
      setSelectedInterests([id]);
      setWarningMessage(null);
    }
  };

  // Handle Expectation Chip Click (Limit: 1)
  const handleToggleExpectation = (id: string) => {
    if (selectedExpectation === id) {
      // Deselect
      setSelectedExpectation(null);
      setWarningMessage(null);
    } else {
      if (selectedExpectation && selectedExpectation !== id) {
        // Trigger brief shake feedback and switch to the newly chosen single expectation
        setShakingId(id);
        setTimeout(() => {
          setShakingId(null);
        }, 500);
      }
      setSelectedExpectation(id);
      setWarningMessage(null);
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length === 0) {
      setWarningMessage('Por favor, selecione ao menos 1 interesse que você curte antes de continuar.');
      return;
    }
    if (!selectedExpectation) {
      setWarningMessage('Por favor, selecione o que você espera encontrar aqui para personalizar sua experiência.');
      return;
    }
    onProceed();
  };

  return (
    <div className="relative w-full max-w-[1340px] mx-auto px-4 sm:px-8 pt-2 sm:pt-3 pb-3 sm:pb-4 z-10 flex flex-col justify-between">
      {/* Top Section: Header Text + Floating 3D Elements */}
      <div className="relative flex flex-col lg:flex-row items-start justify-between gap-4 mb-3 sm:mb-4">
        <div className="pt-1 max-w-[620px]">
          {/* Eyebrow */}
          <p className="text-[11px] sm:text-[12px] font-extrabold tracking-[0.08em] text-[#0B45D8] dark:text-[#3B82F6] uppercase mb-1.5">
            ANTES DE COMEÇAR
          </p>

          {/* Heading */}
          <h1 className="text-[22px] sm:text-[27px] lg:text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
              Vamos deixar o{' '}
            </span>
            <span className="text-[#FBB800]">laboratório</span>
            <br />
            <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
              com a sua cara.
            </span>
          </h1>
        </div>

        {/* Top Right Decorative Illustration Cluster */}
        <div className="relative w-full lg:w-auto flex justify-center lg:justify-end lg:pr-8">
          <div className="relative w-[140px] sm:w-[165px] lg:w-[190px] pointer-events-none">
            {/* Paper Airplane & Dotted Paths Doodle */}
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

            {/* Floating 3D Graphic */}
            <img
              src={heroImg}
              alt="Ilustração 3D de criatividade e ideias"
              className="w-full h-auto object-contain animate-illo-float drop-shadow-[0_16px_30px_rgba(4,20,43,0.12)] select-none"
              loading="eager"
              
            />
          </div>
        </div>
      </div>

      {/* Main Elevated Card Container */}
      <div
        className={`w-full rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-[0_18px_45px_rgba(4,20,43,0.06)] border transition-all duration-300 ${
          darkMode
            ? 'bg-[#0B1426] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
            : 'bg-white border-slate-200/90'
        }`}
      >
        {/* Warning Notification Banner */}
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

        {/* SECTION 1: Interesses (escolha 1) */}
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[15px] sm:text-[17px] font-extrabold tracking-tight">
              <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
                O que você curte?{' '}
              </span>
              <span className="text-[#FBB800] font-bold">
                (escolha apenas 1)
              </span>
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ml-auto ${
                selectedInterests.length === 1
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {selectedInterests.length === 1 ? '1/1 selecionado' : '0/1 selecionado'}
            </span>
          </div>

          {/* Grid of Interest Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {INTEREST_OPTIONS.map((item) => {
              const isSelected = selectedInterests.includes(item.id);
              const isShaking = shakingId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleInterest(item.id)}
                  className={`relative flex items-center justify-start gap-2.5 px-3 py-2.5 rounded-[14px] border text-left transition-all duration-150 select-none cursor-pointer group ${
                    isShaking ? 'animate-shake' : ''
                  } ${
                    isSelected
                      ? darkMode
                        ? 'border-[#3B82F6] bg-blue-950/60 text-white shadow-sm ring-2 ring-[#3B82F6]/40'
                        : 'border-[#0B45D8] bg-blue-50/80 text-[#04142B] shadow-sm ring-2 ring-[#0B45D8]/25'
                      : darkMode
                      ? 'border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      : 'border-slate-200/90 bg-white text-[#0B1226] hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  aria-pressed={isSelected}
                  title={item.label}
                >
                  {/* Icon */}
                  <span className="text-[17px] sm:text-[19px] shrink-0 transition-transform duration-150 group-hover:scale-110">
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span className="text-[13.5px] sm:text-[14.5px] font-extrabold tracking-tight truncate flex-1">
                    {item.label}
                  </span>

                  {/* Check Indicator */}
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-opacity duration-150 ${
                    isSelected ? 'bg-[#0B45D8] dark:bg-[#3B82F6] text-white opacity-100' : 'opacity-0'
                  }`}>
                    ✓
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Input for Selected Interest */}
          {selectedInterests.length > 0 && (
            <div className="mt-3 space-y-2 animate-in fade-in duration-200">
              <p className="text-xs sm:text-sm font-extrabold text-[#0B45D8] dark:text-[#3B82F6]">
                🎯 Especifique o seu favorito:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedInterests.map((interestId) => {
                  const itemObj = INTEREST_OPTIONS.find((opt) => opt.id === interestId);
                  const label = itemObj?.label || interestId;
                  const icon = itemObj?.icon || '🎯';
                  const questionPrompt = itemObj?.questionPrompt || `Qual seu favorito em ${label}?`;
                  const placeholder = itemObj?.placeholder || 'Digite 1 nome...';

                  return (
                    <div
                      key={interestId}
                      className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1.5"
                    >
                      <label className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-[#04142B] dark:text-white">
                        <span>{icon}</span>
                        <span>{questionPrompt}</span>
                      </label>
                      <input
                        type="text"
                        value={interestDetails[interestId] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInterestDetails((prev) => ({
                            ...prev,
                            [interestId]: val,
                          }));
                        }}
                        placeholder={placeholder}
                        className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition-all outline-none ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white focus:border-[#3B82F6]'
                            : 'bg-white border-slate-300 text-[#04142B] focus:border-[#0B45D8]'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Objetivos (escolha apenas 1) */}
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[15px] sm:text-[17px] font-extrabold tracking-tight">
              <span className={darkMode ? 'text-white' : 'text-[#04142B]'}>
                O que você espera encontrar aqui?{' '}
              </span>
              <span className="text-[#FBB800] font-bold">
                (escolha apenas 1)
              </span>
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ml-auto ${
                selectedExpectation
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {selectedExpectation ? '1/1 selecionado' : '0/1 selecionado'}
            </span>
          </div>

          {/* Grid of Expectation Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {EXPECTATION_OPTIONS.map((item) => {
              const isSelected = selectedExpectation === item.id;
              const isShaking = shakingId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleExpectation(item.id)}
                  className={`relative flex items-center justify-start gap-3 px-3.5 py-3 rounded-[14px] border text-left transition-all duration-150 select-none cursor-pointer group ${
                    isShaking ? 'animate-shake' : ''
                  } ${
                    isSelected
                      ? darkMode
                        ? 'border-[#3B82F6] bg-blue-950/60 text-white shadow-sm ring-2 ring-[#3B82F6]/40'
                        : 'border-[#0B45D8] bg-blue-50/80 text-[#04142B] shadow-sm ring-2 ring-[#0B45D8]/25'
                      : darkMode
                      ? 'border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      : 'border-slate-200/90 bg-white text-[#0B1226] hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  aria-pressed={isSelected}
                  title={item.label}
                >
                  {/* Icon */}
                  <span className="text-[18px] sm:text-[20px] shrink-0 transition-transform duration-150 group-hover:scale-110">
                    {item.icon}
                  </span>

                  {/* Label */}
                  <span className="text-[13.5px] sm:text-[14.5px] font-extrabold tracking-tight truncate flex-1">
                    {item.label}
                  </span>

                  {/* Check Indicator */}
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-opacity duration-150 ${
                    isSelected ? 'bg-[#0B45D8] dark:bg-[#3B82F6] text-white opacity-100' : 'opacity-0'
                  }`}>
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Voltar Button */}
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

          {/* Proceed Button */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0640C6] hover:bg-[#05329C] active:scale-[0.985] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(6,64,198,0.3)] hover:shadow-[0_12px_28px_rgba(6,64,198,0.4)] transition-all cursor-pointer"
          >
            <span>Próximo Passo</span>
            <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
