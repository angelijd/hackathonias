// Motor Psicométrico e IA de Identificação de Personagens
import strangerData from './data_stranger.json';
import wandinhaData from './data_wandinha.json';
import greysData from './data_greys.json';

export interface SocioEmotionalScores {
  aberturaAoNovo: number;       // 1 a 5
  autodisciplina: number;       // 1 a 5
  amabilidade: number;          // 1 a 5
  extroversao: number;          // 1 a 5
  resilienciaEmocional: number; // 1 a 5
}

export interface CharacterData {
  id: string;
  name: string;
  serie: 'stranger_things' | 'wandinha' | 'greys_anatomy';
  serieDisplayName: string;
  tagline: string;
  role: string;
  avatarIcon: string;
  color: string;
  gradient: string;
  quote: string;
  description: string;
  strengths: string[];
  superpowers: string[];
  growthInsight: string;
  targetProfile: SocioEmotionalScores;
}

export const STRANGER_THINGS_CHARACTERS = strangerData as CharacterData[];
export const WANDINHA_CHARACTERS = wandinhaData as CharacterData[];
export const GREYS_ANATOMY_CHARACTERS = greysData as CharacterData[];

// Motor de Cálculo Psicométrico
export function calculateStudentSocioEmotional(answers: Record<number, number>): SocioEmotionalScores {
  const a = (idx: number) => answers[idx] || 3;
  const aberturaAoNovo = (a(0) + a(1) + a(2) + a(3)) / 4;
  const autodisciplina = (a(4) + a(5) + a(6) + a(7) + a(11)) / 5;
  const amabilidade = (a(10) + a(13)) / 2;
  const extroversao = (a(8) + a(12) + (6 - a(14))) / 3;
  const resilienciaEmocional = (a(7) + (6 - a(9))) / 2;

  return {
    aberturaAoNovo: Number(aberturaAoNovo.toFixed(2)),
    autodisciplina: Number(autodisciplina.toFixed(2)),
    amabilidade: Number(amabilidade.toFixed(2)),
    extroversao: Number(extroversao.toFixed(2)),
    resilienciaEmocional: Number(resilienciaEmocional.toFixed(2)),
  };
}

// Algoritmo de Similaridade / IA Match
export function matchCharacter(
  universeKey: string,
  studentScores: SocioEmotionalScores
): {
  character: CharacterData;
  matchPercentage: number;
  allRanked: { character: CharacterData; matchPercentage: number }[];
} {
  let list: CharacterData[] = STRANGER_THINGS_CHARACTERS;
  if (universeKey === 'wandinha') list = WANDINHA_CHARACTERS;
  if (universeKey === 'greys_anatomy') list = GREYS_ANATOMY_CHARACTERS;

  const ranked = list.map((char) => {
    const t = char.targetProfile;
    const diffO = Math.pow(studentScores.aberturaAoNovo - t.aberturaAoNovo, 2);
    const diffC = Math.pow(studentScores.autodisciplina - t.autodisciplina, 2);
    const diffA = Math.pow(studentScores.amabilidade - t.amabilidade, 2);
    const diffE = Math.pow(studentScores.extroversao - t.extroversao, 2);
    const diffR = Math.pow(studentScores.resilienciaEmocional - t.resilienciaEmocional, 2);

    const distance = Math.sqrt(diffO + diffC + diffA + diffE + diffR);
    // Distância normalizada em porcentagem de afinidade de 74% a 99%
    const normalizedMatch = Math.max(74, Math.min(99, Math.round(100 - (distance / 6.0) * 45)));

    return {
      character: char,
      matchPercentage: normalizedMatch,
      distance,
    };
  });

  ranked.sort((a, b) => a.distance - b.distance);

  return {
    character: ranked[0].character,
    matchPercentage: ranked[0].matchPercentage,
    allRanked: ranked.map((r) => ({ character: r.character, matchPercentage: r.matchPercentage })),
  };
}
