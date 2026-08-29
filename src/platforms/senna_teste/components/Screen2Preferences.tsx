import React, { useState } from 'react';

// Imports dos assets (com fallback visual garantido caso a imagem ainda não tenha sido colada)
import strangerThingsImg from '../assets/strangerthings.png';
import greysAnatomyImg from '../assets/greysanatomy.png';
import wandinhaImg from '../assets/wandinha.png';

interface Props {
  darkMode: boolean;
  selectedInterests: string[];
  setSelectedInterests: React.Dispatch<React.SetStateAction<string[]>>;
  interestDetails?: Record<string, string>;
  setInterestDetails?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedExpectation?: string | null;
  setSelectedExpectation?: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTestType?: 'critical_thinking' | 'creativity' | null;
  setSelectedTestType?: React.Dispatch<React.SetStateAction<'critical_thinking' | 'creativity' | null>>;
  onBack: () => void;
  onProceed: () => void;
}

interface SerieOption {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  imageSrc: string;
  alt: string;
}

export const Screen2Preferences: React.FC<Props> = ({
  darkMode,
  selectedInterests,
  setSelectedInterests,
  onBack,
  onProceed,
}) => {
  const [selectedUniverse, setSelectedUniverse] = useState<string>(
    selectedInterests[0] || 'stranger_things'
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const series: SerieOption[] = [
    {
      id: 'greys_anatomy',
      title: "Qual personagem de Grey's Anatomy eu sou?",
      subtitle: 'Decisões sob pressão, empatia e resiliência',
      tag: "Grey's Anatomy",
      tagColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-300/40',
      imageSrc: greysAnatomyImg,
      alt: "Grey's Anatomy",
    },
    {
      id: 'stranger_things',
      title: 'Qual personagem de Stranger Things eu sou?',
      subtitle: 'Aventura, lealdade e raciocínio no Mundo Invertido',
      tag: 'Stranger Things',
      tagColor: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-300/40',
      imageSrc: strangerThingsImg,
      alt: 'Stranger Things',
    },
    {
      id: 'wandinha',
      title: 'Qual personagem de Wandinha eu sou?',
      subtitle: 'Autenticidade, mistério e mente investigativa',
      tag: 'Wandinha',
      tagColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300/40',
      imageSrc: wandinhaImg,
      alt: 'Wandinha',
    },
  ];

  const handleSelect = (id: string) => {
    setSelectedUniverse(id);
    setSelectedInterests([id]);
    setWarningMessage(null);
  };

  const handleContinue = () => {
    if (!selectedUniverse) {
      setWarningMessage('Por favor, selecione um universo para continuar.');
      return;
    }
    setSelectedInterests([selectedUniverse]);
    onProceed();
  };

  return (
    <div className="relative w-full max-w-[1360px] mx-auto px-4 sm:px-8 pt-2 sm:pt-3 pb-3 sm:pb-4 z-10 flex flex-col justify-center min-h-[calc(100vh-90px)]">
      {/* Top Header Section */}
      <div className="flex flex-col items-center text-center max-w-[760px] mx-auto mb-3 sm:mb-4">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FDC300]/15 border border-[#FDC300]/40 rounded-full mb-2">
          <span className="w-2 h-2 rounded-full bg-[#FDC300] animate-pulse" />
          <span className="text-[12px] font-extrabold text-[#0B1226] dark:text-amber-300 uppercase tracking-wider">
            Passo 1 de 2 · Escolha seu universo
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[20px] sm:text-[25px] lg:text-[28px] font-extrabold leading-[1.18] tracking-tight">
          <span className={darkMode ? 'text-white' : 'text-[#0B1226]'}>
            Qual universo combina mais com{' '}
          </span>
          <span className="text-[#FBB800]">você?</span>
        </h1>

        {/* Description */}
        <p className={`text-[12.5px] sm:text-[13.5px] leading-relaxed mt-1.5 max-w-[62ch] font-medium ${
          darkMode ? 'text-slate-300' : 'text-[#5B6472]'
        }`}>
          Escolha uma das séries abaixo. Conforme você responder às questões, o teste revelará qual personagem reflete o seu perfil e as suas forças socioemocionais!
        </p>
      </div>

      {/* 3 Portrait Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch max-w-[1000px] mx-auto w-full mb-3 sm:mb-4">
        {series.map((item) => {
          const isSelected = selectedUniverse === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`group relative flex flex-col rounded-2xl p-2 sm:p-2.5 text-left transition-all duration-300 cursor-pointer overflow-hidden border ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-[#FDC300] shadow-[0_16px_36px_rgba(253,195,0,0.28)] scale-[1.02] ring-2 ring-[#FDC300]/80'
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:-translate-y-1'
              }`}
              aria-pressed={isSelected}
            >
              {/* Selected Checkmark Badge Top-Right */}
              <div
                className={`absolute top-3.5 right-3.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                  isSelected
                    ? 'bg-[#FDC300] text-[#0B1226] scale-100 opacity-100'
                    : 'bg-slate-200/80 dark:bg-slate-800 text-transparent scale-75 opacity-0 group-hover:opacity-60'
                }`}
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                  <path
                    d="M5 10.5l3.5 3.5 7-7"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Portrait Image Container (altura fixa e compacta para caber sem scroll) */}
              <div className="relative w-full h-[110px] sm:h-[140px] lg:h-[160px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 mb-2 flex items-center justify-center group-hover:shadow-md transition-shadow">
                <img
                  src={item.imageSrc}
                  alt={item.alt}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback visual caso o arquivo ainda não tenha sido colado na pasta
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.fallback-placeholder')) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'fallback-placeholder flex flex-col items-center justify-center p-6 text-center h-full w-full bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900';
                      placeholder.innerHTML = `
                        <div class="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center mb-3">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        </div>
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${item.tag}</span>
                        <span class="text-[11px] text-slate-400 mt-1">Coloque ${item.id}.png em assets</span>
                      `;
                      parent.appendChild(placeholder);
                    }
                  }}
                />

                {/* Subtle bottom gradient overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-between px-1 pb-1">
                <div>
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 ${item.tagColor}`}>
                    {item.tag}
                  </span>

                  <h3 className={`text-[13px] sm:text-[14px] font-extrabold leading-snug tracking-tight mb-0.5 ${
                    isSelected ? 'text-[#0B1226] dark:text-white' : 'text-[#0B1226] dark:text-slate-100'
                  }`}>
                    {item.title}
                  </h3>

                  <p className="text-[11px] text-[#5B6472] dark:text-slate-400 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Warning Message */}
      {warningMessage && (
        <div className="max-w-[480px] mx-auto mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-sm font-semibold text-center animate-shake">
          {warningMessage}
        </div>
      )}

      {/* Action Footer Navigation Bar */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-slate-200/80 dark:border-slate-800 max-w-[1000px] mx-auto w-full">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 rounded-full font-bold text-[13px] text-[#5B6472] dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span>Voltar para o início</span>
        </button>

        {/* Continue CTA Button */}
        <button
          type="button"
          onClick={handleContinue}
          className="group relative w-full sm:w-auto min-w-[260px] h-[46px] pl-7 pr-3 rounded-full bg-gradient-to-r from-[#FDC300] to-[#FBB800] flex items-center justify-between gap-6 shadow-[0_10px_24px_rgba(253,195,0,0.34)] hover:shadow-[0_14px_28px_rgba(253,195,0,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 overflow-hidden cursor-pointer border border-amber-300/60"
        >
          <span className="absolute top-0 -left-[60%] w-[38%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-sheen pointer-events-none" />

          <span className="text-[15px] font-extrabold text-[#0B1226] tracking-tight whitespace-nowrap">
            Começar o teste
          </span>

          <span className="w-7 h-7 rounded-full bg-[#040E2B] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 shadow ml-2">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};
