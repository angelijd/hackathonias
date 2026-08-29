import React, { useState } from 'react';
import { Topbar } from './components/Topbar';
import { InstitutoAyrtonSennaBadge } from './components/InstitutoAyrtonSennaBadge';
import { HeroIllustration } from './components/HeroIllustration';
import { Screen2Preferences } from './components/Screen2Preferences';
import { Screen3Assessment } from './components/Screen3Assessment';
import { ScreenStep } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState('Estudante');
  const [userAge, setUserAge] = useState('14 anos');
  const [userGrade, setUserGrade] = useState('9º ano');
  const [userCity, setUserCity] = useState('São Paulo');
  const [userSchool, setUserSchool] = useState('Escola Estadual Dr. Ytrio Correia');
  const [screenStep, setScreenStep] = useState<ScreenStep>('welcome');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestDetails, setInterestDetails] = useState<Record<string, string>>({});
  const [selectedExpectation, setSelectedExpectation] = useState<string | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<'critical_thinking' | 'creativity' | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('Estudante');
  const [tempAge, setTempAge] = useState('14 anos');
  const [tempGrade, setTempGrade] = useState('9º ano');
  const [tempCity, setTempCity] = useState('São Paulo');
  const [tempSchool, setTempSchool] = useState('Escola Estadual Dr. Ytrio Correia');

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) setUserName(tempName.trim());
    if (tempAge.trim()) setUserAge(tempAge.trim());
    if (tempGrade.trim()) setUserGrade(tempGrade.trim());
    if (tempCity.trim()) setUserCity(tempCity.trim());
    if (tempSchool.trim()) setUserSchool(tempSchool.trim());
    setIsEditingName(false);
  };

  const handleStartWelcome = () => {
    setScreenStep('preferences');
  };

  const handleBackToWelcome = () => {
    setScreenStep('welcome');
  };

  const handleProceedToLab = () => {
    setScreenStep('assessment');
  };

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col justify-between transition-colors duration-300 ${
        darkMode ? 'bg-[#070F1E] text-white' : 'bg-[#F4F5F8] text-[#0B1226]'
      }`}
    >
      {/* Topbar */}
      <Topbar
        darkMode={darkMode}
        onToggleTheme={(isDark) => setDarkMode(isDark)}
        userName={userName}
        onEditName={() => {
          setTempName(userName);
          setTempAge(userAge);
          setTempGrade(userGrade);
          setTempCity(userCity);
          setTempSchool(userSchool);
          setIsEditingName(true);
        }}
      />

      {/* Stage / Dynamic Step Content Area */}
      <div className="relative overflow-hidden flex-1 flex flex-col justify-between">
        {/* Background Decorative SVG Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 1400 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-40 780 Q 40 640 160 700"
            stroke={darkMode ? '#FFFFFF' : '#04142B'}
            strokeOpacity={darkMode ? '0.04' : '0.05'}
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M1180 760 L 1420 560"
            stroke="#7C93E6"
            strokeOpacity={darkMode ? '0.22' : '0.18'}
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="1230"
            cy="840"
            r="90"
            fill="#7C93E6"
            opacity={darkMode ? '0.14' : '0.10'}
            className="blur-2xl"
          />
        </svg>

        {/* SCREEN 1: WELCOME SCREEN */}
        {screenStep === 'welcome' && (
          <div className="flex-1 flex flex-col justify-between">
            {/* Main 2-Column Grid */}
            <main className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-10 pt-8 sm:pt-14 pb-4 grid grid-cols-1 lg:grid-cols-[minmax(320px,486px)_1fr] gap-6 lg:gap-10 items-start animate-in fade-in duration-200">
              {/* Left Column: Content & Description */}
              <section className="pt-1 flex flex-col justify-start">
                {/* Instituto Ayrton Senna Logo Badge */}
                <InstitutoAyrtonSennaBadge darkMode={darkMode} />

                {/* Title / Heading */}
                <h1 className="text-[32px] sm:text-[38px] lg:text-[41px] leading-[1.14] font-extrabold tracking-[-0.015em] max-w-[440px]">
                  <span className={darkMode ? 'text-white' : 'text-[#0B1226]'}>
                    Oi, {userName}!{' '}
                  </span>
                  <span className="text-[#FBB800] block max-w-[340px] mt-0.5 sm:mt-1">
                    você está pronto para descobrir mais sobre você?
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-[16px] sm:text-[17px] leading-[1.5] font-semibold mt-5 sm:mt-6">
                  <span className={darkMode ? 'text-slate-200' : 'text-[#0B1226]'}>
                    Bem-vindo ao seu{' '}
                  </span>
                  <span className="text-[#05B85B] font-extrabold">autodiagnóstico socioemocional</span>.
                </p>

              </section>

              {/* Right Column: Hero Illustration */}
              <section className="relative flex items-center justify-center order-first lg:order-last">
                <HeroIllustration darkMode={darkMode} />
              </section>
            </main>

            {/* CTA Band & Pagination */}
            <section className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-10 mt-4 sm:mt-6 pb-8 sm:pb-12 flex flex-col items-center">
              <div className="w-full max-w-[420px] sm:max-w-[480px]">
                {/* CTA Button */}
                <button
                  type="button"
                  onClick={handleStartWelcome}
                  className="group relative w-full h-[58px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] flex items-center justify-center shadow-[0_10px_26px_rgba(253,195,0,0.34)] hover:shadow-[0_14px_30px_rgba(253,195,0,0.45)] active:scale-[0.985] transition-all duration-150 overflow-hidden cursor-pointer border border-amber-300/40"
                  aria-label="Vamos começar o teste"
                >
                  {/* Shimmer Sheen Reflection Animation */}
                  <span
                    className="absolute top-0 -left-[60%] w-[38%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-sheen pointer-events-none"
                    aria-hidden="true"
                  />

                  <span className="text-[16px] font-extrabold text-[#0B1226] tracking-tight pr-6 select-none">
                    Vamos começar!
                  </span>

                  {/* Action Circle Icon */}
                  <span
                    className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-full bg-[#040E2B] flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 group-active:translate-x-0.5 shadow-md"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                      <path
                        d="M7.5 4.5l5 5.5-5 5.5"
                        stroke="#fff"
                        strokeWidth="2.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* SCREEN 2: PREFERENCES (INTERESSES & OBJETIVOS) */}
        {screenStep === 'preferences' && (
          <div className="animate-in fade-in duration-200">
            <Screen2Preferences
              darkMode={darkMode}
              selectedInterests={selectedInterests}
              setSelectedInterests={setSelectedInterests}
              interestDetails={interestDetails}
              setInterestDetails={setInterestDetails}
              selectedExpectation={selectedExpectation}
              setSelectedExpectation={setSelectedExpectation}
              selectedTestType={selectedTestType}
              setSelectedTestType={setSelectedTestType}
              onBack={handleBackToWelcome}
              onProceed={handleProceedToLab}
            />
          </div>
        )}

        {/* SCREEN 3: ASSESSMENT SIMULATION */}
        {screenStep === 'assessment' && (
          <div className="animate-in fade-in duration-200">
            <Screen3Assessment
              userName={userName}
              userAge={userAge}
              userGrade={userGrade}
              userCity={userCity}
              userSchool={userSchool}
              darkMode={darkMode}
              selectedInterests={selectedInterests}
              interestDetail={selectedInterests.map(id => interestDetails[id]).filter(Boolean).join(', ')}
              selectedExpectation={selectedExpectation}
              testType={selectedTestType || 'critical_thinking'}
              onBackToWelcome={() => setScreenStep('welcome')}
            />
          </div>
        )}
      </div>

      {/* Name Customization Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-sm p-6 sm:p-8 rounded-[24px] shadow-[0_20px_50px_rgba(4,20,43,0.1)] border transition-all ${
              darkMode
                ? 'bg-[#0B1426] text-white border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                : 'bg-white text-[#0B1226] border-slate-200/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                👤
              </div>
              <h3 className="text-[19px] font-extrabold tracking-tight">Seus dados</h3>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Nome</span>
                <p className={`text-[15px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{userName || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Idade</span>
                  <p className={`text-[15px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{userAge || '-'}</p>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Ano Letivo</span>
                  <p className={`text-[15px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{userGrade || '-'}</p>
                </div>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Cidade</span>
                <p className={`text-[15px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{userCity || '-'}</p>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Escola</span>
                <p className={`text-[15px] font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{userSchool || '-'}</p>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className={`w-full py-3.5 rounded-xl text-[14.5px] font-extrabold transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-[#0B1226]'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
