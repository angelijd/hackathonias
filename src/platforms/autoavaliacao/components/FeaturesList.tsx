import React from 'react';

interface Props {
  darkMode?: boolean;
}

export const FeaturesList: React.FC<Props> = ({ darkMode }) => {
  return (
    <div className="mt-7 flex flex-col gap-4 sm:gap-4.5">
      {/* Feature 1: Atenção - Não é teste de escola */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-amber-950/70 border border-amber-500/30' : 'bg-[#FFF4C9] border border-amber-300/60'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path
              d="M10 3L17.5 16H2.5L10 3Z"
              fill={darkMode ? '#FDC300' : '#F59E0B'}
            />
            <path
              d="M10 8.5V11.5M10 13.5H10.01"
              stroke="#04142B"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            Atenção! Este não é um teste de escola
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-300' : 'text-[#5B6472]'
            }`}
          >
            Não existem respostas certas ou erradas, apenas as suas.
          </span>
        </div>
      </div>

      {/* Feature 2: Sua Verdade */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-emerald-950/70 border border-emerald-500/20' : 'bg-[#DCF1E6]'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path
              d="M10 17.5l-1.45-1.32C3.4 11.61 0 8.53 0 4.75 0 1.67 2.42 0 5.5 0c1.74 0 3.41.81 4.5 2.09C11.09.81 12.76 0 14.5 0 17.58 0 20 1.67 20 4.75c0 3.78-3.4 6.86-8.55 11.43L10 17.5z"
              fill="#05B85B"
              transform="scale(0.8) translate(2.5, 2.5)"
            />
          </svg>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            Sua verdade em primeiro lugar
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-300' : 'text-[#5B6472]'
            }`}
          >
            Responda com o coração e com o que é verdade para você.
          </span>
        </div>
      </div>

      {/* Feature 4: O Beco como parceiro */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-purple-950/70 border border-purple-500/20' : 'bg-purple-100/80 border-purple-200'
          }`}
        >
          <span className="text-[18px]">🤖</span>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            O Beco estará com você
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-400' : 'text-[#5B6472]'
            }`}
          >
            Seu companheiro virtual guiará a jornada interativa sem pressão.
          </span>
        </div>
      </div>

      {/* Info Note Box */}
      <div
        className={`flex items-start gap-2.5 mt-3.5 p-3.5 rounded-xl border transition-colors ${
          darkMode
            ? 'bg-slate-900/70 border-slate-800 text-slate-300'
            : 'bg-white/80 border-slate-200 text-[#5B6472]'
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 shrink-0 mt-0.5 text-[#FBB800]"
        >
          <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 7.3v3.6M8 5.3h.01"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-[12.5px] leading-[1.6]">
          <b>Lembre-se:</b> Responda com o coração e com a sua verdade.
        </p>
      </div>
    </div>
  );
};
