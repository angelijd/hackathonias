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

// Função de Ancoragem Não-Paramétrica
function getAnchoredScore(vLow: number, vHigh: number, self: number): number {
  if (vLow >= vHigh) return self; // Violação da ancoragem (fallback para autoavaliação)
  if (self < vLow) return 1;
  if (self === vLow) return 2;
  if (self > vLow && self < vHigh) return 3;
  if (self === vHigh) return 4;
  if (self > vHigh) return 5;
  return self;
}

// Motor de Cálculo Psicométrico
export function calculateStudentSocioEmotional(answers: Record<number, number>): SocioEmotionalScores {
  const a = (idx: number) => answers[idx] || 3;
  
  // Autogestão (Autodisciplina)
  // Afirmações: 0, 1, 2, 3 (invertida), 4
  // Vinhetas: 5 (Baixa), 6 (Alta), 7 (Autoavaliação)
  const anchoredAutogestao = getAnchoredScore(a(5), a(6), a(7));
  const autodisciplina = (a(0) + a(1) + a(2) + (6 - a(3)) + a(4) + anchoredAutogestao) / 6;
  
  // Abertura ao Novo
  // Afirmações: 8, 9, 10 (invertida), 11, 12
  // Vinhetas: 13 (Baixa), 14 (Alta), 15 (Autoavaliação)
  const anchoredAbertura = getAnchoredScore(a(13), a(14), a(15));
  const aberturaAoNovo = (a(8) + a(9) + (6 - a(10)) + a(11) + a(12) + anchoredAbertura) / 6;

  // Demais competências desativadas para o foco deste teste, fixadas no valor neutro 3.
  const amabilidade = 3;
  const extroversao = 3;
  const resilienciaEmocional = 3;

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
    
    // Ignorando as competências desativadas no cálculo de distância
    const distance = Math.sqrt(diffO + diffC);
    // Distância normalizada em porcentagem de afinidade de 74% a 99% (ajustado divisor para 2 dimensões max diff ~2.8)
    const normalizedMatch = Math.max(74, Math.min(99, Math.round(100 - (distance / 2.8) * 45)));

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
