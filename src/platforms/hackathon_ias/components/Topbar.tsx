import React from 'react';
import logoClaro from '../assets/logo-claro.png';
import logoEscuro from '../assets/logo-escuro.png';

interface TopbarProps {
  darkMode: boolean;
  onToggleTheme: (dark: boolean) => void;
  userName: string;
  onEditName: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  darkMode,
  onToggleTheme,
  userName,
  onEditName
}) => {
  return (
    <header className={`w-full px-5 sm:px-10 py-3.5 flex items-center justify-between transition-colors duration-300 z-30 relative shadow-sm ${
      darkMode ? 'bg-[#040E2B] text-white border-b border-[#ffffff10]' : 'bg-white text-slate-800 border-b border-slate-200'
    }`}>
      <div className="flex items-center gap-3">
        {/* Main Logo */}
        <img 
          src={darkMode ? logoEscuro : logoClaro} 
          alt="Logo" 
          className="h-[28px] w-auto object-contain"
        />

        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-[5px] tracking-[0.02em] uppercase ${
          darkMode ? 'text-[#8791A8] bg-white/6' : 'text-slate-500 bg-slate-100'
        }`}>
          PG&amp;C
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User Pill / Edit Trigger */}
        <button
          onClick={onEditName}
          title="Clique para editar o nome"
          className={`hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${
            darkMode 
              ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#05B85B] animate-pulse"></span>
          <span>Usuário: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{userName}</strong></span>
        </button>

        {/* Theme Toggle Button */}
        <div className={`flex items-center rounded-full p-1 gap-0.5 shadow-inner ${darkMode ? 'bg-white' : 'bg-slate-100 ring-1 ring-inset ring-slate-200'}`}>
          <button
            type="button"
            onClick={() => onToggleTheme(false)}
            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
              !darkMode
                ? 'bg-[#FDC300] shadow-sm scale-105'
                : 'bg-transparent text-[#7C879C] hover:text-slate-900'
            }`}
            aria-label="Modo claro"
            title="Ativar modo claro"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <circle cx="10" cy="10" r="4.3" fill="#04142B" />
              <path
                d="M10 1.6v2.3M10 16.1v2.3M3.5 3.5l1.6 1.6M14.9 14.9l1.6 1.6M1.6 10h2.3M16.1 10h2.3M3.5 16.5l1.6-1.6M14.9 5.1l1.6-1.6"
                stroke="#04142B"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onToggleTheme(true)}
            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
              darkMode
                ? 'bg-[#04142B] text-[#FDC300] shadow-sm scale-105'
                : 'bg-transparent text-[#7C879C] hover:text-slate-900'
            }`}
            aria-label="Modo escuro"
            title="Ativar modo escuro"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <path
                d="M17 11.5A7.5 7.5 0 018.5 3 7.5 7.5 0 1017 11.5z"
                fill={darkMode ? '#FDC300' : '#7C879C'}
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
