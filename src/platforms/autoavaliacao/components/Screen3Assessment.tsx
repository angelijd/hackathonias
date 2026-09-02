import React, { useEffect, useRef, useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';
import demogorgonImg from '../assets/demogorgon.png';
import elevenImg from '../assets/eleven.png';
import ambulanceImg from '../assets/ambulance.png';
import hospitalImg from '../assets/hospital.png';
import handImg from '../assets/hand.png';
import castleImg from '../assets/castle.png';
import alertStrangerImg from '../assets/alert_strangerthings.png';
import alertGreysImg from '../assets/alert_greysanatomy.png';
import alertWandinhaImg from '../assets/alert_wandinha.png';
import becoAvatar from '../beco-bot.png';
import { soundFX } from '../utils/soundEffects';
import { calculateStudentSocioEmotional, matchCharacter } from '../utils/characterMatching';
import { getCharacterImage } from '../utils/characterImages';
import { BecoBot } from './BecoBot';
import { BecoIntroModal } from './BecoIntroModal';

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
  testType?: string;
  onBackToPreferences: () => void;
}

// 15 Perguntas Oficiais Padronizadas
export const FIXED_QUESTIONS = [
  // Autogestão - Afirmações
  'Sou uma pessoa organizada.',
  'Me sinto feliz.',
  'Faço minhas tarefas da melhor maneira que consigo.',
  'Coloco pouco esforço e tempo nas minhas tarefas.',
  'Costumo deixar minhas coisas arrumadas.',
  // Autogestão - Vinhetas
  'Aline costuma deixar suas coisas todas bagunçadas, odeia limpar a casa, deixa as lições de casa sem completar. Quanto você acha que Aline é organizada?',
  'Juliana é bastante cuidadosa e dedicada. Gosta de limpar a casa, é caprichosa nas lições e sempre termina antes do prazo. Quanto você acha que Juliana é organizada?',
  'Pensando no seu dia a dia, quanto você se acha organizado(a)?',
  // Abertura ao Novo - Afirmações
  'Gosto de aprender coisas novas e diferentes.',
  'Tenho curiosidade sobre assuntos que não conheço.',
  'Prefiro manter a minha rotina do que experimentar o novo.',
  'Gosto de conhecer lugares e costumes diferentes dos meus.',
  'Tenho facilidade em imaginar novas formas de fazer as coisas.',
  // Abertura ao Novo - Vinhetas
  'Marcos sempre faz o mesmo caminho para a escola, pede sempre a mesma comida e não gosta quando mudam a rotina dele. Quanto você acha que Marcos é aberto ao novo?',
  'Sofia adora experimentar comidas de outros países, ouve músicas de estilos muito diferentes e está sempre testando novos hobbies. Quanto você acha que Sofia é aberta ao novo?',
  'Pensando no seu dia a dia, quanto você se acha aberto(a) ao novo?',
];

// Áudios das perguntas fixas (q-01.mp3 = FIXED_QUESTIONS[0], etc.)
const QUESTION_AUDIO_FILES = import.meta.glob('../assets/audio/q-*.mp3', { eager: true, import: 'default' }) as Record<string, string>;

const getQuestionAudioUrl = (idx: number): string | null => {
  const filename = `q-${String(idx + 1).padStart(2, '0')}.mp3`;
  const match = Object.entries(QUESTION_AUDIO_FILES).find(([path]) => path.endsWith(filename));
  return match ? match[1] : null;
};

// 5 Opções de Resposta Padronizadas (Escala Likert Neutra)
export const LIKERT_OPTIONS = [
  { value: 1, label: 'Nada', desc: 'Não tem nada a ver comigo' },
  { value: 2, label: 'Pouco', desc: 'Tem pouco a ver comigo' },
  { value: 3, label: 'Moderadamente', desc: 'Às vezes tem a ver comigo, às vezes não tem' },
  { value: 4, label: 'Muito', desc: 'Tem muito a ver comigo' },
  { value: 5, label: 'Totalmente', desc: 'Tem tudo a ver comigo' },
];

interface CharacterProfile {
  name: string;
  serie: string;
  role: string;
  strengths: string[];
  description: string;
  quote: string;
  color: string;
}

interface MilestoneData {
  step: 1 | 2;
  title: string;
  subtitle: string;
  narrative: string;
  icon: string;
  badge: string;
}

