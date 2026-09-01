import React, { useEffect, useMemo, useState } from 'react';
import doodleMentes from '../assets/doodles/doodle-mentes.png';
import doodleSonho from '../assets/doodles/doodle-sonho.png';
import doodleBandeira from '../assets/doodles/doodle-bandeira.png';

interface Stage {
  message: string;
  doodle?: string;
}

interface Props {
  testTypeLabel: string;
  interestLabel?: string;
}

export const AiWaitingCard: React.FC<Props> = ({ testTypeLabel, interestLabel }) => {
  const stages: Stage[] = useMemo(() => {
    const interestPhrase = interestLabel ? `com base em ${interestLabel}` : 'com base no que você gosta';
    return [
      { message: `Escolhendo os melhores desafios de ${testTypeLabel} para o seu jeito de pensar...`, doodle: doodleMentes },
      { message: `Personalizando cada cena ${interestPhrase}...` },
      { message: 'Ajustando o ritmo no seu tempo — aqui não existe resposta certa ou errada...', doodle: doodleSonho },
      { message: 'Deixando tudo prontinho...' },
      { message: 'Últimos ajustes, quase na largada!', doodle: doodleBandeira },
    ];
  }, [testTypeLabel, interestLabel]);

  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % stages.length);
    }, 2600);
    return () => clearInterval(id);
  }, [stages.length]);

  const stage = stages[stageIdx];

  return (
    <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-center gap-5">
      <div className="w-12 h-12 border-4 border-[#FDC300] border-t-transparent rounded-full animate-spin" />

      <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
        {stage.doodle && (
          <img
            key={stageIdx}
            src={stage.doodle}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-contain animate-in fade-in duration-500 select-none pointer-events-none"
          />
        )}
      </div>

      <p
        key={`msg-${stageIdx}`}
        className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-[360px] animate-in fade-in duration-500"
      >
        {stage.message}
      </p>
    </div>
  );
};
