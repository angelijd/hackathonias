import React from 'react';

interface Props {
  darkMode?: boolean;
}

export const FeaturesList: React.FC<Props> = ({ darkMode }) => {
  return (
    <div className="mt-7 flex flex-col gap-4 sm:gap-4.5">
      {/* Feature 1: 10 perguntas */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-emerald-950/70 border border-emerald-500/20' : 'bg-[#DCF1E6]'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path
              d="M3 4a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H8l-3.5 3v-3H5a2 2 0 01-2-2z"
              fill="#04142B"
            />
            <path
              d="M9.2 8.1c0-1 .8-1.7 1.8-1.7s1.7.6 1.7 1.5c0 .8-.5 1.1-1 1.4-.4.3-.7.5-.7 1.1"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="11" cy="12.7" r=".6" fill="#fff" />
          </svg>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            10 perguntas
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-400' : 'text-[#5B6472]'
            }`}
          >
            Teste pequeno, resultado incrível.
          </span>
        </div>
      </div>

      {/* Feature 2: IA como parceira */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-blue-950/70 border border-blue-500/20' : 'bg-[#D3E7FC]'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path
              d="M10 2l1.6 4.9L16.5 8l-4.9 1.6L10 14.5 8.4 9.6 3.5 8l4.9-1.1z"
              fill="#0B7CFB"
            />
          </svg>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            IA como parceira
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-400' : 'text-[#5B6472]'
            }`}
          >
            O Béco estará com você durante toda a jornada
          </span>
        </div>
      </div>

      {/* Feature 3: Relatório personalizado */}
      <div className="flex items-start gap-3.5 group">
        <div
          className={`w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
            darkMode ? 'bg-purple-950/70 border border-purple-500/20' : 'bg-[#E4DAFC]'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
            <path
              d="M5 15L15 5M15 5H7M15 5v8"
              stroke="#5B3FE0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="pt-0.5">
          <b
            className={`block text-[14.5px] font-extrabold tracking-tight ${
              darkMode ? 'text-white' : 'text-[#0B1226]'
            }`}
          >
            Relatório personalizado
          </b>
          <span
            className={`text-[13px] leading-[1.4] block mt-0.5 ${
              darkMode ? 'text-slate-400' : 'text-[#5B6472]'
            }`}
          >
            Descubra seus pontos fortes e caminhos para crescer ainda mais!
          </span>
        </div>
      </div>

      {/* Info Note Box */}
      <div
        className={`flex items-start gap-2.5 mt-4 p-3.5 rounded-xl border transition-colors ${
          darkMode
            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
            : 'bg-white/60 border-slate-200/70 text-[#5B6472]'
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-4 h-4 shrink-0 mt-0.5 text-[#9AA3B5]"
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
          Leva cerca de 25 minutos.
          <br />
          Não há respostas certas ou erradas.
        </p>
      </div>
    </div>
  );
};
