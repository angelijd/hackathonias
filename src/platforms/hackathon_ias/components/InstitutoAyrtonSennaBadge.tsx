import React from 'react';
import logoClaro from '../assets/logo-claro.png';
import logoEscuro from '../assets/logo-escuro.png';

interface Props {
  darkMode?: boolean;
}

export const InstitutoAyrtonSennaBadge: React.FC<Props> = ({ darkMode }) => {
  return (
    <div className="flex items-center mb-7 sm:mb-8">
      {/* Emblem Graphic */}
      <img 
        src={darkMode ? logoEscuro : logoClaro} 
        alt="Logo Instituto Ayrton Senna" 
        className="w-auto h-[48px] object-contain select-none opacity-90"
        loading="eager"
      />
    </div>
  );
};
