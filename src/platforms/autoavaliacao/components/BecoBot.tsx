import React, { useState, useEffect, useRef } from 'react';
import becoAvatar from '../beco-bot.png';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

interface Props {
  question: string;
  userName: string;
  interests: string[];
  isHighlighted?: boolean;
  onClearHighlight?: () => void;
}

export const BecoBot: React.FC<Props> = ({ 
  question, 
  userName, 
  interests,
  isHighlighted = false,
  onClearHighlight
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHighlighted) {
      setShowGuideTooltip(true);
      const t = setTimeout(() => {
        setShowGuideTooltip(false);
        if (onClearHighlight) onClearHighlight();
      }, 9000);
      return () => clearTimeout(t);
    }
  }, [isHighlighted]);

  useEffect(() => {
    // Reset Beco's state when question changes
    setMessages([]);
    setChips([]);
    setIsOpen(false);
    
    // Set 1 min timer to automatically pop up if user hasn't interacted
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [question]);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isMuted && messages.length === 0) {
        setIsOpen(true);
        triggerBotMessage(`E aí${userName ? ' ' + userName : ''}! Vi que cê tá pensativo aí. Quer uma ajuda pra desembolar essa questão?`);
      }
    }, 60000); // 1 minute
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const triggerBotMessage = (text: string, newChips: string[] = ["Quero uma pista", "Me explica de outro jeito?"]) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: text }]);
    setChips(newChips);
  };

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    setShowGuideTooltip(false);
    if (onClearHighlight) onClearHighlight();
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    resetTimer();

    const newMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);
    setChips([]); // Hide chips while thinking

    try {
      // Build history
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetch('/api/beco-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userMessage: text.trim(),
          history,
          userName,
          interests
        })
      });

      if (!res.ok) throw new Error('Falha na comunicação');
      
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: data.response }]);
      setChips(data.chips || []);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: 'Ops, deu ruim na conexão aqui. Manda de novo?' }]);
      setChips(["Tentar novamente"]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div 
        className={`pointer-events-auto transition-all duration-300 origin-bottom-right mb-4 flex flex-col w-[340px] sm:w-[380px] bg-white dark:bg-[#0B1426] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ height: '520px', maxHeight: 'calc(100vh - 140px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FDC300] to-[#FBB800] p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/25 border-2 border-white/60 overflow-hidden flex items-center justify-center p-0.5 shadow-sm">
              <img src={becoAvatar} alt="Béco Bot" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h3 className="font-black text-[#04142B] leading-none text-[16px]">Béco</h3>
              <span className="text-[11px] font-extrabold text-[#04142B]/80 uppercase tracking-wider">Seu parceiro no teste</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-[#04142B] transition-colors cursor-pointer"
              title={isMuted ? "Ativar notificações" : "Silenciar Béco"}
            >
              {isMuted ? '🔕' : '🔔'}
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-[#04142B] font-black transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-70 p-4">
              <span className="text-4xl mb-3 animate-bounce">👋</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                E aí, {userName || 'parceiro'}!
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-[220px]">
                Se travar em qualquer questão ou quiser uma pista, só mandar mensagem aqui!
              </p>
            </div>
          )}
          
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] p-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#0B7CFB] text-white rounded-tr-sm font-medium' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm font-normal'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          {/* Suggested Chips */}
          {!isTyping && chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-300">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-3.5 py-2 rounded-full text-[12px] font-bold bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 text-[#0B7CFB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm text-left cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-[#0B1426] border-t border-slate-100 dark:border-slate-800">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex items-center gap-2 relative"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua dúvida pro Béco..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-full py-3 px-4 focus:outline-none focus:border-[#0B7CFB] transition-colors"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="w-11 h-11 rounded-full bg-[#0B7CFB] hover:bg-[#0966D2] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-md cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 ml-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Floating Guide Speech Bubble (after video intro or highlight) */}
      {showGuideTooltip && !isOpen && (
        <div className="pointer-events-auto mb-3 max-w-[260px] p-3.5 rounded-2xl bg-[#04142B] text-white text-xs font-extrabold shadow-2xl border-2 border-[#FBB800] animate-bounce relative">
          <div className="flex items-start justify-between gap-2">
            <p className="leading-snug">
              👉 <span className="text-[#FBB800]">Estou aqui!</span> Se precisar de ajuda ou pista em qualquer questão, clica em mim!
            </p>
            <button 
              onClick={() => setShowGuideTooltip(false)}
              className="text-white/60 hover:text-white text-sm leading-none font-bold"
            >
              ✕
            </button>
          </div>
          {/* Arrow pointing down-right */}
          <div className="absolute -bottom-2 right-8 w-3 h-3 bg-[#04142B] border-r-2 border-b-2 border-[#FBB800] rotate-45" />
        </div>
      )}

      {/* Floating Avatar Trigger with Enhanced Size & Highlight Pulse */}
      <div className="pointer-events-auto relative group">
        {/* Pulsing Radar Ring when Highlighted */}
        {isHighlighted && !isOpen && (
          <span className="absolute -inset-3 rounded-full bg-[#FBB800] opacity-40 animate-ping pointer-events-none" />
        )}
        {isHighlighted && !isOpen && (
          <span className="absolute -inset-1.5 rounded-full bg-[#FDC300] opacity-60 animate-pulse pointer-events-none" />
        )}

        {/* Unread dot */}
        {!isOpen && messages.length > 0 && !isMuted && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-[#0B1426] z-20 animate-pulse flex items-center justify-center text-[10px] font-black text-white">
            1
          </span>
        )}
        
        {/* Main Béco Button: Enlarged Size & Golden Border */}
        <button
          onClick={handleToggleOpen}
          aria-label="Abrir assistente Béco"
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-[0_16px_36px_rgba(251,184,0,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 border-[4px] z-10 cursor-pointer relative bg-[#FDC300] ${
            isOpen 
              ? 'border-white dark:border-white ring-4 ring-[#FBB800]' 
              : isHighlighted 
              ? 'border-[#04142B] ring-4 ring-[#FBB800] animate-bounce' 
              : 'border-[#FBB800] hover:ring-4 hover:ring-[#FBB800]/50'
          }`}
        >
          <img 
            src={becoAvatar} 
            alt="Béco" 
            className="w-full h-full object-cover select-none"
          />
        </button>
      </div>
    </div>
  );
};
