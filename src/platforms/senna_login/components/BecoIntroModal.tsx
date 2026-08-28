import React, { useState, useRef, useEffect } from 'react';
import becoAvatar from '../beco-bot.png';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  darkMode?: boolean;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const SUBTITLES: SubtitleCue[] = [
  { start: 0.0, end: 1.9, text: "Eita! Que susto você me deu!" },
  { start: 2.0, end: 3.0, text: "Não te vi aí!" },
  { start: 3.1, end: 5.5, text: "Eu sou o Béco e vou te acompanhar nessa jornada" },
  { start: 5.6, end: 8.5, text: "Sempre que precisar de mim, é só clicar ali no cantinho pra falar comigo" },
  { start: 8.6, end: 10.5, text: "Até logo!" }
];

export const BecoIntroModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCC, setShowCC] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setNeedsUserInteraction(false);
          })
          .catch((err) => {
            console.log('Autoplay blocked, waiting for user click:', err);
            setNeedsUserInteraction(true);
          });
      }
    }
  }, [isOpen]);

  const handleStartPlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserInteraction(false);
        })
        .catch((e) => console.error('Play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setCurrentTime(current);
      setProgress((current / duration) * 100);
    }
  };

  const currentSubtitle = SUBTITLES.find(
    sub => currentTime >= sub.start && currentTime <= sub.end
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Smartphone Chassis Frame */}
      <div className="relative w-full max-w-[340px] sm:max-w-[375px] h-[640px] max-h-[92vh] rounded-[44px] sm:rounded-[48px] border-[8px] sm:border-[10px] border-[#1C1C1E] bg-black shadow-[0_25px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/15 overflow-hidden flex flex-col justify-between select-none">
        
        {/* Dynamic Island / Top Speaker Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-40 flex items-center justify-end px-2 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] border border-white/10" />
        </div>

        {/* Instagram Stories Top Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-4 px-3.5 pb-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-2.5">
          {/* Story Progress Bar */}
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Avatar with Story Gradient Ring */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FDC300] via-[#F59E0B] to-[#EC4899] p-0.5 shadow-sm">
                <img 
                  src={becoAvatar} 
                  alt="Béco" 
                  className="w-full h-full object-cover rounded-full bg-[#FDC300]" 
                />
              </div>

              {/* Username + Badge */}
              <div className="flex items-center gap-1">
                <span className="text-white text-xs sm:text-sm font-extrabold tracking-tight drop-shadow">
                  beco.senna
                </span>
                <span className="text-[#3897F0] text-xs">✓</span>
                <span className="text-white/60 text-[11px] font-semibold ml-1">Agora</span>
              </div>
            </div>

            {/* Top Right Controls (CC + Sound + Close) */}
            <div className="flex items-center gap-2">
              {/* CC Subtitles Toggle Button */}
              <button
                type="button"
                onClick={() => setShowCC(!showCC)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black tracking-tighter transition-all backdrop-blur-xs cursor-pointer ${
                  showCC 
                    ? 'bg-[#FDC300] text-[#04142B] ring-2 ring-[#FBB800]' 
                    : 'bg-black/40 hover:bg-black/60 text-white/70'
                }`}
                title={showCC ? "Desativar legendas (CC)" : "Ativar legendas (CC)"}
              >
                CC
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-xs font-black transition-colors backdrop-blur-xs cursor-pointer"
                title="Pular vídeo"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Video Screen Content */}
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
          {!videoError ? (
            <>
              <video
                ref={videoRef}
                playsInline
                onEnded={onClose}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => {
                  setIsPlaying(true);
                  setNeedsUserInteraction(false);
                }}
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover"
              >
                <source src="/beco-intro.mp4" type="video/mp4" />
                <source src="/beco-intro.mp4.mp4" type="video/mp4" />
              </video>

              {/* Subtitles Overlay */}
              {showCC && currentSubtitle && (
                <div className="absolute bottom-20 left-4 right-4 z-30 flex justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-black/85 backdrop-blur-sm border border-white/15 px-4 py-2.5 rounded-2xl shadow-2xl max-w-[90%] text-center">
                    <p className="text-white font-extrabold text-xs sm:text-sm leading-snug tracking-tight drop-shadow-md">
                      {currentSubtitle.text}
                    </p>
                  </div>
                </div>
              )}

              {/* Click to Play Overlay */}
              {needsUserInteraction && !isPlaying && (
                <div 
                  onClick={handleStartPlay}
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center cursor-pointer z-20 transition-all p-4 text-center"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FDC300] to-[#FBB800] text-[#04142B] flex items-center justify-center shadow-[0_8px_25px_rgba(251,184,0,0.6)] transform hover:scale-110 active:scale-95 transition-all mb-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10 ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="text-white font-black text-xs sm:text-sm bg-black/80 px-4 py-2 rounded-full border border-white/20 shadow-lg">
                    🔊 Clique para assistir o Story
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 bg-amber-400/20 p-1">
                <img src={becoAvatar} alt="Béco" className="w-full h-full object-cover rounded-full" />
              </div>
              <p className="text-xs text-amber-300 font-bold">
                Carregando vídeo do Béco...
              </p>
            </div>
          )}
        </div>

        {/* Instagram Stories Bottom Action CTA */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3">
          <div className="flex-1 px-4 py-2.5 rounded-full border border-white/30 bg-black/40 backdrop-blur-xs text-white/70 text-xs font-semibold truncate">
            🔥 Mensagem do Béco para você
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full bg-[#FDC300] hover:bg-[#FBB800] active:scale-95 text-[#04142B] text-xs font-black transition-all shadow-md flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Pular</span>
            <span>→</span>
          </button>
        </div>

      </div>
    </div>
  );
};
