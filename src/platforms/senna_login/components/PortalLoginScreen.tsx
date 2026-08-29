import React, { useState } from 'react';
import { InstitutoAyrtonSennaBadge } from './InstitutoAyrtonSennaBadge';
import { HeroIllustration } from './HeroIllustration';

interface PortalLoginScreenProps {
  darkMode: boolean;
  onLoginSuccess?: (name: string, role: UserInstance, contact?: { email: string; whatsapp: string }) => void;
}

type UserInstance = 'aluno' | 'professor' | 'gestor';

interface Message {
  sender: 'system' | 'student' | 'sofia';
  text: string;
}

const RECOVERY_WAIT_SECONDS = 600;

export const PortalLoginScreen: React.FC<PortalLoginScreenProps> = ({ darkMode, onLoginSuccess }) => {
  const [instance, setInstance] = useState<UserInstance>('aluno');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Estados para Primeiro Acesso
  const [isFirstAccessModalOpen, setIsFirstAccessModalOpen] = useState(false);
  const [firstAccessRole, setFirstAccessRole] = useState<UserInstance | null>(null);

  // Primeiro Acesso - Estudante (Aluno)
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [confirmStudentPassword, setConfirmStudentPassword] = useState('');
  const [studentPasswordError, setStudentPasswordError] = useState<string | null>(null);

  // Primeiro Acesso - Professor / Gestor
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalWhatsapp, setPersonalWhatsapp] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('Qual o nome do seu primeiro animal de estimação?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);

  // Estados do Modal de Recuperação (Esqueci a Senha)
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  // WhatsApp informado na tela de boas-vindas (tela 0), reaproveitado aqui
  const [evaluatorWhatsapp] = useState(() => {
    try {
      return sessionStorage.getItem('ias_evaluator_whatsapp') || '';
    } catch {
      return '';
    }
  });
  const [remainingSeconds, setRemainingSeconds] = useState(RECOVERY_WAIT_SECONDS);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<'form' | 'waiting' | 'approved' | 'rejected' | 'timeout'>('form');

  // Estados para Recuperação do Professor / Gestor
  const [teacherRecoveryCode, setTeacherRecoveryCode] = useState('');
  const [teacherRecoveryStep, setTeacherRecoveryStep] = useState<'input_code' | 'select_method' | 'security_question' | 'success_display' | 'support_only'>('input_code');
  const [recoveryOptions, setRecoveryOptions] = useState<{ email: string | null; whatsapp: string | null; question: string | null } | null>(null);
  const [selectedRecoveryMethod, setSelectedRecoveryMethod] = useState<'email' | 'whatsapp' | 'question' | null>(null);
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [recoveryResultMsg, setRecoveryResultMsg] = useState<string | null>(null);
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Preenchimento Automático dos Campos de Login ao Trocar de Aba (Testador só clica em Acessar)
  React.useEffect(() => {
    if (instance === 'aluno') {
      setIdentifier('Aluno');
      setPassword('1234');
    } else if (instance === 'professor') {
      setIdentifier('Professor');
      setPassword('1234');
    } else if (instance === 'gestor') {
      setIdentifier('Gestor');
      setPassword('1234');
    }
    setLoginError(null);
    setLoginSuccess(null);
  }, [instance]);

  // Hook para o Cronômetro e Polling do status
  React.useEffect(() => {
    let timerInterval: any = null;
    let pollingInterval: any = null;

    if (recoveryStep === 'waiting' && requestId) {
      setRemainingSeconds(RECOVERY_WAIT_SECONDS);

      // Cronômetro regressivo
      timerInterval = setInterval(() => {
        setRemainingSeconds((prev) => {
          // Ao chegar a 0, expira automaticamente
          if (prev <= 1) {
            setRecoveryStep('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling do status da autorização a cada 2 segundos
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/auth-recovery/status/${requestId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'approved') {
              setRecoveryStep('approved');
            } else if (data.status === 'rejected') {
              setRecoveryStep('rejected');
            }
          }
        } catch (err) {
          console.warn('Erro ao consultar status do pedido:', err);
        }
      }, 2000);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [recoveryStep, requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setIsSubmitting(true);
    setLoginSuccess(null);
    setLoginError(null);

    if (instance === 'aluno') {
      setTimeout(() => {
        setIsSubmitting(false);
        const cleanId = identifier.trim().toLowerCase();
        const cleanPass = password.trim();

        if (cleanId === 'aluno' && cleanPass === '1234') {
          setFirstAccessRole('aluno');
          setIsFirstAccessModalOpen(true);
        } else {
          setLoginError(`Código ou senha de acesso inválidos. Utilize os dados de teste correspondentes:\n\n🎒 Estudante: Aluno | Senha: 1234`);
        }
      }, 800);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: identifier.trim(),
          password: password.trim()
        })
      });

      setIsSubmitting(false);

      if (res.ok) {
        const data = await res.json();
        if (data.isFirstAccess) {
          setFirstAccessRole(data.role);
          setIsFirstAccessModalOpen(true);
        } else {
          if (onLoginSuccess) {
            onLoginSuccess(data.name, data.role);
          }
        }
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Credenciais de acesso incorretas.');
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setLoginError('Erro ao conectar com o servidor de autenticação.');
    }
  };

  // Envia a solicitação real de recuperação para o backend (que chama a Evolution API)
  const handleSendRecoveryRequest = async () => {
    if (!studentName || !studentClass || !evaluatorWhatsapp) return;
    setRecoveryStep('waiting');
    setRequestId(null);
    setRemainingSeconds(RECOVERY_WAIT_SECONDS);

    try {
      const response = await fetch('/api/auth-recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          studentClass: studentClass,
          phoneNumber: evaluatorWhatsapp
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRequestId(data.id);
      } else {
        console.error('Falha ao disparar solicitação no servidor.');
        setRecoveryStep('rejected');
      }
    } catch (err) {
      console.error('Erro na chamada da API:', err);
      setRecoveryStep('rejected');
    }
  };

  // Conclui o fluxo preenchendo automaticamente as credenciais e fechando o modal
  const handleConfirmApprovedEntrance = () => {
    setIdentifier('Aluno');
    setPassword('1234');
    setIsRecoveryModalOpen(false);
    setLoginSuccess('Acesso liberado via professor! Bem-vindo, Aluno.');
  };

  const handleTeacherCheckOptions = async () => {
    if (!teacherRecoveryCode.trim()) return;
    setRecoveryLoading(true);
    setRecoveryErrorMsg(null);

    try {
      const res = await fetch('/api/auth/recovery-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: teacherRecoveryCode.trim() })
      });

      setRecoveryLoading(false);

      if (res.ok) {
        const data = await res.json();
        if (data.error === 'support_only') {
          setTeacherRecoveryStep('support_only');
        } else {
          setRecoveryOptions(data);
          setTeacherRecoveryStep('select_method');
        }
      } else {
        const data = await res.json();
        if (data.error === 'user_not_found') {
          setRecoveryErrorMsg('Usuário não cadastrado ou código incorreto.');
        } else {
          setTeacherRecoveryStep('support_only');
        }
      }
    } catch (err) {
      console.error(err);
      setRecoveryLoading(false);
      setRecoveryErrorMsg('Falha de conexão com o servidor.');
    }
  };

  const handleTeacherSendRecovery = async () => {
    if (!selectedRecoveryMethod) return;

    if (selectedRecoveryMethod === 'question') {
      setTeacherRecoveryStep('security_question');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryErrorMsg(null);

    try {
      const res = await fetch('/api/auth/recovery-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: teacherRecoveryCode.trim(),
          method: selectedRecoveryMethod
        })
      });

      setRecoveryLoading(false);

      if (res.ok) {
        const data = await res.json();
        if (selectedRecoveryMethod === 'email') {
          if (data.previewUrl) {
            setRecoveryResultMsg(`E-mail de redefinição enviado! Abrindo caixa de testes descartável...`);
            window.open(data.previewUrl, '_blank');
          } else {
            setRecoveryResultMsg(`Sucesso! E-mail enviado com suas credenciais de acesso.`);
          }
        } else {
          setRecoveryResultMsg(`Sucesso! As credenciais de acesso foram enviadas para seu WhatsApp.`);
        }
        setTeacherRecoveryStep('success_display');
      } else {
        const data = await res.json();
        setRecoveryErrorMsg(data.error || 'Erro ao enviar a redefinição.');
      }
    } catch (err) {
      console.error(err);
      setRecoveryLoading(false);
      setRecoveryErrorMsg('Erro de rede ao enviar solicitação.');
    }
  };

  const handleTeacherSubmitSecurityAnswer = async () => {
    if (!securityAnswerInput.trim()) return;
    setRecoveryLoading(true);
    setRecoveryErrorMsg(null);

    try {
      const res = await fetch('/api/auth/recovery-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: teacherRecoveryCode.trim(),
          method: 'question',
          answer: securityAnswerInput.trim()
        })
      });

      setRecoveryLoading(false);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRecoveryResultMsg(`Resposta correta! Sua senha de acesso atual é: ${data.password}`);
          setTeacherRecoveryStep('success_display');
        } else {
          setRecoveryErrorMsg(data.error || 'Resposta de segurança incorreta.');
        }
      } else {
        const data = await res.json();
        setRecoveryErrorMsg(data.error || 'Falha ao validar resposta.');
      }
    } catch (err) {
      console.error(err);
      setRecoveryLoading(false);
      setRecoveryErrorMsg('Erro ao conectar com o servidor.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-10 pt-8 sm:pt-14 pb-14 grid grid-cols-1 lg:grid-cols-[minmax(320px,520px)_1fr] gap-8 lg:gap-14 items-center animate-in fade-in duration-300">
      {/* Coluna Esquerda: Formulário de Login */}
      <section className="flex flex-col justify-start w-full">
        {/* IAS Badge */}
        <InstitutoAyrtonSennaBadge darkMode={darkMode} />

        {/* Título de Boas-vindas */}
        <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.15] font-black tracking-[-0.015em]">
          <span className={darkMode ? 'text-white' : 'text-[#0B1226]'}>
            Portal de Acesso
          </span>
        </h1>

        {/* Instâncias de Acesso (Tabs Aluno / Professor / Gestor) */}
        <div className={`flex p-1 rounded-2xl mt-8 mb-6 border transition-all ${
          darkMode 
            ? 'bg-slate-900/60 border-slate-800' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {(['aluno', 'professor', 'gestor'] as UserInstance[]).map((tab) => {
            const isActive = instance === tab;
            const labels: Record<UserInstance, string> = {
              aluno: 'Estudante',
              professor: 'Professor',
              gestor: 'Gestor'
            };
            const icons: Record<UserInstance, string> = {
              aluno: '🎒',
              professor: '🧑‍🏫',
              gestor: '🏛️'
            };

            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setInstance(tab);
                  setIdentifier('');
                  setPassword('');
                  setLoginSuccess(null);
                  setLoginError(null);
                }}
                className={`flex-1 py-3 px-2 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-[#FDC300] to-[#FBB800] text-[#0B1226] shadow-md scale-[1.02]'
                    : darkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{icons[tab]}</span>
                <span>{labels[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* Formulário de Login Dinâmico */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identificador (Código) */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {instance === 'aluno' && 'Código de Estudante'}
              {instance === 'professor' && 'Código de Professor'}
              {instance === 'gestor' && 'Código de Gestor'}
            </label>
            <input
              type="text"
              required
              placeholder="Digite seu código de acesso (Ex: Aluno)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                darkMode
                  ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#FBB800] focus:ring-1 focus:ring-[#FBB800]'
                  : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] focus:ring-1 focus:ring-[#FBB800] shadow-sm'
              }`}
            />
          </div>

          {/* Senha */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Senha
            </label>
            <input
              type="password"
              required
              placeholder="No primeiro acesso, use senha padrão"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                darkMode
                  ? 'bg-slate-950/80 border-slate-800 text-white focus:border-[#FBB800] focus:ring-1 focus:ring-[#FBB800]'
                  : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] focus:ring-1 focus:ring-[#FBB800] shadow-sm'
              }`}
            />
            <button
              type="button"
              onClick={() => {
                setIsRecoveryModalOpen(true);
                if (instance === 'aluno') {
                  setRecoveryStep('form');
                  setStudentName('');
                  setStudentClass('');
                } else {
                  setTeacherRecoveryCode(identifier || (instance === 'professor' ? 'Professor' : 'Gestor'));
                  setTeacherRecoveryStep('input_code');
                  setRecoveryOptions(null);
                  setSelectedRecoveryMethod(null);
                  setSecurityAnswerInput('');
                  setRecoveryResultMsg(null);
                  setRecoveryErrorMsg(null);
                }
              }}
              className="mt-2.5 text-xs font-black text-[#FBB800] hover:text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-full border border-amber-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.03] active:scale-[0.97]"
            >
              🔒 Não consigo entrar
            </button>
          </div>

          {/* Toast / Alerta de Sucesso */}
          {loginSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
              {loginSuccess}
            </div>
          )}

          {/* Botão de Enviar (Acessar) */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full h-[58px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] flex items-center justify-center shadow-[0_10px_26px_rgba(253,195,0,0.25)] hover:shadow-[0_14px_30px_rgba(253,195,0,0.35)] active:scale-[0.985] transition-all duration-150 overflow-hidden cursor-pointer border border-amber-300/40 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {/* Shimmer Sheen Reflection Animation */}
              <span className="absolute top-0 -left-[60%] w-[38%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-sheen pointer-events-none" />

              <span className="text-[16px] font-extrabold text-[#0B1226] tracking-tight pr-6 select-none">
                {isSubmitting ? 'Verificando credenciais...' : 'Acessar Plataforma'}
              </span>

              {/* Action Circle Icon */}
              <span className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-full bg-[#040E2B] flex items-center justify-center transition-transform duration-200 ease-out group-hover:scale-105 shadow-md">
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
        </form>
      </section>

      {/* Coluna Direita: Ilustração (Mesmo tamanho) */}
      <section className="relative flex items-center justify-center order-first lg:order-last">
        <HeroIllustration darkMode={darkMode} />
      </section>

      {/* ========================================================
          MODAL DE RECUPERAÇÃO DE ACESSO (ESTUDANTE) COM CRONÔMETRO E POLLING REAL
          ======================================================== */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-[28px] border shadow-2xl overflow-hidden transition-all flex flex-col ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-[#0B1226]'
          }`}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{instance === 'aluno' ? '🎒' : '🔑'}</span>
                <div>
                  <h3 className="text-lg font-black leading-tight">Recuperar Acesso</h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {instance === 'aluno' ? 'Perfil Estudante' : instance === 'professor' ? 'Perfil Professor' : 'Perfil Gestor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecoveryModalOpen(false)}
                aria-label="Fechar"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border transition-all ${
                  darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[70vh]">
              {instance === 'aluno' ? (
                <>
                  {recoveryStep === 'form' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed">
                        Olá! Se você esqueceu seu código de acesso, informe seus dados para o seu professor responsável receber uma solicitação de entrada via WhatsApp.
                      </div>

                      <div>
                        <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Seu Nome Completo
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ayrton Senna da Silva"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                            darkMode
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                              : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Sua Turma
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: 9º ano A"
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                          className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                            darkMode
                              ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                              : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                          }`}
                        />
                      </div>

                      {/* WhatsApp reaproveitado da tela inicial (tela 0) */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        darkMode ? 'bg-slate-950/60 border-amber-500/20' : 'bg-amber-50/50 border-amber-200 shadow-sm'
                      }`}>
                        {evaluatorWhatsapp ? (
                          <p className={`text-xs font-semibold leading-relaxed ${darkMode ? 'text-slate-300' : 'text-[#5B6472]'}`}>
                            📢 Vamos enviar a solicitação para o WhatsApp informado na tela inicial: <strong>+{evaluatorWhatsapp}</strong>
                          </p>
                        ) : (
                          <p className="text-xs font-semibold leading-relaxed text-rose-500">
                            ⚠️ Não encontramos o WhatsApp informado na tela inicial. Volte para a tela inicial do Portal IAS e informe seus dados antes de continuar.
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={!studentName || !studentClass || !evaluatorWhatsapp}
                          onClick={handleSendRecoveryRequest}
                          className="group relative w-full h-[56px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] flex items-center justify-center shadow-md active:scale-[0.98] transition-all duration-150 overflow-hidden cursor-pointer border border-amber-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-[15px] font-black text-[#0B1226] select-none">
                            Enviar pedido de entrada
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TELA DE ESPERA COM SPINNER E CRONÔMETRO */}
                  {recoveryStep === 'waiting' && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-6 animate-in fade-in duration-200">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="animate-spin w-16 h-16 text-[#FBB800]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="absolute text-xl">⏳</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                          Aguardando resposta
                        </h4>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-black border ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-amber-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}>
                        ⏱️ Tempo restante: {formatTime(remainingSeconds)}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 leading-normal max-w-[38ch]">
                        Se demorar mais do que 10 minutos, procure a Secretaria para regularizar seus dados.
                      </p>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecoveryModalOpen(false);
                            setRecoveryStep('form');
                          }}
                          className={`w-full py-3 rounded-full text-xs font-black border cursor-pointer transition-all ${
                            darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TIMEOUT: CRONÔMETRO ZEROU SEM RESPOSTA */}
                  {recoveryStep === 'timeout' && (
                    <div className="flex flex-col items-center py-6 space-y-5 text-center animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-3xl">
                        ⚠️
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-rose-600 dark:text-rose-400">
                          Sem resposta. Procure a secretaria
                        </h4>
                      </div>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={() => setIsRecoveryModalOpen(false)}
                          className="w-full py-3 rounded-full text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer transition-all"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ALERTA DE REJEIÇÃO */}
                  {recoveryStep === 'rejected' && (
                    <div className="flex flex-col items-center py-6 space-y-5 text-center animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-3xl">
                        ⚠️
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-rose-600 dark:text-rose-400">
                          Acesso não autorizado
                        </h4>
                        <p className={`text-xs font-semibold leading-relaxed max-w-[38ch] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          O professor responsável recusou a solicitação de acesso. Por favor, procure a Secretaria da sua escola.
                        </p>
                      </div>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={() => setIsRecoveryModalOpen(false)}
                          className="w-full py-3 rounded-full text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer transition-all"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUCESSO E LIBERAÇÃO */}
                  {recoveryStep === 'approved' && (
                    <div className="flex flex-col items-center py-6 space-y-5 text-center animate-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">
                        🎉
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl sm:text-2xl font-black text-center text-[#FBB800] mb-2">
                          Compreender a si mesmo é a chave para o seu crescimento!
                        </h2>
                        <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          Acesso Liberado!
                        </h4>
                        <p className={`text-xs font-semibold leading-relaxed max-w-[38ch] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Seu professor responsável autorizou sua entrada na plataforma. Clique abaixo para prosseguir.
                        </p>
                      </div>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={handleConfirmApprovedEntrance}
                          className="w-full py-3.5 rounded-full text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all"
                        >
                          Entrar na Plataforma
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* RECUPERAÇÃO DO PROFESSOR / GESTOR (CANAIS DE HIDRATAÇÃO / SUPORTE / TESTE REAL) */
                <div className="space-y-5 animate-in fade-in duration-200">
                  
                  {/* Passo 1: Digitar o código */}
                  {teacherRecoveryStep === 'input_code' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-xs sm:text-sm font-semibold leading-relaxed">
                        Olá! Para redefinir seu acesso, insira seu Código de Acesso pré-cadastrado abaixo para consultarmos seus canais de recuperação.
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider mb-2">
                          Seu Código de Acesso
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Professor ou Gestor"
                          value={teacherRecoveryCode}
                          onChange={(e) => setTeacherRecoveryCode(e.target.value)}
                          className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                            darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]' : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800]'
                          }`}
                        />
                      </div>

                      {recoveryErrorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                          ⚠️ {recoveryErrorMsg}
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleTeacherCheckOptions}
                          disabled={recoveryLoading || !teacherRecoveryCode.trim()}
                          className="w-full h-[52px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] text-sm font-black text-[#0B1226] shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                        >
                          {recoveryLoading ? 'Consultando canais...' : 'Consultar Canais de Redefinição'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherRecoveryStep('support_only')}
                          className={`w-full mt-2.5 py-2.5 rounded-full text-xs font-black cursor-pointer transition-all ${
                            darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Não sei meu código de acesso
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Passo 2: Selecionar o canal */}
                  {teacherRecoveryStep === 'select_method' && recoveryOptions && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-xs font-semibold leading-relaxed">
                        Encontramos canais de segurança configurados para sua conta! Selecione por onde deseja receber seu acesso de teste:
                      </div>

                      <div className="space-y-3">
                        {recoveryOptions.whatsapp && (
                          <button
                            type="button"
                            onClick={() => setSelectedRecoveryMethod('whatsapp')}
                            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between font-bold text-xs sm:text-sm cursor-pointer transition-all ${
                              selectedRecoveryMethod === 'whatsapp'
                                ? 'border-[#FBB800] bg-amber-500/10 text-amber-500'
                                : darkMode ? 'border-slate-800 hover:bg-slate-800/50 text-slate-350' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>📱 Enviar para meu WhatsApp Pessoal</span>
                            <span className="font-mono text-xs opacity-80">
                              (+{recoveryOptions.whatsapp.slice(0, 4)}...{recoveryOptions.whatsapp.slice(-4)})
                            </span>
                          </button>
                        )}

                        {recoveryOptions.email && (
                          <button
                            type="button"
                            onClick={() => setSelectedRecoveryMethod('email')}
                            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between font-bold text-xs sm:text-sm cursor-pointer transition-all ${
                              selectedRecoveryMethod === 'email'
                                ? 'border-[#FBB800] bg-amber-500/10 text-amber-500'
                                : darkMode ? 'border-slate-800 hover:bg-slate-800/50 text-slate-350' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>✉️ Enviar para meu E-mail Pessoal</span>
                            <span className="font-mono text-xs opacity-80">
                              ({recoveryOptions.email.slice(0, 3)}...@{recoveryOptions.email.split('@')[1]})
                            </span>
                          </button>
                        )}

                        {recoveryOptions.question && (
                          <button
                            type="button"
                            onClick={() => setSelectedRecoveryMethod('question')}
                            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between font-bold text-xs sm:text-sm cursor-pointer transition-all ${
                              selectedRecoveryMethod === 'question'
                                ? 'border-[#FBB800] bg-amber-500/10 text-amber-500'
                                : darkMode ? 'border-slate-800 hover:bg-slate-800/50 text-slate-350' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span>❓ Responder Pergunta de Segurança</span>
                            <span className="text-xs text-amber-500 font-black">Validar na tela</span>
                          </button>
                        )}
                      </div>

                      {recoveryErrorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                          ⚠️ {recoveryErrorMsg}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setTeacherRecoveryStep('input_code')}
                          className={`flex-1 h-[52px] rounded-full border text-xs font-black uppercase tracking-wider cursor-pointer ${
                            darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleTeacherSendRecovery}
                          disabled={recoveryLoading || !selectedRecoveryMethod}
                          className="flex-1 h-[52px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] text-xs font-black uppercase tracking-wider text-[#0B1226] shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                        >
                          {recoveryLoading ? 'Processando...' : 'Avançar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Passo 3: Pergunta de segurança */}
                  {teacherRecoveryStep === 'security_question' && recoveryOptions && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-xs font-semibold leading-relaxed">
                        Responda à pergunta de segurança cadastrada na hidratação do seu login para redefinir seu acesso:
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-black text-center border-b pb-3 border-slate-250 dark:border-slate-800">
                          {recoveryOptions.question}
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider mb-2">
                            Sua Resposta Secreta
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Digite a resposta correta"
                            value={securityAnswerInput}
                            onChange={(e) => setSecurityAnswerInput(e.target.value)}
                            className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                              darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]' : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800]'
                            }`}
                          />
                        </div>
                      </div>

                      {recoveryErrorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                          ⚠️ {recoveryErrorMsg}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setTeacherRecoveryStep('select_method')}
                          className={`flex-1 h-[52px] rounded-full border text-xs font-black uppercase tracking-wider cursor-pointer ${
                            darkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleTeacherSubmitSecurityAnswer}
                          disabled={recoveryLoading || !securityAnswerInput.trim()}
                          className="flex-1 h-[52px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] text-xs font-black uppercase tracking-wider text-[#0B1226] shadow-md flex items-center justify-center cursor-pointer disabled:opacity-50"
                        >
                          {recoveryLoading ? 'Verificando...' : 'Validar Resposta'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Passo 4: Sucesso e Exibição */}
                  {teacherRecoveryStep === 'success_display' && (
                    <div className="flex flex-col items-center py-6 space-y-5 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">
                        🎉
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          Recuperação Concluída
                        </h4>
                        <p className={`text-xs font-semibold leading-relaxed max-w-[40ch] ${darkMode ? 'text-slate-350' : 'text-slate-600'}`}>
                          {recoveryResultMsg}
                        </p>
                      </div>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecoveryModalOpen(false);
                            setIdentifier(teacherRecoveryCode);
                            setPassword('1234');
                          }}
                          className="w-full py-3.5 rounded-full text-xs font-black bg-gradient-to-br from-[#FDC300] to-[#FBB800] text-[#0b1226] shadow-md cursor-pointer transition-all"
                        >
                          Voltar para o Login
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Passo 5: Suporte Somente */}
                  {teacherRecoveryStep === 'support_only' && (
                    <div className="flex flex-col items-center py-6 space-y-5 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-3xl">
                        🛡️
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                          Contate o Suporte Técnico
                        </h4>
                        <p className={`text-xs font-semibold leading-relaxed max-w-[40ch] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Não encontramos um canal de redefinição disponível ou automatizado para o seu caso. Fale com o nosso suporte para recuperar seu acesso:
                        </p>
                        <a href="mailto:suporte@institutoayrtonsenna.org.br" className="text-xs font-black text-[#FBB800] pt-1 hover:underline">
                          suporte@institutoayrtonsenna.org.br
                        </a>
                      </div>
                      <div className="pt-2 w-full">
                        <button
                          type="button"
                          onClick={() => setIsRecoveryModalOpen(false)}
                          className="w-full py-3 rounded-full text-xs font-black bg-slate-600 hover:bg-rose-700 text-white shadow-md cursor-pointer transition-all"
                        >
                          Fechar Modal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE PRIMEIRO ACESSO (ESTUDANTE / EDUCADOR / GESTOR)
          ======================================================== */}
      {isFirstAccessModalOpen && firstAccessRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-[28px] border shadow-2xl overflow-hidden transition-all flex flex-col ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-[#0B1226]'
          }`}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{firstAccessRole === 'aluno' ? '🎒' : firstAccessRole === 'professor' ? '🧑‍🏫' : '🏛️'}</span>
                <div>
                  <h3 className="text-lg font-black leading-tight">Configuração de Primeiro Acesso</h3>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {firstAccessRole === 'aluno' ? 'Perfil Estudante' : firstAccessRole === 'professor' ? 'Perfil Professor' : 'Perfil Gestor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFirstAccessModalOpen(false)}
                aria-label="Fechar"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border transition-all ${
                  darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[70vh] space-y-4">
              
              {/* PRIMEIRO ACESSO DO ALUNO */}
              {firstAccessRole === 'aluno' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed">
                    👋 Olá, <strong>Aluno</strong>! Este é seu primeiro acesso à plataforma. Escolha uma nova senha para proteger sua conta.
                  </div>

                  <div>
                    <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Nova Senha de Acesso
                    </label>
                    <input
                      type="password"
                      placeholder="Crie uma senha forte"
                      value={newStudentPassword}
                      onChange={(e) => setNewStudentPassword(e.target.value)}
                      className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                          : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Confirme a Nova Senha
                    </label>
                    <input
                      type="password"
                      placeholder="Repita a senha digitada acima"
                      value={confirmStudentPassword}
                      onChange={(e) => setConfirmStudentPassword(e.target.value)}
                      className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                          : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                      }`}
                    />
                  </div>

                  {studentPasswordError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold leading-normal">
                      ⚠️ {studentPasswordError}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStudentPassword) {
                          setStudentPasswordError('Digite a nova senha.');
                          return;
                        }
                        if (newStudentPassword !== confirmStudentPassword) {
                          setStudentPasswordError('As senhas digitadas não coincidem.');
                          return;
                        }
                        setStudentPasswordError(null);
                        setIsFirstAccessModalOpen(false);
                        if (onLoginSuccess) {
                          onLoginSuccess('Aluno', 'aluno');
                        }
                      }}
                      className="w-full h-[56px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] flex items-center justify-center shadow-md text-[15px] font-black text-[#0B1226] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Criar Senha e Acessar Portal
                    </button>
                  </div>
                </div>
              )}

              {/* PRIMEIRO ACESSO DO PROFESSOR OU GESTOR */}
              {(firstAccessRole === 'professor' || firstAccessRole === 'gestor') && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed">
                    👋 Seja bem-vindo(a) ao portal! Confirme os dados pré-cadastrados abaixo e complemente o seu cadastro para facilitar resets futuros de senha.
                  </div>

                  {/* Dados Hidratados Pré-cadastrados (Somente Leitura) */}
                  <div className={`p-4 rounded-2xl border space-y-2.5 ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Dados Cadastrados pela Secretaria</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block text-slate-400 font-bold">Nome Completo:</span>
                        <span className="font-extrabold">{firstAccessRole === 'professor' ? 'Ayrton Senna da Silva' : 'Viviane Senna'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold">Escola:</span>
                        <span className="font-extrabold">C.E.I. Ayrton Senna</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                        <span className="block text-slate-400 font-bold">E-mail Institucional:</span>
                        <span className="font-extrabold">{firstAccessRole === 'professor' ? 'ayrton.silva@escola.ias.org.br' : 'viviane.senna@escola.ias.org.br'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Campos Editáveis para Hidratação */}
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs font-black uppercase tracking-wider mb-2.5 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        E-mail Pessoal <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="Digite um e-mail válido para receber o código de recuperação (Ex: professor.silva@gmail.com)"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                            : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-black uppercase tracking-wider mb-2.5 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        WhatsApp Pessoal <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Digite seu número com DDD (Ex: 5511999998888) - Deve ser ativo no WhatsApp"
                        value={personalWhatsapp}
                        onChange={(e) => setPersonalWhatsapp(e.target.value)}
                        className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                            : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-black uppercase tracking-wider mb-2.5 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Pergunta de Segurança (Reset de Emergência) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none cursor-pointer ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                            : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                        }`}
                      >
                        <option value="Qual o nome do seu primeiro animal de estimação?">Qual o nome do seu primeiro animal de estimação?</option>
                        <option value="Qual o nome da sua primeira escola?">Qual o nome da sua primeira escola?</option>
                        <option value="Qual a sua cidade natal?">Qual a sua cidade natal?</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-black uppercase tracking-wider mb-2.5 ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Resposta de Segurança <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Sua resposta secreta"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className={`w-full h-[52px] px-4 rounded-xl text-sm font-bold border transition-all outline-none ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-[#FBB800]'
                            : 'bg-white border-slate-200 text-[#0B1226] focus:border-[#FBB800] shadow-sm'
                        }`}
                      />
                    </div>
                  </div>

                  {teacherFormError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold leading-normal">
                      ⚠️ {teacherFormError}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!personalEmail || !personalWhatsapp || !securityAnswer) {
                          setTeacherFormError('Por favor, preencha todos os campos obrigatórios (*).');
                          return;
                        }
                        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail.trim());
                        if (!isEmailValid) {
                          setTeacherFormError('Informe um e-mail válido.');
                          return;
                        }
                        const whatsappDigits = personalWhatsapp.replace(/\D/g, '');
                        if (whatsappDigits.length < 10 || whatsappDigits.length > 13) {
                          setTeacherFormError('Informe um número de WhatsApp válido, com DDD.');
                          return;
                        }
                        setTeacherFormError(null);

                        try {
                          const res = await fetch('/api/auth/hydrate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              code: identifier.trim(),
                              personalEmail: personalEmail.trim(),
                              personalWhatsapp: personalWhatsapp.trim(),
                              securityQuestion: securityQuestion,
                              securityAnswer: securityAnswer.trim()
                            })
                          });

                          if (res.ok) {
                            setIsFirstAccessModalOpen(false);
                            if (onLoginSuccess) {
                              onLoginSuccess(
                                firstAccessRole === 'professor' ? 'Ayrton Senna da Silva' : 'Viviane Senna',
                                firstAccessRole!,
                                { email: personalEmail, whatsapp: personalWhatsapp }
                              );
                            }
                          } else {
                            const errData = await res.json();
                            setTeacherFormError(errData.error || 'Erro ao registrar hidratação no servidor.');
                          }
                        } catch (err) {
                          setTeacherFormError('Falha de rede ao enviar hidratação.');
                        }
                      }}
                      className="w-full h-[56px] rounded-full bg-gradient-to-br from-[#FDC300] to-[#FBB800] flex items-center justify-center shadow-md text-[15px] font-black text-[#0B1226] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Salvar Dados e Acessar Painel
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  );
};
