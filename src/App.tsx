import React, { useState } from 'react';
import SennaLoginApp from './platforms/senna_login/App';
import SennaTesteApp from './platforms/senna_teste/App';
import AutoavaliacaoApp from './platforms/autoavaliacao/App';
import HackathonIasApp from './platforms/hackathon_ias/App';

type PlatformMode = 'hub' | 'login' | 'teste' | 'autoavaliacao' | 'hackathon';

export default function App() {
  const [mode, setMode] = useState<PlatformMode>('hub');
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-[#070F1E] text-white' : 'bg-[#F4F5F8] text-[#0B1226]'}`}>
      
      {/* BARRA FLUTUANTE DE CONTROLE DO HUB (Apenas para Testes/Apresentação) */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#040E2B] text-white px-4 py-2 flex items-center justify-between text-xs font-bold border-b border-white/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-[13px]">🎗️</span>
          <span className="tracking-tight uppercase font-black text-amber-400">IAS Portal Hub</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button 
            onClick={() => setMode('hub')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mode === 'hub' ? 'bg-[#FDC300] text-[#0b1226]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            🎛️ Hub Central
          </button>
          <button 
            onClick={() => setMode('login')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mode === 'login' ? 'bg-[#FDC300] text-[#0b1226]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            🏛️ Logins & Dashboards
          </button>
          <button 
            onClick={() => setMode('teste')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mode === 'teste' ? 'bg-[#FDC300] text-[#0b1226]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            🧬 Senna Teste
          </button>
          <button 
            onClick={() => setMode('autoavaliacao')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mode === 'autoavaliacao' ? 'bg-[#FDC300] text-[#0b1226]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            📝 Autoavaliação
          </button>
          <button 
            onClick={() => setMode('hackathon')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mode === 'hackathon' ? 'bg-[#FDC300] text-[#0b1226]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            🧠 Criatividade & Crítico
          </button>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Margem para a barra superior */}
      <div className="h-10"></div>

      {/* ÁREA DE CONTEÚDO DINÂMICO */}
      <div className="flex-1 flex flex-col">
        {mode === 'hub' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest block">Instituto Ayrton Senna</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Portal Integrado de Competências</h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Selecione abaixo o módulo que deseja testar. Todos os projetos foram compilados em um único local para deploy centralizado no Netlify.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-4">
              
              {/* Card Logins & Dashboards */}
              <div 
                onClick={() => setMode('login')}
                className="p-6 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-[1.02] text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl mb-4">🏛️</div>
                  <h3 className="text-lg font-bold mb-2">Logins & Dashboards</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Acesso para Professores, Gestores e Estudantes. Contém os gráficos de turmas, sugestões da BNCC do Prof. Cláudio e recuperação real de senha.
                  </p>
                </div>
                <span className="text-xs font-black text-blue-500">Acessar módulo &rarr;</span>
              </div>

              {/* Card Senna Teste */}
              <div 
                onClick={() => setMode('teste')}
                className="p-6 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-[1.02] text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl mb-4">🧬</div>
                  <h3 className="text-lg font-bold mb-2">Senna Teste</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Diagnóstico socioemocional original composto por 15 questões fixas com devolutiva baseada em perfils de personagens de séries.
                  </p>
                </div>
                <span className="text-xs font-black text-amber-500">Acessar módulo &rarr;</span>
              </div>

              {/* Card Autoavaliação */}
              <div 
                onClick={() => setMode('autoavaliacao')}
                className="p-6 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-[1.02] text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl mb-4">📝</div>
                  <h3 className="text-lg font-bold mb-2">Autoavaliação</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Questionário composto por 19 perguntas de autoavaliação contendo vinhetas situacionais de Aline, Juliana, Sofia e Marcos.
                  </p>
                </div>
                <span className="text-xs font-black text-emerald-500">Acessar módulo &rarr;</span>
              </div>

              {/* Card Criatividade & Crítico */}
              <div 
                onClick={() => setMode('hackathon')}
                className="p-6 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md cursor-pointer transition-all hover:scale-[1.02] text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-xl mb-4">🧠</div>
                  <h3 className="text-lg font-bold mb-2">Criatividade & Crítico</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Teste dinâmico e adaptativo que gera enunciados via IA do Gemini e oferece um relatório detalhado integrado com o robô Béco no WhatsApp.
                  </p>
                </div>
                <span className="text-xs font-black text-purple-500">Acessar módulo &rarr;</span>
              </div>

            </div>
          </div>
        )}

        {mode === 'login' && <SennaLoginApp />}
        {mode === 'teste' && <SennaTesteApp />}
        {mode === 'autoavaliacao' && <AutoavaliacaoApp />}
        {mode === 'hackathon' && <HackathonIasApp />}
      </div>

    </div>
  );
}