export const Screen3Assessment: React.FC<Props> = ({
  userName,
  darkMode,
  selectedInterests = [],
  onBackToPreferences,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isQuestionAudioPlaying, setIsQuestionAudioPlaying] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneData | null>(null);

  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [isBecoHighlighted, setIsBecoHighlighted] = useState(false);

  const handleCloseIntro = () => {
    setShowIntroVideo(false);
    setIsBecoHighlighted(true);
  };

  // Controle de tempo por questão e detecção de padrão rápido/ziguezague
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [consecutiveFastCount, setConsecutiveFastCount] = useState(0);
  const [speedAlertsDisabled, setSpeedAlertsDisabled] = useState(false);
  const [showWarningPlate, setShowWarningPlate] = useState(false);
  const [warningReason, setWarningReason] = useState<'speed' | 'zigzag'>('speed');
  const [breathProgress, setBreathProgress] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [pendingAnswerValue, setPendingAnswerValue] = useState<number | null>(null);

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const universeKey = selectedInterests[0] || 'stranger_things';

  const universeNames: Record<string, string> = {
    greys_anatomy: "Grey's Anatomy",
    stranger_things: 'Stranger Things',
    wandinha: 'Wandinha',
  };

  // Marcos Temáticos a cada 5 perguntas (Toca efeitos sonoros reais)
  const getMilestoneForSeries = (step: 1 | 2): MilestoneData => {
    if (universeKey === 'stranger_things') {
      if (step === 1) {
        soundFX.playElectricShortCircuit();
        return {
          step: 1,
          badge: '⚡ Marco 1 alcançado · 1/3 do caminho',
          title: 'As Luzes de Natal começam a piscar!',
          subtitle: 'O Mundo Invertido está reagindo às suas respostas.',
          narrative: 'A temperatura na sala cai repentinamente e as lâmpadas na parede se acendem em sequência rápida. Uma energia sobrenatural percorre o ar: você acabou de destravar uma conexão profunda com as forças de Hawkins!',
          icon: '💡',
        };
      }
      soundFX.playRadioStaticTune();
      return {
        step: 2,
        badge: '📻 Marco 2 alcançado · 2/3 do caminho',
        title: 'Sinal de Rádio Captado na Colina!',
        subtitle: 'A frequência da Eleven está no volume máximo.',
        narrative: 'O rádio transmissor emite um zumbido e a voz dos seus amigos ecoa com clareza: “QG para Hawkins, o Demogorgon está recuando e a Eleven está logo à frente!” Falta muito pouco para revelar seu perfil!',
        icon: '📡',
      };
    }

    if (universeKey === 'greys_anatomy') {
      if (step === 1) {
        soundFX.playHeartMonitorBeep();
        return {
          step: 1,
          badge: '🚨 Marco 1 alcançado · 1/3 do caminho',
          title: 'Código Azul no Pronto-Socorro do Seattle Grace!',
          subtitle: 'A emergência precisa da sua rapidez de raciocínio.',
          narrative: 'As portas automáticas se abrem com os paramédicos correndo. A Dra. Bailey te observa de perto e aprova sua calma: “Você tem sangue frio e presença de espírito. Mantenha o foco que a cirurgia está próxima!”',
          icon: '🚨',
        };
      }
      soundFX.playSurgicalChime();
      return {
        step: 2,
        badge: '🥼 Marco 2 alcançado · 2/3 do caminho',
        title: 'Scrub In: Autorização para a Sala de Cirurgia 1!',
        subtitle: 'É um belo dia para salvar vidas.',
        narrative: 'Você lavou as mãos, ajustou a máscara cirúrgica e entrou no bloco operatório ao lado de Meredith e Cristina. A equipe está pronta para o diagnóstico definitivo do seu perfil!',
        icon: '🏥',
      };
    }

    // Wandinha
    if (step === 1) {
      soundFX.playCelloNotes();
      return {
        step: 1,
        badge: '🎻 Marco 1 alcançado · 1/3 do caminho',
        title: 'O Violoncelo Ressoa na Torre de Nevermore!',
        subtitle: 'As sombras do vitral revelam um segredo gótico.',
        narrative: 'Ao som do violoncelo da Wandinha ecoando pelo pátio de pedra, a Mãozinha encontra um pergaminho com o selo da Sociedade dos Beladonas. Uma nova pista sobre seu temperamento acaba de ser desvendada!',
        icon: '🎻',
      };
    }
    soundFX.playGothicBell();
    return {
      step: 2,
      badge: '📜 Marco 2 alcançado · 2/3 do caminho',
      title: 'O Enigma da Biblioteca Proibida Decifrado!',
      subtitle: 'Wandinha fecha seu diário de investigação.',
      narrative: 'As gárgulas de pedra viram os olhos e a passagem secreta se abre. Wandinha analisa suas escolhas com olhar penetrante: “Seu perfil socioemocional não pode mais ser ocultado nas sombras.”',
      icon: '🗝️',
    };
  };

  // Verifica se o aluno está fazendo padrão de ziguezague (alternando extremos tipo 1 -> 5 -> 1)
  const isZigZagPattern = (newVal: number): boolean => {
    const prevValues: number[] = Object.values(answers);
    if (prevValues.length < 2) return false;
    const last1 = prevValues[prevValues.length - 1];
    const last2 = prevValues[prevValues.length - 2];

    if ((last2 === 1 && last1 === 5 && newVal === 1) || (last2 === 5 && last1 === 1 && newVal === 5)) {
      return true;
    }
    if ((last2 <= 2 && last1 >= 4 && newVal <= 2) || (last2 >= 4 && last1 <= 2 && newVal >= 4)) {
      return true;
    }
    return false;
  };

  // Efetiva o avanço para a próxima questão ou finalização
  const applyAnswerAndProceed = (value: number) => {
    const updatedAnswers = { ...answers, [currentIdx]: value };
    setAnswers(updatedAnswers);
    setQuestionStartTime(Date.now()); // Reinicia o timer para a próxima pergunta

    // Marco 1: após pergunta 5 (index 4)
    if (currentIdx === 4) {
      setTimeout(() => {
        setActiveMilestone(getMilestoneForSeries(1));
      }, 200);
      return;
    }

    // Marco 2: após pergunta 10 (index 9)
    if (currentIdx === 9) {
      setTimeout(() => {
        setActiveMilestone(getMilestoneForSeries(2));
      }, 200);
      return;
    }

    if (currentIdx < FIXED_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
      }, 180);
    } else {
      setTimeout(() => {
        setIsCompleted(true);
      }, 300);
    }
  };

  // Ao clicar em uma opção
  const handleSelectOption = (value: number) => {
    const timeSpentSeconds = (Date.now() - questionStartTime) / 1000;
    const hasZigZag = isZigZagPattern(value);
    const isFast = !speedAlertsDisabled && timeSpentSeconds < 10 && currentIdx > 0;

    let nextFastCount = 0;
    if (isFast) {
      nextFastCount = consecutiveFastCount + 1;
      setConsecutiveFastCount(nextFastCount);
    } else {
      setConsecutiveFastCount(0);
    }

    // O aviso só surge se houver 2 respostas seguidas com <10s OU ziguezague, e se os alertas não estiverem desabilitados
    if (!speedAlertsDisabled && (nextFastCount >= 2 || hasZigZag)) {
      setPendingAnswerValue(value);
      setWarningReason(nextFastCount >= 2 ? 'speed' : 'zigzag');
      setBreathProgress(0);
      setIsBreathing(false);
      setChallengeCompleted(false);
      setShowWarningPlate(true);
      return;
    }

    applyAnswerAndProceed(value);
  };

  // Mini-Desafio de Respiração e Desaceleração
  const handleStartBreathingExercise = () => {
    if (isBreathing || challengeCompleted) return;
    setIsBreathing(true);
    setBreathProgress(0);
  };

  // Temporizador da respiração de 4 segundos
  React.useEffect(() => {
    let interval: any;
    if (showWarningPlate && isBreathing && breathProgress < 100) {
      interval = setInterval(() => {
        setBreathProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            setIsBreathing(false);
            setChallengeCompleted(true);
            soundFX.playBreathingSuccess();
            return 100;
          }
          return prev + 5; // Atinge 100% em 4 segundos (20 steps de 200ms)
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [showWarningPlate, isBreathing, breathProgress]);

  const handleDismissWarningAndContinue = () => {
    setShowWarningPlate(false);
    setConsecutiveFastCount(0); // Reseta o contador de respostas rápidas
    const val = pendingAnswerValue !== null ? pendingAnswerValue : (answers[currentIdx] || 3);
    setPendingAnswerValue(null);
    applyAnswerAndProceed(val);
  };

  const handleContinueFromMilestone = () => {
    setActiveMilestone(null);
    setQuestionStartTime(Date.now());
    setCurrentIdx((prev) => prev + 1);
  };

  // Só é possível voltar para a tela de universos antes de responder a 1ª pergunta.
  // Depois disso, o aluno só pode voltar para revisar/trocar uma resposta anterior.
  const hasAnsweredFirstQuestion = answers[0] !== undefined;

  const handlePrevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      setQuestionStartTime(Date.now());
    } else if (!hasAnsweredFirstQuestion) {
      onBackToPreferences();
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setIsCompleted(false);
  };

  const progressPercent = Math.round(((currentIdx + 1) / FIXED_QUESTIONS.length) * 100);
  const selectedValueForCurrent = answers[currentIdx];

  // ========================================================
  // TELA DE RESULTADO (DEVOLUTIVA SOCIOEMOCIONAL E PERSONAGEM IA)
  // ========================================================
  
  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim()) return;

    setIsSendingWhatsApp(true);
    setWhatsappStatus('idle');
    const studentScores = calculateStudentSocioEmotional(answers);
    const matchResult = matchCharacter(universeKey, studentScores);
    const character = matchResult.character;
    const matchPercentage = matchResult.matchPercentage;

    const message = `🎗️ *Instituto Ayrton Senna — Resultado Socioemocional*\n\n` +
      `Olá, *${userName}*!\n\n` +
      `Seu perfil de destaque em *${universeNames[universeKey]}* é:\n` +
      `🌟 *${character.name}* (${matchPercentage}% de afinidade)\n` +
      `🎯 *Papel:* ${character.role}\n\n` +
      `*Frase-chave:*\n"${character.quote}"\n\n` +
      `*Principais Forças em Destaque:*\n${character.strengths.map(s => `• ${s}`).join('\n')}\n\n` +
      `_Parabéns pelo seu autoconhecimento! Qualquer dúvida, é só me chamar por aqui. — Béco_`;

    const followUpMessage = 'Quer saber como essas forças têm impacto no seu dia a dia? 💬';

    const cleanNum = whatsappNumber.replace(/\D/g, '');
    const fullNum = cleanNum.startsWith('55') ? cleanNum : `55${cleanNum}`;

    // Envia de verdade pelo backend (Evolution API) — nunca abre o WhatsApp Web como fallback.
    try {
      const res = await fetch('/api/ai/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: fullNum, text: message })
      });
      setWhatsappStatus(res.ok ? 'success' : 'error');

      // Puxa um assunto logo após o relatório, para o Béco continuar a conversa.
      if (res.ok) {
        await fetch('/api/ai/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: fullNum, text: followUpMessage })
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Erro ao enviar relatório via WhatsApp:', err);
      setWhatsappStatus('error');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (isCompleted) {
    const studentScores = calculateStudentSocioEmotional(answers);
    const matchResult = matchCharacter(universeKey, studentScores);
    const character = matchResult.character;
    const matchPercentage = matchResult.matchPercentage;
    const top3 = matchResult.allRanked.slice(0, 3);
    const characterPhoto = getCharacterImage(character.id);

    return (
      <div className="w-full max-w-[1100px] 2xl:max-w-[1500px] mx-auto px-4 sm:px-8 pt-2 pb-3 z-10 animate-in fade-in duration-300">
        <div className={`rounded-3xl p-4 sm:p-6 border shadow-[0_25px_60px_rgba(4,20,43,0.09)] ${
          darkMode ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white border-slate-200 text-[#0B1226]'
        }`}>

          {/* Character Highlight Card — tratamento de destaque, é o resultado principal do teste */}
          <div className={`p-4 sm:p-5 2xl:p-8 rounded-3xl border-2 mb-4 2xl:mb-6 flex flex-col md:flex-row items-center md:items-stretch gap-4 sm:gap-6 2xl:gap-8 relative overflow-hidden ${
            darkMode
              ? 'bg-gradient-to-br from-amber-500/10 via-slate-800/80 to-slate-800/80 border-amber-500/30 shadow-[0_20px_50px_rgba(253,195,0,0.08)]'
              : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/60 border-[#FBB800]/40 shadow-[0_20px_50px_rgba(253,195,0,0.15)]'
          }`}>
            {/* Uniform Photo Container (Object Cover & Center Focus) — acompanha a altura da coluna de texto (badges até a frase-chave) em telas médias+ */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-40 md:h-auto lg:w-48 2xl:w-56 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-[#FBB800]/40 dark:ring-[#FBB800]/30 shrink-0 relative bg-black/20 flex items-center justify-center">
              {characterPhoto ? (
                <img
                  src={characterPhoto}
                  alt={character.name}
                  className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${character.gradient} text-white font-black text-4xl sm:text-5xl flex items-center justify-center`}>
                  {character.avatarIcon}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5 2xl:mb-2.5">
                <span className="text-xs 2xl:text-sm font-black uppercase tracking-wider px-3.5 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/40">
                  {character.role}
                </span>
                <span className="text-xs 2xl:text-sm font-extrabold px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-300/40">
                  {matchPercentage}% de Compatibilidade
                </span>
              </div>

              <h2 className="text-[22px] sm:text-[27px] 2xl:text-[40px] font-black text-[#0B1226] dark:text-white leading-tight">
                {character.name}
              </h2>

              <p className="text-xs sm:text-sm 2xl:text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5 mb-2 2xl:mb-3">
                {character.tagline}
              </p>

              <p className="text-[13px] sm:text-[14px] 2xl:text-[16px] text-[#475569] dark:text-slate-300 leading-snug font-medium">
                {character.description}
              </p>

              {/* Quote */}
              <div className="mt-2.5 2xl:mt-4 p-2.5 2xl:p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs sm:text-sm 2xl:text-[15px] text-slate-700 dark:text-slate-300">
                <span className="block text-[10.5px] 2xl:text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 not-italic mb-0.5">
                  Frase-chave
                </span>
                <p className="italic">
                  “{character.quote.replace(/^[“”"]|[“”"]$/g, '')}”
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Forças Socioemocionais e Superpoderes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Forças Socioemocionais */}
            <div className={`p-3.5 rounded-3xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-2">
                <span>🌟</span>
                <span>Suas principais forças em destaque:</span>
              </h3>
              <div className="space-y-1.5">
                {character.strengths.map((str, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {str}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Superpoderes em Ação */}
            <div className={`p-3.5 rounded-3xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-2">
                <span>⚡</span>
                <span>Seus Superpoderes na Prática:</span>
              </h3>
              <div className="space-y-1.5">
                {character.superpowers.map((pwr, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                      ★
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {pwr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Béco se despede e oferece enviar o relatório pelo WhatsApp */}
          <div className={`p-4 sm:p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 border-emerald-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Metade 1: Fala do Béco (avatar maior + balão) */}
              <div className="flex items-start gap-3 text-left md:flex-1">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border-2 border-[#FBB800] shadow-md">
                  <img src={becoAvatar} alt="Béco" className="w-full h-full object-cover" />
                </div>
                <div className={`flex-1 p-4 rounded-2xl rounded-tl-sm text-[13.5px] sm:text-sm font-semibold leading-relaxed ${
                  darkMode ? 'bg-slate-900 text-slate-100 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
                }`}>
                  Mandou muito bem, {userName}! 🎉 Seu personagem, <strong>{character.name}</strong>, é show de bola — combina muito com você! Vou continuar por aqui no WhatsApp se quiser bater um papo ou tirar alguma dúvida depois. Quer que eu já mande seu relatório completo pra lá?
                </div>
              </div>

              {/* Metade 2: Formulário de envio */}
              <div className="md:flex-1">
                <form onSubmit={handleSendWhatsApp} className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2.5">
                  <input
                    type="tel"
                    placeholder="(11) 91234-5678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSendingWhatsApp}
                    className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isSendingWhatsApp ? 'Enviando...' : 'Sim, enviar →'}
                  </button>
                </form>

                {whatsappStatus === 'success' && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">
                    ✅ Prontinho! O Béco te mandou o relatório no WhatsApp.
                  </p>
                )}
                {whatsappStatus === 'error' && (
                  <p className="text-xs font-bold text-rose-500 mt-2.5">
                    ❌ Não conseguimos enviar agora. Tente novamente em instantes.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Configurações visuais do caminho por universo
  const trackConfigs: Record<string, {
    walkerName: string;
    destinationName: string;
    walkerImg: string;
    destinationImg: string;
    walkerFallback: string;
    destinationFallback: string;
    themeGlow: string;
  }> = {
    stranger_things: {
      walkerName: 'Demogorgon',
      destinationName: 'Eleven',
      walkerImg: demogorgonImg,
      destinationImg: elevenImg,
      walkerFallback: '👾',
      destinationFallback: '👧⚡',
      themeGlow: 'drop-shadow-[0_8px_16px_rgba(220,38,38,0.5)]',
    },
    greys_anatomy: {
      walkerName: 'Ambulância',
      destinationName: 'Hospital Grey Sloan',
      walkerImg: ambulanceImg,
      destinationImg: hospitalImg,
      walkerFallback: '🚑',
      destinationFallback: '🏥',
      themeGlow: 'drop-shadow-[0_8px_16px_rgba(59,130,246,0.5)]',
    },
    wandinha: {
      walkerName: 'Mãozinha',
      destinationName: 'Academia Nevermore',
      walkerImg: handImg,
      destinationImg: castleImg,
      walkerFallback: '✋',
      destinationFallback: '🏰',
      themeGlow: 'drop-shadow-[0_8px_16px_rgba(168,85,247,0.5)]',
    },
  };

  const currentTrack = trackConfigs[universeKey] || trackConfigs.stranger_things;
  const currentStepRatio = currentIdx / (FIXED_QUESTIONS.length - 1);

  // Paleta de Estilos e Cores Temáticas Inspiradas nas Séries
  const getThemeStyles = () => {
    if (universeKey === 'stranger_things') {
      return {
        cardBg: 'bg-[#0B0C10] border-red-900/50 shadow-[0_22px_60px_rgba(220,38,38,0.22)]',
        badge: 'bg-red-950/80 text-red-400 border-red-600/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
        groundTrack: 'bg-red-950/60',
        progressBar: 'bg-gradient-to-r from-red-700 via-red-500 to-amber-400',
        nodeDotCurrent: 'bg-black border-red-500 ring-4 ring-red-500/50',
        nodeDotPassed: 'bg-red-600 border-red-500',
        nodeDotFuture: 'bg-[#161822] border-red-950',
        statementBox: 'bg-[#13151F] border-red-950/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
        statementEyebrow: 'text-red-400 font-black tracking-widest',
        statementText: 'text-white font-black tracking-wide drop-shadow-sm',
        helperText: 'text-slate-300',
        optionButtonUnselected: 'bg-[#151722] border-slate-800/90 text-slate-200 hover:border-red-500/60 hover:bg-[#1D202F]',
        optionButtonSelected: 'bg-[#221015] border-red-500 ring-2 ring-red-500 shadow-[0_0_24px_rgba(239,68,68,0.45)] text-white scale-[1.02]',
        optionLabel: 'text-white',
        optionDesc: 'text-slate-300',
        radioIndicatorSelected: 'bg-red-500 border-red-500',
        radioCenter: 'bg-black',
        footerBorder: 'border-red-950/60',
        backButton: 'text-slate-400 hover:text-white hover:bg-red-950/40',
      };
    }

    if (universeKey === 'greys_anatomy') {
      return {
        cardBg: darkMode
          ? 'bg-[#0B1728] border-[#5B84B1]/40 shadow-[0_20px_50px_rgba(11,124,251,0.18)]'
          : 'bg-[#F0F6FC] border-[#7BA4D5]/40 shadow-[0_20px_50px_rgba(30,58,95,0.12)]',
        badge: 'bg-[#5B84B1]/20 text-[#1E3A5F] dark:text-sky-300 border-[#5B84B1]/40',
        groundTrack: darkMode ? 'bg-slate-800' : 'bg-[#D4E4F5]',
        progressBar: 'bg-gradient-to-r from-[#5B84B1] to-[#38BDF8]',
        nodeDotCurrent: 'bg-white dark:bg-[#0B1728] border-[#2563EB] ring-4 ring-[#2563EB]/40',
        nodeDotPassed: 'bg-[#5B84B1] border-[#5B84B1]',
        nodeDotFuture: darkMode ? 'bg-[#102038] border-slate-700' : 'bg-white border-[#B8D2EC]',
        statementBox: darkMode
          ? 'bg-[#10223B] border-blue-900/60'
          : 'bg-white border-[#C5DCF2] shadow-sm',
        statementEyebrow: 'text-[#3B72A4] dark:text-sky-400 font-black tracking-wider',
        statementText: darkMode ? 'text-white' : 'text-[#0B2545] font-extrabold',
        helperText: darkMode ? 'text-slate-300' : 'text-[#3E5674]',
        optionButtonUnselected: darkMode
          ? 'bg-[#10223B] border-blue-900/70 text-slate-200 hover:border-[#5B84B1] hover:bg-[#172E4F]'
          : 'bg-white border-[#C9DEF3] text-[#0B2545] hover:border-[#5B84B1] hover:bg-[#EAF3FC] shadow-xs',
        optionButtonSelected: darkMode
          ? 'bg-[#173258] border-[#38BDF8] ring-2 ring-[#38BDF8] shadow-[0_10px_24px_rgba(56,189,248,0.3)] text-white scale-[1.02]'
          : 'bg-[#E2F0FD] border-[#2563EB] ring-2 ring-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.25)] text-[#0B2545] scale-[1.02]',
        optionLabel: darkMode ? 'text-white' : 'text-[#0B2545]',
        optionDesc: darkMode ? 'text-slate-300' : 'text-[#476282]',
        radioIndicatorSelected: darkMode ? 'bg-[#38BDF8] border-[#38BDF8]' : 'bg-[#2563EB] border-[#2563EB]',
        radioCenter: darkMode ? 'bg-[#0B1728]' : 'bg-white',
        footerBorder: darkMode ? 'border-slate-800' : 'border-[#DCE8F5]',
        backButton: darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-[#3E5674] hover:bg-[#E2EEFA]',
      };
    }

    // Wandinha (Gótico Nevermore / Preto Ébano e Violeta Sombrio)
    return {
      cardBg: 'bg-[#11101A] border-purple-950/70 shadow-[0_22px_60px_rgba(147,51,234,0.2)]',
      badge: 'bg-purple-950/80 text-purple-300 border-purple-600/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
      groundTrack: 'bg-purple-950/60',
      progressBar: 'bg-gradient-to-r from-purple-800 via-purple-600 to-violet-400',
      nodeDotCurrent: 'bg-black border-purple-400 ring-4 ring-purple-500/50',
      nodeDotPassed: 'bg-purple-600 border-purple-500',
      nodeDotFuture: 'bg-[#1A1826] border-purple-950',
      statementBox: 'bg-[#171524] border-purple-900/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
      statementEyebrow: 'text-purple-400 font-black tracking-widest',
      statementText: 'text-[#F8FAFC] font-black tracking-wide drop-shadow-sm',
      helperText: 'text-purple-200/80',
      optionButtonUnselected: 'bg-[#181626] border-purple-950/80 text-slate-200 hover:border-purple-500/60 hover:bg-[#221F36]',
      optionButtonSelected: 'bg-[#28163E] border-purple-500 ring-2 ring-purple-500 shadow-[0_0_24px_rgba(168,85,247,0.4)] text-white scale-[1.02]',
      optionLabel: 'text-white',
      optionDesc: 'text-purple-200/80',
      radioIndicatorSelected: 'bg-purple-500 border-purple-500',
      radioCenter: 'bg-black',
      footerBorder: 'border-purple-950/70',
      backButton: 'text-purple-300/80 hover:text-white hover:bg-purple-950/40',
    };
  };

  // Ícone temático dos nós de marco nos passos 5 e 10
  const getSeriesMilestoneNodeIcon = () => {
    if (universeKey === 'stranger_things') return '💡';
    if (universeKey === 'greys_anatomy') return '🩺';
    return '🕷️';
  };

  const milestoneNodeIcon = getSeriesMilestoneNodeIcon();
  const theme = getThemeStyles();

  // Para a pergunta atual sempre que o usuário navega para outra
  useEffect(() => {
    questionAudioRef.current?.pause();
    setIsQuestionAudioPlaying(false);
  }, [currentIdx]);

  const handleToggleQuestionAudio = () => {
    if (isQuestionAudioPlaying) {
      questionAudioRef.current?.pause();
      setIsQuestionAudioPlaying(false);
      return;
    }
    const url = getQuestionAudioUrl(currentIdx);
    if (!url) return;
    const audio = new Audio(url);
    questionAudioRef.current = audio;
    audio.onended = () => setIsQuestionAudioPlaying(false);
    audio.play().then(() => setIsQuestionAudioPlaying(true)).catch(() => setIsQuestionAudioPlaying(false));
  };

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-8 pt-4 pb-12 z-10 flex flex-col justify-between min-h-[calc(100vh-90px)]">
      {/* Beco Intro Video Modal before test starts */}
      <BecoIntroModal
        isOpen={showIntroVideo}
        onClose={handleCloseIntro}
        userName={userName}
        darkMode={darkMode}
      />

      {/* Beco Bot Componente de Chat */}
      <BecoBot
        question={FIXED_QUESTIONS[currentIdx]}
        userName={userName}
        interests={selectedInterests}
        isHighlighted={isBecoHighlighted}
        onClearHighlight={() => setIsBecoHighlighted(false)}
      />

      {/* Dynamic 15-Node Progress Trail with Walker and Final Destination */}
      <div className="relative w-full max-w-[1140px] mx-auto mb-5 px-8 sm:px-12 pt-16 sm:pt-20 select-none">
        {/* Ground Connector Line */}
        <div className={`absolute top-[calc(100%-10px)] sm:top-[calc(100%-12px)] left-8 sm:left-12 right-8 sm:right-12 h-1.5 ${theme.groundTrack} rounded-full z-0 overflow-hidden`}>
          <div
            className={`h-full ${theme.progressBar} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${currentStepRatio * 100}%` }}
          />
        </div>

        {/* 15 Nodes (One for each question) */}
        <div className="relative z-10 flex items-center justify-between w-full">
          {FIXED_QUESTIONS.map((_, idx) => {
            const isPassed = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={idx} className="relative flex flex-col items-center">
                {/* Node Dot */}
                <div
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center relative ${
                    isCurrent
                      ? `${theme.nodeDotCurrent} scale-125 z-20`
                      : isPassed
                      ? `${theme.nodeDotPassed} shadow-sm`
                      : theme.nodeDotFuture
                  }`}
                >
                  {/* Marcador Temático de Marco nos nós 5 (idx 4) e 10 (idx 9) */}
                  {(idx === 4 || idx === 9) && !isCurrent && (
                    <span className="absolute -top-4 text-[12px] filter drop-shadow-sm animate-pulse">
                      {milestoneNodeIcon}
                    </span>
                  )}
                  {isPassed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FDC300]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Walker (Demogorgon / Ambulância / Mãozinha) */}
        <div
          className="absolute top-0 transition-all duration-500 ease-out pointer-events-none z-30 flex flex-col items-center"
          style={{
            left: `calc(32px + (100% - 64px) * ${currentStepRatio})`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center filter ${currentTrack.themeGlow}`}>
            <img
              src={currentTrack.walkerImg}
              alt={currentTrack.walkerName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector('.walker-fallback')) {
                  const span = document.createElement('span');
                  span.className = 'walker-fallback text-3xl sm:text-4xl';
                  span.innerText = currentTrack.walkerFallback;
                  parent.appendChild(span);
                }
              }}
            />
          </div>
        </div>

        {/* Final Destination (Eleven / Hospital / Castelo) - Mesmo tamanho que o Walker */}
        <div className="absolute top-0 right-4 sm:right-6 pointer-events-none z-20 flex flex-col items-center">
          <div className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center filter ${currentTrack.themeGlow}`}>
            <img
              src={currentTrack.destinationImg}
              alt={currentTrack.destinationName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector('.destination-fallback')) {
                  const span = document.createElement('span');
                  span.className = 'destination-fallback text-3xl sm:text-4xl';
                  span.innerText = currentTrack.destinationFallback;
                  parent.appendChild(span);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Themed Card (Personalizado com a identidade e cores da série) */}
      <div className={`w-full rounded-3xl p-6 sm:p-10 border transition-all duration-300 relative ${theme.cardBg}`}>
        {/* Question Statement Card */}
        <div className="mb-8">
          <div className={`p-6 sm:p-8 rounded-3xl border ${theme.statementBox}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className={`text-xs uppercase ${theme.statementEyebrow}`}>
                Pergunta {currentIdx + 1} de {FIXED_QUESTIONS.length} — Leia a frase abaixo:
              </span>
              <button
                type="button"
                onClick={handleToggleQuestionAudio}
                aria-label={isQuestionAudioPlaying ? 'Pausar áudio da pergunta' : 'Ouvir a pergunta em áudio'}
                title={isQuestionAudioPlaying ? 'Pausar áudio' : 'Ouvir pergunta'}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${theme.backButton}`}
              >
                {isQuestionAudioPlaying ? <Pause size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
            <p className={`text-[20px] sm:text-[24px] leading-snug ${theme.statementText}`}>
              {FIXED_QUESTIONS[currentIdx]}
            </p>
          </div>
        </div>

        {/* 5 Neutral Horizontal Option Buttons */}
        <div className="mb-10">
          <p className={`text-xs sm:text-sm font-extrabold mb-3.5 ${theme.helperText}`}>
            O quanto isso tem a ver com você?
          </p>

          {/* Responsive 5-column grid (horizontal in tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-3.5 items-stretch">
            {LIKERT_OPTIONS.map((opt) => {
              const isSelected = selectedValueForCurrent === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt.value)}
                  className={`group relative flex flex-col items-center justify-between p-4 sm:p-4.5 rounded-2xl border text-center transition-all duration-150 cursor-pointer ${
                    isSelected ? theme.optionButtonSelected : theme.optionButtonUnselected
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className={`text-[15px] sm:text-[16px] font-black mb-1.5 block ${theme.optionLabel}`}>
                    {opt.label}
                  </span>

                  <span className={`text-[11.5px] sm:text-[12px] leading-tight ${theme.optionDesc}`}>
                    ({opt.desc})
                  </span>

                  {/* Radio Indicator */}
                  <div className={`mt-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? theme.radioIndicatorSelected
                      : 'border-slate-400/40 bg-black/10'
                  }`}>
                    {isSelected && (
                      <span className={`w-2 h-2 rounded-full ${theme.radioCenter}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation: Back to Previous Question */}
        <div className={`flex items-center justify-between pt-6 border-t ${theme.footerBorder}`}>
          {(currentIdx > 0 || !hasAnsweredFirstQuestion) ? (
            <button
              type="button"
              onClick={handlePrevQuestion}
              className={`px-6 py-3 rounded-full font-bold text-[14px] transition-colors flex items-center gap-2 cursor-pointer ${theme.backButton}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              <span>{currentIdx === 0 ? 'Voltar para o universo' : 'Pergunta anterior'}</span>
            </button>
          ) : (
            <span />
          )}

          <span className={`text-xs hidden sm:inline-block opacity-60 ${theme.helperText}`}>
            Clique na opção para avançar automaticamente
          </span>
        </div>
      </div>

      {/* ========================================================
         MODAL 1: PLACA METÁLICA DE ALERTA & DESAFIO DE DESACELERAÇÃO (INSPIRADO NAS ARTES)
         ======================================================== */}
      {showWarningPlate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-[560px] rounded-[32px] border-2 shadow-[0_30px_90px_rgba(0,0,0,0.9)] relative overflow-hidden text-center transition-all ${
            universeKey === 'stranger_things'
              ? 'bg-[#0B0C10] border-red-900/80 shadow-red-950/50'
              : universeKey === 'greys_anatomy'
              ? 'bg-[#06101E] border-blue-600/70 shadow-blue-950/60'
              : 'bg-[#0D0B14] border-purple-900/80 shadow-purple-950/60'
          }`}>
            {/* Background Texture / Subtle Artwork Glow */}
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen bg-cover bg-center" style={{
              backgroundImage: `url(${
                universeKey === 'stranger_things'
                  ? alertStrangerImg
                  : universeKey === 'greys_anatomy'
                  ? alertGreysImg
                  : alertWandinhaImg
              })`
            }} />

            {/* Industrial / Gothic Corner Rivets */}
            <div className="absolute top-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-slate-500/60 border border-black shadow-inner" />
            <div className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-slate-500/60 border border-black shadow-inner" />
            <div className="absolute bottom-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-slate-500/60 border border-black shadow-inner" />
            <div className="absolute bottom-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-slate-500/60 border border-black shadow-inner" />

            {/* Header Plate Stripe */}
            <div className={`relative z-10 py-2.5 px-4 border-b font-black text-[11px] sm:text-xs uppercase tracking-widest flex items-center justify-between ${
              universeKey === 'stranger_things'
                ? 'bg-gradient-to-r from-red-950 via-red-900 to-red-950 text-red-300 border-red-800/60'
                : universeKey === 'greys_anatomy'
                ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-blue-200 border-blue-600/50'
                : 'bg-gradient-to-r from-purple-950 via-[#1F1430] to-purple-950 text-purple-200 border-purple-800/60'
            }`}>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="text-amber-400">⚠️</span>
                <span>{universeKey === 'stranger_things' ? 'HL-1983' : universeKey === 'greys_anatomy' ? 'SG-EMERGENCY' : 'NEVERMORE'}</span>
              </div>
              <span className="font-extrabold tracking-wider">
                {universeKey === 'stranger_things'
                  ? 'HAWKINS LAB • PROTOCOLO DE CONTENÇÃO'
                  : universeKey === 'greys_anatomy'
                  ? 'SEATTLE GRACE • ALERTA DA EQUIPE CIRÚRGICA'
                  : 'NEVERMORE • AVISO DAS SOMBRAS'}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="hidden sm:inline">ALERTA</span>
              </div>
            </div>

            <div className="relative z-10 p-6 sm:p-8">
              {/* Badge Icon Inspired By Arts */}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl border flex items-center justify-center text-3xl sm:text-4xl mb-4 shadow-xl backdrop-blur-md ${
                universeKey === 'stranger_things'
                  ? 'bg-red-950/50 border-red-700/60 text-purple-300 ring-2 ring-red-500/30'
                  : universeKey === 'greys_anatomy'
                  ? 'bg-blue-950/60 border-blue-500/60 text-cyan-300 ring-2 ring-blue-500/40'
                  : 'bg-purple-950/60 border-purple-600/60 text-purple-300 ring-2 ring-purple-500/40'
              }`}>
                {universeKey === 'stranger_things' ? '👾' : universeKey === 'greys_anatomy' ? '🚨' : '🦇'}
              </div>

              {/* Main Headline */}
              <h2 className="text-[21px] sm:text-[25px] font-black uppercase tracking-tight leading-tight mb-2">
                {universeKey === 'stranger_things' && (
                  <>
                    <span className="text-red-500 block drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">
                      CUIDADO! RESPIRE FUNDO!
                    </span>
                    <span className="text-stone-200">
                      DEMOGORGONS SE APROXIMAM DE HAWKINS.
                    </span>
                  </>
                )}
                {universeKey === 'greys_anatomy' && (
                  <>
                    <span className="text-sky-400 block drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
                      ATENÇÃO, CIRURGIÃO! RESPIRE FUNDO!
                    </span>
                    <span className="text-slate-100">
                      O CENTRO CIRÚRGICO EXIGE FOCO ABSOLUTO.
                    </span>
                  </>
                )}
                {universeKey === 'wandinha' && (
                  <>
                    <span className="text-purple-400 block drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]">
                      ALERTA GÓTICO! RESPIRE FUNDO!
                    </span>
                    <span className="text-stone-200">
                      AS SOMBRAS DE NEVERMORE EXIGEM SUA ATENÇÃO.
                    </span>
                  </>
                )}
              </h2>

              <p className="text-[13px] sm:text-[14px] text-slate-300 leading-relaxed max-w-md mx-auto mb-6">
                {warningReason === 'speed'
                  ? 'Você respondeu muito rápido! Lembre-se: este não é um teste de velocidade. Responda com calma e sinceridade.'
                  : 'Detectamos respostas em ziguezague! Pare um instante, leia a pergunta com atenção e responda a sua verdade.'}
              </p>

              {/* Desafio de Desaceleração com Visual da Imagem */}
              <div className={`p-4 sm:p-5 rounded-2xl border mb-5 max-w-md mx-auto backdrop-blur-md ${
                universeKey === 'stranger_things'
                  ? 'bg-[#151113]/90 border-red-900/60'
                  : universeKey === 'greys_anatomy'
                  ? 'bg-[#0B1728]/90 border-blue-800/60'
                  : 'bg-[#14101E]/90 border-purple-900/60'
              }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm">🫁</span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    DESAFIO DE FOCO & DESACELERAÇÃO:
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3.5">
                  Clique no botão para respirar fundo e recuperar sua concentração:
                </p>

                {/* Barra de Respiração Estilizada */}
                <div className="relative w-full bg-black/60 h-3 rounded-full overflow-hidden mb-4 border border-white/15 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      challengeCompleted
                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                        : universeKey === 'stranger_things'
                        ? 'bg-gradient-to-r from-red-700 via-red-500 to-amber-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                        : universeKey === 'greys_anatomy'
                        ? 'bg-gradient-to-r from-blue-700 via-blue-400 to-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)]'
                        : 'bg-gradient-to-r from-purple-700 via-purple-500 to-pink-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                    }`}
                    style={{ width: `${breathProgress}%` }}
                  />
                </div>

                {/* Botão de Respiração */}
                {!challengeCompleted ? (
                  <button
                    type="button"
                    onClick={handleStartBreathingExercise}
                    disabled={isBreathing}
                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white shadow-lg active:scale-95 transition-all cursor-pointer border flex items-center justify-center gap-3 ${
                      isBreathing
                        ? universeKey === 'stranger_things'
                          ? 'bg-red-900 border-red-500 animate-pulse text-white'
                          : universeKey === 'greys_anatomy'
                          ? 'bg-blue-900 border-blue-400 animate-pulse text-white'
                          : 'bg-purple-900 border-purple-400 animate-pulse text-white'
                        : universeKey === 'stranger_things'
                        ? 'bg-gradient-to-b from-[#2A1618] to-[#170D0E] border-red-600/70 hover:border-red-400'
                        : universeKey === 'greys_anatomy'
                        ? 'bg-gradient-to-b from-[#142A46] to-[#0A1728] border-blue-500/70 hover:border-blue-400'
                        : 'bg-gradient-to-b from-[#251838] to-[#120B1C] border-purple-500/70 hover:border-purple-400'
                    }`}
                  >
                    <span>🫁</span>
                    <span>{isBreathing ? `RESPIRANDO... (${breathProgress}%)` : 'Clique para Iniciar Respiração Guiada (4s)'}</span>
                    <span className="text-xs opacity-60">〰️</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-extrabold animate-in fade-in">
                    <span>✓</span>
                    <span>Respiração concluída! Mente calibrada com sucesso.</span>
                  </div>
                )}
              </div>

              {/* Opção para Desativar Alertas Rápidos */}
              <div className="flex items-center justify-center gap-2.5 mb-5 select-none">
                <input
                  type="checkbox"
                  id="disableSpeedAlertsCheck"
                  checked={speedAlertsDisabled}
                  onChange={(e) => setSpeedAlertsDisabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="disableSpeedAlertsCheck" className="text-xs text-slate-300 hover:text-white cursor-pointer">
                  Não mostrar mais alertas de velocidade durante este teste
                </label>
              </div>

              {/* Botão de Continuar Destravado após o Desafio */}
              <button
                type="button"
                disabled={!challengeCompleted}
                onClick={handleDismissWarningAndContinue}
                className={`w-full py-4 px-8 rounded-full font-black text-[15px] tracking-wide transition-all ${
                  challengeCompleted
                    ? universeKey === 'stranger_things'
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-white shadow-lg shadow-red-600/50 cursor-pointer hover:scale-[1.02]'
                      : universeKey === 'greys_anatomy'
                      ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-600/50 cursor-pointer hover:scale-[1.02]'
                      : 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-600/50 cursor-pointer hover:scale-[1.02]'
                    : 'opacity-40 bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {challengeCompleted ? 'Continuar com Atenção →' : '🔒 Complete o desafio de respiração para avançar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
         MODAL 2: MARCO TEMÁTICO CINEMATOGRÁFICO (A CADA 5 PERGUNTAS)
         ======================================================== */}
      {activeMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-[580px] p-7 sm:p-9 rounded-[32px] border shadow-[0_25px_70px_rgba(0,0,0,0.6)] text-center relative overflow-hidden transition-all ${
            universeKey === 'stranger_things'
              ? 'bg-[#0E0F17] border-red-800/60 text-white'
              : universeKey === 'greys_anatomy'
              ? 'bg-[#0B1A2E] border-blue-600/50 text-white'
              : 'bg-[#151222] border-purple-800/60 text-white'
          }`}>
            {/* Top Glow Accent */}
            <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
              universeKey === 'stranger_things'
                ? 'bg-red-500'
                : universeKey === 'greys_anatomy'
                ? 'bg-blue-400'
                : 'bg-purple-500'
            }`} />

            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-black uppercase tracking-wider mb-4">
              <span>{activeMilestone.badge}</span>
            </div>

            {/* Milestone Icon with Dramatic Glow */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-4xl sm:text-5xl mb-5 shadow-lg animate-pulse">
              {activeMilestone.icon}
            </div>

            {/* Title */}
            <h2 className="text-[24px] sm:text-[28px] font-black leading-tight tracking-tight mb-2">
              {activeMilestone.title}
            </h2>

            {/* Subtitle */}
            <p className="text-[14.5px] sm:text-[15.5px] font-bold text-amber-300 dark:text-amber-300 mb-4">
              {activeMilestone.subtitle}
            </p>

            {/* Narrative Story Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 text-left mb-6">
              <p className="text-[14px] sm:text-[15px] leading-relaxed text-slate-200 font-medium">
                {activeMilestone.narrative}
              </p>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinueFromMilestone}
              className={`w-full py-4 px-8 rounded-full font-black text-[16px] tracking-wide shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                universeKey === 'stranger_things'
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-red-600/40'
                  : universeKey === 'greys_anatomy'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow-blue-600/40'
                  : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-purple-600/40'
              }`}
            >
              Continuar a Jornada →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
