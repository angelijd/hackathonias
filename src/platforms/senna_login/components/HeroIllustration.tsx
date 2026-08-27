import React from 'react';
import heroImg from '../assets/hero-illustration.png';

interface Props {
  darkMode?: boolean;
}

export const HeroIllustration: React.FC<Props> = ({ darkMode = false }) => {
  return (
    <div className="relative flex items-center justify-center min-h-[360px] sm:min-h-[440px] lg:min-h-[500px] w-full">
      {/* Soft background ambient radial glows */}
      <div
        className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          darkMode ? 'bg-indigo-600/15' : 'bg-blue-400/20'
        }`}
      />
      <div
        className={`absolute -top-10 -right-5 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          darkMode ? 'bg-amber-500/10' : 'bg-amber-300/25'
        }`}
      />

      <div className="relative w-full max-w-[520px] lg:max-w-[580px] px-2 sm:px-4">
        <img
          src={heroImg}
          alt="Ilustração principal"
          className="w-full h-auto object-contain animate-illo-float drop-shadow-[0_24px_38px_rgba(4,20,43,0.14)] select-none"
          loading="eager"
          
        />
      </div>
    </div>
  );
};
