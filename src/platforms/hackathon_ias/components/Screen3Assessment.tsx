import React, { useState, useEffect } from 'react';
import { INTEREST_OPTIONS, EXPECTATION_OPTIONS } from '../data/preferencesData';
import { BecoBot } from './BecoBot';
import { BecoIntroModal } from './BecoIntroModal';
import { QuestionItem, Answer, ReportData, MergedReportData } from '../types';
import becoAvatar from '../beco-bot.png';

interface Props {
  userName: string;
  userAge: string;
  userGrade: string;
  userCity: string;
  userSchool: string;
  darkMode: boolean;
  selectedInterests?: string[];
  interestDetail?: string;
  selectedExpectation?: string | null;
  testType: 'critical_thinking' | 'creativity';
  onBackToWelcome: () => void;
}

export const Screen3Assessment: React.FC<Props> = ({
  userName,
  userAge,
  userGrade,
  userCity,
  userSchool,
  darkMode,
  selectedInterests = [],
  interestDetail = '',
  selectedExpectation = null,
  testType,
  onBackToWelcome,
}) => {
  const [activeTestType, setActiveTestType] = useState<'critical_thinking' | 'creativity'>(testType);
  const [testStep, setTestStep] = useState<1 | 2>(1);
  const [viewMode, setViewMode] = useState<'questions' | 'partial_report' | 'merged_report'>('questions');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [isBecoHighlighted, setIsBecoHighlighted] = useState(false);

  const [isReportLoading, setIsReportLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const [reportPC, setReportPC] = useState<ReportData | null>(null);
  const [reportCR, setReportCR] = useState<ReportData | null>(null);

  const [isMergedLoading, setIsMergedLoading] = useState(false);
  const [mergedReport, setMergedReport] = useState<MergedReportData | null>(null);

  const [sliderValue, setSliderValue] = useState(50);
  const [metacognitiveGoal, setMetacognitiveGoal] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);

  const handleCloseIntro = () => {
    setShowIntroVideo(false);
    setIsBecoHighlighted(true);
  };

  useEffect(() => {
    const activeRef = { active: true };
    if (questions.length === 0 && !isLoading) {
      fetchQuestionsForType(activeTestType, activeRef);
    }
    return () => {
      activeRef.active = false;
    };
  }, []);

  const fetchQuestionsForType = async (type: 'critical_thinking' | 'creativity', activeRef?: { active: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      const interests = selectedInterests
        .map((id) => INTEREST_OPTIONS.find((opt) => opt.id === id)?.label)
        .filter(Boolean);

      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          age: userAge,
          grade: userGrade,
          city: userCity,
          school: userSchool,
          interests: interests.length > 0 ? interests : ['Não especificado'],
          interestDetail,
          testType: type
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar perguntas');
      
      if (activeRef && !activeRef.active) return;
      
      const fetchedItems: QuestionItem[] = data.items || [];
      setQuestions(fetchedItems);
      setCurrentIdx(0);
      
      const initialAnswers = fetchedItems.map(item => 
        item.tipo === 'multipla_marcacao' ? [] : ''
      );
      setAnswers(initialAnswers);
    } catch (err: any) {
      if (activeRef && !activeRef.active) return;
      setError(err.message || 'Ocorreu um erro ao carregar o laboratório.');
    } finally {
      if (activeRef && !activeRef.active) return;
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsReportLoading(true);
    setError(null);
    try {
      const interests = selectedInterests
        .map((id) => INTEREST_OPTIONS.find((opt) => opt.id === id)?.label)
        .filter(Boolean);

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          age: userAge,
          grade: userGrade,
          city: userCity,
          school: userSchool,
          interests: interests.length > 0 ? interests : ['Não especificado'],
          questions,
          answers,
          testType: activeTestType
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar relatório');
      
      const reportObj = data as ReportData;
      setCurrentReport(reportObj);

      if (activeTestType === 'critical_thinking') {
        setReportPC(reportObj);
      } else {
        setReportCR(reportObj);
      }

      setViewMode('partial_report');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao gerar o relatório.');
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleStartSecondTest = () => {
    const nextType = activeTestType === 'critical_thinking' ? 'creativity' : 'critical_thinking';
    setActiveTestType(nextType);
    setTestStep(2);
    setViewMode('questions');
    fetchQuestionsForType(nextType);
  };

  const generateMergedReport = async () => {
    setIsMergedLoading(true);
    setViewMode('merged_report');
    setError(null);
    try {
      const interests = selectedInterests
        .map((id) => INTEREST_OPTIONS.find((opt) => opt.id === id)?.label)
        .filter(Boolean);

      const response = await fetch('/api/generate-merged-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          age: userAge,
          grade: userGrade,
          city: userCity,
          school: userSchool,
          interests: interests.length > 0 ? interests : ['Não especificado'],
          interestDetail,
          reportPC: reportPC || currentReport,
          reportCR: reportCR || currentReport
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao gerar relatório integrado');
      setMergedReport(data as MergedReportData);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao gerar o diagnóstico integrado.');
    } finally {
      setIsMergedLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneInput(formatted);
  };

  const isPhoneValid = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid(phoneInput)) return;

    setWhatsAppLoading(true);
    try {
      const interests = selectedInterests
        .map((id) => INTEREST_OPTIONS.find((opt) => opt.id === id)?.label)
        .filter(Boolean);

      const res = await fetch('/api/send-whatsapp-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneInput,
          name: userName,
          school: userSchool,
          grade: userGrade,
          city: userCity,
          interests,
          interestDetail,
          arquetipo: mergedReport?.arquetipo || 'Inovador Estratégico',
          superPoder: mergedReport?.superPoder,
          desafioDesenvolvimento: mergedReport?.desafioDesenvolvimento
        })
      });

      const data = await res.json();
      setWhatsAppSent(true);
      
      if (data.method === 'wa_link' && data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('WhatsApp error:', err);
    } finally {
      setWhatsAppLoading(false);
    }
  };

  const totalQ = questions.length || 5;

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      generateReport();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleAnswerChange = (text: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = text;
    setAnswers(newAnswers);
  };

  const handleCheckboxToggle = (option: string) => {
    const newAnswers = [...answers];
    const currentAnswer = (newAnswers[currentIdx] || []) as string[];
    
    if (currentAnswer.includes(option)) {
      newAnswers[currentIdx] = currentAnswer.filter(item => item !== option);
    } else {
      newAnswers[currentIdx] = [...currentAnswer, option];
    }
    setAnswers(newAnswers);
  };

  const isCurrentAnswerValid = () => {
    const currQ = questions[currentIdx];
    const currAns = answers[currentIdx];
    if (!currQ) return false;
    
    if (currQ.tipo === 'multipla_marcacao') {
      return Array.isArray(currAns) && currAns.length > 0;
    }
    return typeof currAns === 'string' && currAns.trim().length > 0;
  };

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentIdx] || (currentQ?.tipo === 'multipla_marcacao' ? [] : '');

  const otherTestName = activeTestType === 'critical_thinking' ? 'Criatividade' : 'Pensamento Crítico';

  return (
    <div className="w-full max-w-[1340px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-12 z-10 flex flex-col justify-between">
      <div
        className={`w-full rounded-[24px] sm:rounded-[28px] p-6 sm:p-9 shadow-[0_18px_45px_rgba(4,20,43,0.06)] border transition-all duration-300 ${
          darkMode
            ? 'bg-[#0B1426] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
            : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex-1">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#FDC300] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                Preparando os desafios de {activeTestType === 'critical_thinking' ? 'Pensamento Crítico' : 'Criatividade'}...
              </p>
            </div>
          ) : isReportLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-[#0B7CFB] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                O avaliador do Instituto Ayrton Senna está analisando suas respostas...
              </p>
            </div>
          ) : isMergedLoading ? (
            <div className="py-28 flex flex-col items-center justify-center space-y-5 text-center">
              <div className="w-16 h-16 border-4 border-[#FDC300] border-t-[#0B7CFB] rounded-full animate-spin"></div>
              <div>
                <h3 className="text-xl font-black mb-1">Fundindo Relatórios com Inteligência Artificial...</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Cruzando suas habilidades de Pensamento Crítico e Criatividade para gerar seu diagnóstico do Século XXI!
                </p>
              </div>
            </div>
          ) : viewMode === 'questions' && questions.length > 0 ? (
            /* ========================================================
               VIEW 1: QUESTIONS SESSION
               ======================================================== */
            <div>
              {/* Top Header Information */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-start gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-black bg-amber-400/20 text-[#04142B] dark:text-amber-300 border border-amber-400/40 shadow-xs">
                    Desafio {testStep}/2: {activeTestType === 'critical_thinking' ? 'Pensamento Crítico' : 'Criatividade'}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-600 dark:text-slate-200">
                    Questão {currentIdx + 1} de {totalQ}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full sm:w-48 flex flex-col gap-1.5">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FDC300] to-[#FBB800] h-full rounded-full transition-all duration-300"
                      style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 text-right">
                    {Math.round(((currentIdx + 1) / totalQ) * 100)}% concluído
                  </span>
                </div>
              </div>

              {/* Question Statement Box */}
              <div className="mb-8">
                <div className={`p-6 sm:p-7 rounded-3xl border mb-6 shadow-sm ${
                  darkMode ? 'bg-slate-900/80 border-slate-700/80' : 'bg-[#F8FAFC] border-slate-200/90'
                }`}>
                  <p className="text-[16px] sm:text-[18px] font-bold leading-relaxed text-[#04142B] dark:text-slate-100">
                    {(currentQ?.enunciado || '').replace(/^(?:Quest[ãa]o\s*\d+[\.\-\:]*|\d+[\.\-\:]+)\s*/i, '')}
                  </p>
                </div>

                {/* Answer Area */}
                {currentQ?.tipo === 'multipla_marcacao' && currentQ?.opcoes ? (
                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-300 mb-2">
                      ☑️ Selecione todas as opções que se aplicam a você:
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentQ.opcoes.map((opcao, oIdx) => {
                        const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(opcao);
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleCheckboxToggle(opcao)}
                            className={`w-full text-left p-4 rounded-2xl border text-sm sm:text-[15px] font-bold transition-all flex items-start gap-3.5 cursor-pointer ${
                              isChecked
                                ? darkMode
                                  ? 'border-[#3B82F6] bg-blue-950/70 text-white shadow-sm ring-2 ring-[#3B82F6]/50'
                                  : 'border-[#0B45D8] bg-blue-50/80 text-[#04142B] shadow-sm ring-2 ring-[#0B45D8]/25'
                                : darkMode
                                ? 'border-slate-800 bg-slate-900/50 text-slate-200 hover:bg-slate-800/80'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black shrink-0 mt-0.5 transition-colors ${
                              isChecked
                                ? 'bg-[#0B45D8] dark:bg-[#3B82F6] border-transparent text-white'
                                : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}>
                              {isChecked && '✓'}
                            </div>
                            <span className="flex-1 leading-snug">{opcao}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 mb-2">
                      ✏️ Sua resposta
                    </label>
                    <textarea
                      rows={5}
                      value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Descreva aqui sua linha de raciocínio com suas palavras..."
                      className={`w-full p-4 sm:p-5 rounded-2xl border text-sm sm:text-[15px] font-medium transition-all outline-none leading-relaxed ${
                        darkMode
                          ? 'bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-[#FBB800] focus:ring-1 focus:ring-[#FBB800]'
                          : 'bg-white border-slate-300 text-[#04142B] placeholder-slate-400 focus:border-[#0B45D8] focus:ring-1 focus:ring-[#0B45D8]'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Navigation Action Bar */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ← Anterior
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isCurrentAnswerValid()}
                  className="px-8 py-3.5 rounded-xl bg-[#0640C6] hover:bg-[#05329C] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm sm:text-[15px] font-extrabold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{currentIdx === totalQ - 1 ? 'Concluir Desafio e Ver Relatório' : 'Próxima Questão'}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'partial_report' && currentReport ? (
            /* ========================================================
               VIEW 2: PARTIAL REPORT (Test 1 or Test 2)
               ======================================================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Top Banner */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                    Relatório Parcial: {activeTestType === 'critical_thinking' ? 'Pensamento Crítico' : 'Criatividade'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-300">
                    Etapa {testStep} de 2
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#04142B] dark:text-white">
                  Mandou bem, {userName}!
                </h2>
              </div>

              {/* 3 Feedback Cards */}
              <div className="grid md:grid-cols-3 gap-6 pt-2">
                <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-emerald-950/30 border-emerald-800/40 text-slate-100' : 'bg-[#F2FDF6] border-emerald-100 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <h4 className="text-sm font-extrabold text-[#05B85B] dark:text-emerald-400">
                      🌟 O que você já domina
                    </h4>
                  </div>
                  <ul className="space-y-2 mt-1">
                    {(Array.isArray(currentReport.pontosFortes)
                      ? currentReport.pontosFortes
                      : [currentReport.pontosFortes]
                    ).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                        <span className="mt-0.5 text-emerald-500 flex-shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-amber-950/30 border-amber-800/40 text-slate-100' : 'bg-[#FFFBF0] border-amber-200 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <h4 className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      🌱 O que ainda pode ser um desafio pra você
                    </h4>
                  </div>
                  <ul className="space-y-2 mt-1">
                    {(Array.isArray(currentReport.pontosMelhoria)
                      ? currentReport.pontosMelhoria
                      : [currentReport.pontosMelhoria]
                    ).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                        <span className="mt-0.5 text-amber-500 flex-shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-blue-950/30 border-blue-800/40 text-slate-100' : 'bg-[#F0F7FF] border-blue-200 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <h4 className="text-sm font-extrabold text-[#0B7CFB] dark:text-blue-400">
                      🚀 Próximos passos
                    </h4>
                  </div>
                  <ul className="space-y-2 mt-1">
                    {(Array.isArray(currentReport.proximoPasso)
                      ? currentReport.proximoPasso
                      : [currentReport.proximoPasso]
                    ).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                        <span className="mt-0.5 text-blue-500 flex-shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Multi-test CTA Actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onBackToWelcome}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Voltar ao Início
                </button>

                {testStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleStartSecondTest}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0640C6] to-[#0B7CFB] hover:from-[#05329C] hover:to-[#0966D2] text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-98"
                  >
                    <span>Iniciar 2º Desafio: {otherTestName}</span>
                    <span className="text-lg">→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={generateMergedReport}
                    className="w-full sm:w-auto px-9 py-4 rounded-xl bg-gradient-to-r from-[#FDC300] to-[#FBB800] hover:from-[#FBB800] hover:to-[#F59E0B] text-[#04142B] font-black text-base shadow-xl shadow-amber-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-98"
                  >
                    <span>✨ Fundir Relatórios e Ver Diagnóstico Completo</span>
                    <span className="text-lg">→</span>
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'merged_report' && mergedReport ? (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="text-center max-w-3xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
                  🏆 Diagnóstico de Competências Integradas IAS
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-3">
                  Seu Perfil: <span className="text-[#0B7CFB]">{mergedReport.arquetipo}</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium">
                  {userName} ({userAge}, {userGrade}) — {userSchool}, {userCity}
                </p>
              </div>

              <div className={`p-7 sm:p-9 rounded-3xl border shadow-sm ${
                darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-gradient-to-br from-blue-50/70 to-slate-50 border-blue-100'
              }`}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-2xl">🧠</span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#04142B] dark:text-white">
                    Síntese Híbrida do seu Pensamento
                  </h3>
                </div>
                <p className="text-[15px] sm:text-[16px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium whitespace-pre-line">
                  {mergedReport.sinteseGeral}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                  <span>📊</span>
                  <span>Matriz de Competências do Século XXI</span>
                </h3>
                
                <div className="grid md:grid-cols-3 gap-5">
                  <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-[#F0F7FF] border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">💡</span>
                      <h4 className="text-xs font-extrabold text-[#0B7CFB] uppercase tracking-wider">Dimensão Cognitiva</h4>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {mergedReport.matrizCompetencias.cognitiva}
                    </p>
                  </div>

                  <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-[#F2FDF6] border-emerald-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🤝</span>
                      <h4 className="text-xs font-extrabold text-[#05B85B] uppercase tracking-wider">Dimensão Socioemocional</h4>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {mergedReport.matrizCompetencias.socioemocional}
                    </p>
                  </div>

                  <div className={`p-6 rounded-3xl border flex flex-col ${darkMode ? 'bg-purple-950/20 border-purple-900/30' : 'bg-[#FAF5FF] border-purple-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🎯</span>
                      <h4 className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Dimensão Metacognitiva</h4>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {mergedReport.matrizCompetencias.metacognitiva}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-6 sm:p-7 rounded-3xl border ${darkMode ? 'bg-amber-950/20 border-amber-900/30' : 'bg-[#FFFBF0] border-amber-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">⚡</span>
                    <h4 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Seu Superpoder</h4>
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                    {mergedReport.superPoder}
                  </p>
                </div>

                <div className={`p-6 sm:p-7 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🧭</span>
                    <h4 className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Próximo Desafio de Evolução</h4>
                  </div>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {mergedReport.desafioDesenvolvimento}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0640C6] to-[#0B7CFB] text-white shadow-xl flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
                  🚀
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1">Missão Prática para Você</h4>
                  <p className="text-sm sm:text-base font-bold leading-relaxed">
                    "{mergedReport.proximoPassoPratico}"
                  </p>
                </div>
              </div>

              <div className="p-7 sm:p-9 rounded-3xl border-2 border-[#25D366]/40 bg-gradient-to-br from-[#25D366]/10 via-transparent to-transparent shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-[#25D366] bg-[#FDC300] shadow-lg">
                      <img src={becoAvatar} alt="Béco" className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-sm font-bold shadow-md">
                      💬
                    </span>
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/20 text-[#25D366] text-xs font-extrabold mb-2">
                        <span>📲</span>
                        <span>Fale com o Béco no WhatsApp</span>
                      </div>
                      <p className="text-base sm:text-lg font-black text-[#04142B] dark:text-white leading-snug">
                        {mergedReport.recadoBecoWhats || "💬 Vou continuar contigo pra te ajudar no que ainda é desafiador pra você! Clica aqui pra falar comigo no WhatsApp!"}
                      </p>
                    </div>

                    {!whatsAppSent ? (
                      <form onSubmit={handleSendWhatsApp} className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
                        <div className="w-full relative">
                          <input
                            type="tel"
                            value={phoneInput}
                            onChange={handlePhoneInputChange}
                            placeholder="(11) 98765-4321"
                            maxLength={15}
                            className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none transition-all ${
                              darkMode
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-[#25D366]'
                                : 'bg-white border-slate-300 text-[#04142B] focus:border-[#25D366]'
                            }`}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!isPhoneValid(phoneInput) || whatsAppLoading}
                          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                        >
                          <span>{whatsAppLoading ? 'Enviando...' : 'Conectar'}</span>
                          <span>→</span>
                        </button>
                      </form>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center gap-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="text-2xl shrink-0">🚀</span>
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-emerald-700 dark:text-emerald-300">Mensagem enviada com sucesso!</p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">O Béco acabou de te chamar no WhatsApp. Dá uma olhada no seu celular!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={onBackToWelcome}
                  className="px-9 py-3.5 rounded-full text-sm font-extrabold bg-slate-800 hover:bg-slate-900 text-white shadow-lg transition-all cursor-pointer"
                >
                  Concluir Diagnóstico e Voltar ao Início
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Beco Intro Video Modal before test starts */}
      <BecoIntroModal
        isOpen={showIntroVideo && viewMode === 'questions' && testStep === 1}
        onClose={handleCloseIntro}
        userName={userName}
        darkMode={darkMode}
      />
      
      {viewMode === 'questions' && (
        <BecoBot 
          question={questions[currentIdx]?.enunciado || 'Estou aqui para te acompanhar!'}
          userName={userName}
          interests={selectedInterests}
          isHighlighted={isBecoHighlighted}
          onClearHighlight={() => setIsBecoHighlighted(false)}
        />
      )}
    </div>
  );
};
