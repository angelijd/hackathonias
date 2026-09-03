import React, { useEffect, useRef, useState } from 'react';

interface Props {
  darkMode: boolean;
}

export const AccessibilityButton: React.FC<Props> = ({ darkMode }) => {
  const [open, setOpen] = useState(false);
  const [adapted, setAdapted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAdapted = () => {
    const next = !adapted;
    setAdapted(next);
    document.body.classList.toggle('ias-a11y-mode', next);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu de acessibilidade"
        title="Acessibilidade"
        className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[16px] transition-all border ${
          darkMode
            ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
            : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
        }`}
      >
        ♿
      </button>

      {open && (
        <div
          className={`absolute right-0 top-[calc(100%+8px)] z-40 min-w-[220px] rounded-xl border p-2 shadow-lg ${
            darkMode ? 'bg-[#0B1426] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={toggleAdapted}
            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-colors ${
              darkMode ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            👁️ {adapted ? 'Desativar modo adaptado' : 'Modo adaptado'}
          </button>
        </div>
      )}
    </div>
  );
};
