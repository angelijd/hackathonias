import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  testTypeLabel: string;
  interestLabel?: string;
}

export const AiWaitingCard: React.FC<Props> = ({ testTypeLabel, interestLabel }) => {
  const messages: string[] = useMemo(() => {
    const interestPhrase = interestLabel ? `com base em ${interestLabel}` : 'com base no que você gosta';
    return [
      `Escolhendo os melhores desafios de ${testTypeLabel} para o seu jeito de pensar...`,
      `Personalizando cada cena ${interestPhrase}...`,
      'Ajustando o ritmo no seu tempo — aqui não existe resposta certa ou errada...',
      'Deixando tudo prontinho...',
      'Últimos ajustes, quase na largada!',
    ];
  }, [testTypeLabel, interestLabel]);

  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % messages.length);
    }, 4200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-center gap-5">
      <div className="w-12 h-12 border-4 border-[#FDC300] border-t-transparent rounded-full animate-spin" />

      <p
        key={stageIdx}
        className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-[360px] animate-in fade-in duration-500"
      >
        {messages[stageIdx]}
      </p>
    </div>
  );
};
